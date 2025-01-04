import express from "express";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import cors from "cors";
import session from "express-session";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import winston from "winston";
import Transport from 'winston-transport';

// === Winston Logger Configuration ===
console.log('\n=== ⚙️ Configuring Logger ===');

// Create custom MongoDB transport
class MongoDBTransport extends Transport {
  constructor(opts) {
    super(opts);
  }
  
  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });
    
    console.log('📝 Saving log to MongoDB...');
    const log = new LogModel({ 
      level: info.level, 
      message: info.message 
    });
    log.save().catch(err => console.error('❌ Error saving log:', err));
    
    callback();
  }
}

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => 
      `${timestamp} [${level}]: ${message}`)
  ),
  transports: [
    new MongoDBTransport(),
    new winston.transports.Console()
  ]
});

dotenv.config();



const requestLogger = (req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  
  console.log('\n🔔 ====== New Request ======');
  console.log(`📅 Time: ${timestamp}`);
  console.log(`📌 ${req.method} ${req.originalUrl}`);
  console.log(`👤 User: ${req.session?.user?.username || 'Anonymous'}`);
  
  if (Object.keys(req.body).length) {
    console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
  }

  // Capture response
  const oldSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    console.log(`✨ Status: ${res.statusCode}`);
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log('====== End Request ======\n');
    return oldSend.apply(res, arguments);
  }
  
  next();
};

console.log('\n=== 🚀 CopyBoard Server Initializing ===');

const app = express();
console.log('✨ Express app instance created');

// Middleware Setup
console.log('\n=== 🔧 Configuring Middleware ===');
app.use(mongoSanitize());
console.log('✅ MongoDB Sanitize middleware enabled');
app.use(express.json());
console.log('✅ JSON parsing middleware enabled');
app.use(cookieParser());
console.log('✅ Cookie parser middleware enabled');
if (process.env.PROD !== "false")
{
console.log = (...args) => logger.info(args.join(' '));
console.error = (...args) => logger.error(args.join(' '));
}

if (process.env.PROD !== "false") {
  console.log('\n=== 🌍 Production Environment Detected ===');
  
} else {
  console.log('\n=== 🛠️  Development Environment Detected ===');
  app.use(
    cors({
      origin: "http://localhost:5173",
      credentials: true,
    })
  );
  console.log('✅ CORS configured for development');
}

