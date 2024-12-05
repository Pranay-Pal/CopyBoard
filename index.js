import express from "express";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import cors from "cors";
import session from "express-session";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
dotenv.config();
const app = express();
app.use(express.json());
app.use(cookieParser());
if (process.env.PROD != "false") {
  app.use(
    cors({
      origin: "http://localhost:5173",
      credentials: true,
    })
  );
}
if (process.env.PROD != "false") {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      console.log("Connected to MongoDB");
    })
    .catch((err) => console.log(err));
} else {
  mongoose
    .connect(process.env.MONGODB_URI_DEV)
    .then(() => {
      console.log("Connected to MongoDB");
    })
    .catch((err) => console.log(err));
}
const Schema = mongoose.Schema;
const valuesSchema = new Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
  code: {type:Boolean, required: true, default: false}
});
const collectionsSchema = new Schema({
  colname: { type: String, required: true, unique: true },
  share: { type: Boolean, required: true, default: false },
  coldata: [valuesSchema],
});
const DataSchema = new Schema({
  username: { type: String, required: true, unique: true, ref: "User" },
  coll: [collectionsSchema],
});
const PublicCollectionsSchema = new Schema({
  username: { type: String, required: true, unique: true },
  colname: { type: String, required: true, unique: true },
  id: { type: String, required: true, unique: true}
});
const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const User = mongoose.model("User", UserSchema);
const Data = mongoose.model("Data", DataSchema);
const PCS = mongoose.model("PCS",PublicCollectionsSchema);
const DataRouter = express.Router();
const UserRouter = express.Router();
const PageRouter = express.Router();
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized access" });
}
UserRouter.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }
    console.log("Username:", username);
    console.log("Password:", password);
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }
    const salt = await bcrypt.genSalt(10);
    console.log("Salt:", salt);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log("Hashed Password:", hashedPassword);
    const newUser = new User({
      username,
      password: hashedPassword,
    });
    const newData = new Data({ username, coll: [] });
    await newUser.save();
    await newData.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});
UserRouter.post("/login", async (req, res) => {
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
});
UserRouter.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Logout failed" });
    }
    res.clearCookie("connect.sid");
    return res.status(200).json({ message: "Logged out successfully" });
  });
});
DataRouter.get("/", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const username = req.session.username;

    if (!userId || !username) {
      return res.status(401).json({ message: "Unauthorized access" });
    }

    const data = await Data.findOne({ username });
    if (!data) {
      return res.status(404).json({ message: "Data not found" });
    }
    res
      .status(200)
      .json({ message: `Welcome to your dashboard, ${username}`, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
DataRouter.post("/collection", isAuthenticated, async (req, res) => {
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
DataRouter.put("/collection/:colname", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const username = req.session.username;
    if (!userId || !username) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { newColname } = req.body;
    if (!newColname) {
      return res.status(400).json({ message: "Insufficient data" });
    }
    const data = await Data.findOne({ username });
    if (!data) {
      return res.status(404).json({ message: "Data not found" });
    }
    const coll = data.coll.find((col) => col.colname === req.params.colname);
    if (!coll) {
      return res.status(404).json({ message: "Collection not found" });
    }
    coll.colname = newColname;
    await data.save();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
DataRouter.delete("/collection/:colname", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const username = req.session.username;
    if (!userId || !username) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const data = await Data.findOne({ username });
    if (!data) {
      return res.status(404).json({ message: "Data not found" });
    }
    data.coll = data.coll.filter((col) => col.colname !== req.params.colname);
    await data.save();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
DataRouter.post(
  "/collection/:colname/key",
  isAuthenticated,
  async (req, res) => {
    try {
      const userId = req.session.userId;
      const username = req.session.username;
      if (!userId || !username) {
        return res.status(401).json({ message: "Unauthorized access" });
      }
      const { key, value } = req.body;
      if (!key || !value) {
        return res.status(400).json({ message: "Insufficient data" });
      }
      const data = await Data.findOne({ username });
      if (!data) {
        return res.status(404).json({ message: "Data not found" });
      }
      const coll = data.coll.find((col) => col.colname === req.params.colname);
      if (!coll) {
        return res.status(404).json({ message: "Collection not found" });
      }
      coll.coldata.push({ key, value });
      await data.save();
      res.status(201).json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

DataRouter.post("/collection/:colname/share", isAuthenticated, async (req, res) => {
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
      const newId = coll._id.toString();
      const publicCollection = new PCS({
        username,
        colname: req.params.colname,
        id: newId,
      });
      await publicCollection.save();
      coll.share = true;
      await data.save();
      return res.status(200).json({
        message: "Collection shared successfully",
        id: newId,
        data,
      });
    } else {
      await PCS.deleteOne({ username, colname: req.params.colname });
      coll.share = false;
      await data.save();
      return res.status(200).json({
        message: "Collection unshared successfully",
        data,
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


DataRouter.put(
  "/collection/:colname/key/:key",
  isAuthenticated,
  async (req, res) => {
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
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);
DataRouter.delete(
  "/collection/:colname/key/:key",
  isAuthenticated,
  async (req, res) => {
    try {
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

      coll.coldata = coll.coldata.filter((kv) => kv.key !== req.params.key);
      await data.save();

      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);
PageRouter.get("/publicshared/:id", async (req, res) => {
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "dist")));
app.use(express.json());
app.get("/api/dbstat/", (req, res, next) => {
  const dbState = mongoose.connection.readyState; // 1: connected, 0: disconnected
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
app.use("/api/user", UserRouter);
app.use("/api/data", DataRouter);
app.use("/api/page", PageRouter);
app.get("*", (req, res, next) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server is running in port ${PORT}`));