let retryCount = 0;
const connectWithRetry = async () => {
  retryCount++;
  console.log(`\n=== 🔄 Database Connection Attempt ${retryCount} ===`);
  const uri = process.env.PROD !== "false" 
    ? process.env.MONGODB_URI 
    : process.env.MONGODB_URI_DEV;
  console.log('🌍 Environment:', process.env.PROD !== "false" ? 'Production' : 'Development');
    
  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${uri}`);
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    console.log('⏳ Retrying in 5s...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    return connectWithRetry();
  }
};

console.log('\n=== 📊 Initializing Database Connection ===');
connectWithRetry().catch(console.error);

console.log('\n=== 📝 Setting up Schemas ===');
const Schema = mongoose.Schema;
const valuesSchema = new Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
  code: {type:Boolean, required: true, default: false}
});
console.log('✅ Values Schema created');
const collectionsSchema = new Schema({
  colname: { type: String, required: true, unique: true },
  share: { type: Boolean, required: true, default: false },
  coldata: [valuesSchema],
});
console.log('✅ Collections Schema created');
const DataSchema = new Schema({
  username: { type: String, required: true, unique: true, ref: "User" },
  coll: [collectionsSchema],
});
console.log('✅ Data Schema created');
const PublicCollectionsSchema = new Schema({
  username: { type: String, required: true, unique: true },
  colname: { type: String, required: true, unique: true },
  id: { type: String, required: true, unique: true}
});
const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const logSchema = new mongoose.Schema({
  level: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const LogModel = mongoose.model('Log', logSchema);
const User = mongoose.model("User", UserSchema);
const Data = mongoose.model("Data", DataSchema);
const PCS = mongoose.model("PCS",PublicCollectionsSchema);

const DataRouter = express.Router();
const UserRouter = express.Router();
const PageRouter = express.Router();

// === Auth Middleware ===
function isAuthenticated(req, res, next) {
  console.log('\n=== 🔐 Checking Authentication ===');
  console.log('📍 Route:', req.originalUrl);
  console.log('👤 Session user:', req.session?.username);
  console.log('🔑 Session ID:', req.session?.userId);
  
  if (req.session.userId) {
    console.log('✅ Authentication successful');
    return next();
  }
  console.log('❌ Authentication failed');
  return res.status(401).json({ message: "Unauthorized access" });
}

// === User Routes Logging ===
UserRouter.post("/register", async (req, res) => {
  console.log('\n=== 👤 Register Request ===');
  console.log('📝 Input:', { username: req.body.username, password: req.body.password });
  try {
    console.log('\n=== 👥 New User Registration ===');
    const { username, password } = req.body;
    console.log('📝 Validating registration data...');
    
    if (!username || !password) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ message: "Username and password required" });
    }

    console.log('🔍 Checking existing user...');
    const userExists = await User.findOne({ username });
    if (userExists) {
      console.log('❌ Username already exists');
      return res.status(400).json({ message: "User exists" });
    }

    console.log('🔐 Hashing password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    console.log('💾 Creating user records...');
    const newUser = new User({ username, password: hashedPassword });
    const newData = new Data({ username, coll: [] });
    
    await Promise.all([newUser.save(), newData.save()]);
    console.log('✅ User registered successfully');
    console.log('✅ User registered:', username);
    console.log('📦 New user data created');
    
    res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    console.error('❌ Registration error:', error);
    console.error('❌ Registration failed:', error);
    res.status(500).json({ message: "Server error" });
  }
});

UserRouter.post("/login", async (req, res) => {
  console.log('\n=== 🔐 Login Request ===');
  console.log('📝 Credentials:', { username: req.body.username, password: req.body.password });
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "Invalid username or password" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid username or password" });
    }
    req.session.userId = user._id;
    req.session.username = user.username;
    res.json({ message: "Login successful" });
    console.log('✅ Login successful:', username);
    console.log('🔑 Session created:', req.session.userId);
  } catch (error) {
    console.error('❌ Login failed:', error);
    res.status(500).json({ message: "Server error" });
  }
});
UserRouter.post("/logout", (req, res) => {
  console.log('\n=== 👋 User Logout ===');
  console.log('👤 User:', req.session?.username);
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Logout failed:', err);
      return res.status(500).json({ message: "Logout failed" });
    }
    console.log('✅ Logout successful');
    res.clearCookie("connect.sid");
    return res.status(200).json({ message: "Logged out successfully" });
  });
});

// === Collection Operations Logging ===
DataRouter.post("/collection", isAuthenticated, async (req, res) => {
  console.log('\n=== 📁 Create Collection ===');
  console.log('👤 User:', req.session.username);
  console.log('📝 Collection name:', req.body.colname);
  try {
    const userId = req.session.userId;
    const username = req.session.username;
    if (!userId || !username) {
      return res.status(401).json({ message: "Unauthorized access" });
    }
    const { colname } = req.body;
    if (!colname) {
      return res.status(400).json({ message: "Insufficient data" });
    }
    const data = await Data.findOne({ username });
    if (!data) {
      return res.status(404).json({ message: "Data not found" });
    }
    const existingCollection = data.coll.find((col) => col.colname === colname);
    if (existingCollection) {
      return res.status(400).json({ message: "Collection already exists" });
    }
    data.coll.push({ colname, coldata: [] });
    await data.save();
    res.status(201).json(data);
    console.log('✅ Collection created successfully');
    console.log('📦 Updated data:', data);
  } catch (error) {
    console.error('❌ Collection creation failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add logs to PUT collection rename route
DataRouter.put("/collection/:colname", isAuthenticated, async (req, res) => {
  console.log('\n=== 🔄 Rename Collection ===');
  console.log('👤 User:', req.session.username);
  console.log('📁 Old name:', req.params.colname);
  console.log('📝 New name:', req.body.newColname);
  try {
    const userId = req.session.userId;
    const username = req.session.username;
    if (!userId || !username) {
      console.log('❌ Authentication failed');
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { newColname } = req.body;
    if (!newColname) {
      console.log('❌ Missing new collection name');
      return res.status(400).json({ message: "Insufficient data" });
    }
    const data = await Data.findOne({ username });
    if (!data) {
      console.log('❌ User data not found');
      return res.status(404).json({ message: "Data not found" });
    }
    const coll = data.coll.find((col) => col.colname === req.params.colname);
    if (!coll) {
      console.log('❌ Collection not found');
      return res.status(404).json({ message: "Collection not found" });
    }
    coll.colname = newColname;
    await data.save();
    console.log('✅ Collection renamed successfully');
    console.log('📦 Updated data:', data);
    res.status(200).json(data);
  } catch (error) {
    console.error('❌ Rename operation failed:', error);
    res.status(500).json({ error: error.message });
  }
});

DataRouter.delete("/collection/:colname", isAuthenticated, async (req, res) => {
  console.log('\n=== 🗑️ Delete Collection ===');
  console.log('👤 User:', req.session.username);
  console.log('📁 Collection:', req.params.colname);
  try {
    const data = await Data.findOne({ username: req.session.username });
    const collIndex = data.coll.findIndex((col) => col.colname === req.params.colname);
    data.coll.splice(collIndex, 1);
    await data.save();
    console.log('✅ Collection deleted successfully');
    res.json({ message: "Collection deleted" });
  } catch (error) {
    console.error('❌ Delete collection failed:', error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add logs to POST key-value route
DataRouter.post("/collection/:colname/key", isAuthenticated, async (req, res) => {
  console.log('\n=== ➕ Add New Key-Value ===');
  console.log('👤 User:', req.session.username);
  console.log('📁 Collection:', req.params.colname);
  console.log('🔑 Key:', req.body.key);
  console.log('📝 Value:', req.body.value);
  try {
    const userId = req.session.userId;
    const username = req.session.username;
    if (!userId || !username) {
      console.log('❌ Authentication failed');
      return res.status(401).json({ message: "Unauthorized access" });
    }
    const { key, value } = req.body;
    if (!key || !value) {
      console.log('❌ Missing key or value');
      return res.status(400).json({ message: "Insufficient data" });
    }
    const data = await Data.findOne({ username });
    if (!data) {
      console.log('❌ User data not found');
      return res.status(404).json({ message: "Data not found" });
    }
    const coll = data.coll.find((col) => col.colname === req.params.colname);
    if (!coll) {
      console.log('❌ Collection not found');
      return res.status(404).json({ message: "Collection not found" });
    }
    coll.coldata.push({ key, value });
    await data.save();
    console.log('✅ Key-value added successfully');
    console.log('📦 Updated data:', data);
    res.status(201).json(data);
  } catch (error) {
    console.error('❌ Add key-value failed:', error);
    res.status(500).json({ error: error.message });
  }
});

DataRouter.post("/collection/:colname/share", isAuthenticated, async (req, res) => {
  console.log('\n=== 🌍 Share Collection ===');
  console.log('👤 User:', req.session.username);
  console.log('📁 Collection:', req.params.colname);
  console.log('📝 Share status:', req.body.share);
  try {
    const userId = req.session.userId;
    const username = req.session.username;

    if (!userId || !username) {
      return res.status(401).json({ message: "Unauthorized access" });
    }

    const { share } = req.body;
    if (typeof share !== 'boolean') {
      return res.status(400).json({ message: "Insufficient data, 'share' must be a boolean" });
    }

    const data = await Data.findOne({ username });
    if (!data) {
      return res.status(404).json({ message: "Data not found" });
    }

    const coll = data.coll.find((col) => col.colname === req.params.colname);
    if (!coll) {
      return res.status(404).json({ message: "Collection not found" });
    }

    if (share) {
      console.log('📤 Creating public share...');
      const newId = coll._id.toString();
      console.log('🔑 Generated share ID:', newId);
      const publicCollection = new PCS({
        username,
        colname: req.params.colname,
        id: newId,
      });
      await publicCollection.save();
      coll.share = true;
      await data.save();
      console.log('✅ Collection shared successfully');
      console.log('📦 Share details:', { username, colname: req.params.colname, id: newId });
      return res.status(200).json({
        message: "Collection shared successfully",
        id: newId,
        data,
      });
    } else {
      console.log('🔒 Removing public share...');
      await PCS.deleteOne({ username, colname: req.params.colname });
      coll.share = false;
      await data.save();
      console.log('✅ Collection unshared successfully');
      return res.status(200).json({
        message: "Collection unshared successfully",
        data,
      });
    }
    console.log('✅ Share status updated');
    console.log('🔗 Collection ID:', newId);
  } catch (error) {
    console.error('❌ Share operation failed:', error);
    res.status(500).json({ error: error.message });
  }
});


DataRouter.put(
  "/collection/:colname/key/:key",
  isAuthenticated,
  async (req, res) => {
    console.log('\n=== 🔄 Update Key-Value ===');
    console.log('👤 User:', req.session.username);
    console.log('📁 Collection:', req.params.colname);
    console.log('🔑 Key:', req.params.key);
    console.log('📝 New value:', req.body.newValue);
    try {
      const { newValue } = req.body;
      const userId = req.session.userId;
      const username = req.session.username;
      if (!userId || !username) {
        return res.status(401).json({ message: "Unauthorized access" });
      }
      const data = await Data.findOne({ username });
      if (!data) {
        return res.status(404).json({ message: "Data not found" });
      }
      const coll = data.coll.find((col) => col.colname === req.params.colname);
      if (!coll) {
        return res.status(404).json({ message: "Collection not found" });
      }
      const keyValue = coll.coldata.find((kv) => kv.key === req.params.key);
      if (!keyValue) {
        return res.status(404).json({ message: "Key not found" });
      }
      keyValue.value = newValue;
      await data.save();
      res.status(200).json(data);
      console.log('✅ Key-value updated');
      console.log('📦 Updated data:', data);
    } catch (error) {
      console.error('❌ Update failed:', error);
      res.status(500).json({ error: error.message });
    }
  }
);
DataRouter.delete(
  "/collection/:colname/key/:key",
  isAuthenticated,
  async (req, res) => {
    console.log('\n=== 🗑️ Delete Key-Value ===');
    console.log('👤 User:', req.session.username);
    console.log('📁 Collection:', req.params.colname);
    console.log('🔑 Key:', req.params.key);
    try {
      const data = await Data.findOne({ username: req.session.username });
      const coll = data.coll.find((col) => col.colname === req.params.colname);
      const keyIndex = coll.coldata.findIndex((item) => item.key === req.params.key);
      coll.coldata.splice(keyIndex, 1);
      await data.save();
      console.log('✅ Key-value deleted successfully');
      res.json(data);
    } catch (error) {
      console.error('❌ Delete key-value failed:', error);
      res.status(500).json({ message: "Server error" });
    }
  }
);
PageRouter.get("/publicshared/:id", async (req, res) => {
  console.log('\n=== 🔍 Access Shared Collection ===');
  console.log('🔗 Collection ID:', req.params.id);
  try {
    // Find the public collection using the `id` from PublicCollectionsSchema
    const publicCollection = await PCS.findOne({ id: req.params.id });
    if (!publicCollection) {
      return res.status(404).json({ message: "Public collection not found" });
    }

    // Find the corresponding collection in the user's data
    const data = await Data.findOne({ username: publicCollection.username });
    if (!data) {
      return res.status(404).json({ message: "Data not found" });
    }

    // Find the collection in the user's data
    const coll = data.coll.find((col) => col.colname === publicCollection.colname);
    if (!coll) {
      return res.status(404).json({ message: "Collection not found in user's data" });
    }

    // Return the collection data
    res.status(200).json(coll);
    console.log('✅ Public collection accessed');
    console.log('👤 Owner:', publicCollection.username);
    console.log('📁 Collection:', publicCollection.colname);
    console.log('📦 Data:', coll);
  } catch (error) {
    console.error('❌ Public access failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET Collections Route
DataRouter.get("/collections", isAuthenticated, async (req, res) => {
  console.log('\n=== 📋 Get All Collections ===');
  console.log('👤 User:', req.session.username);
  try {
    const data = await Data.findOne({ username: req.session.username });
    console.log('✅ Found collections:', data.coll.length);
    console.log('📁 Collections:', data.coll.map(c => c.colname));
    res.json(data.coll);
  } catch (error) {
    console.error('❌ Get collections failed:', error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET Single Collection
DataRouter.get("/collection/:colname", isAuthenticated, async (req, res) => {
  console.log('\n=== 🔍 Get Collection Details ===');
  console.log('👤 User:', req.session.username);
  console.log('📁 Collection:', req.params.colname);
  try {
    const data = await Data.findOne({ username: req.session.username });
    const coll = data.coll.find((col) => col.colname === req.params.colname);
    console.log('✅ Collection found');
    console.log('📦 Keys count:', coll.coldata.length);
    res.json(coll);
  } catch (error) {
    console.error('❌ Get collection failed:', error);
    res.status(500).json({ message: "Server error" });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "dist")));
app.use(express.json());

// Add logs to DB status route
app.get("/api/dbstat/", (req, res, next) => {
  console.log('\n=== 🔍 Checking Database Status ===');
  const dbState = mongoose.connection.readyState;
  console.log('📊 Database state:', dbState === 1 ? 'Connected' : 'Disconnected');
  res.json({ status: dbState === 1 ? "Connected" : "Disconnected" });
});

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3 * 24 * 60 * 60 * 1000, httpOnly: false },
  })
);
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 90, // Limit each IP to 90 requests per window
  handler: (req, res) => {
    console.log('\n❌ Rate Limit Exceeded');
    console.log('👤 IP:', req.ip);
    console.log('📍 Route:', req.originalUrl);
    console.log('⏱️ Window:', '15 minutes');
    res.status(429).send('Too many requests');
  }
});
app.use(requestLogger);
app.use("/api/", limiter);
app.use("/api/user", UserRouter);
app.use("/api/data", DataRouter);
app.use("/api/page", PageRouter);

// Add logs to catch-all route
app.get("*", (req, res, next) => {
  console.log('\n=== 🌐 Serving Frontend ===');
  console.log('📍 Path:', req.path);
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`\n=== 🌟 Server Running ===`);
  console.log(`🔊 Listening on port ${PORT}`);
  console.log(`🌍 Mode: ${process.env.PROD !== "false" ? 'Production' : 'Development'}`);
  console.log('================================================\n');
});
