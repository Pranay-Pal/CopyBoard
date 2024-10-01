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
if (process.env.PROD != false) {
  app.use(
    cors({
      origin: "http://localhost:5173",
      credentials: true,
    })
  );
}
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => console.log(err));
const Schema = mongoose.Schema;
const valuesSchema = new Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
});
const collectionsSchema = new Schema({
  colname: { type: String, required: true, unique: true },
  coldata: [valuesSchema],
});
const DataSchema = new Schema({
  username: { type: String, required: true, unique: true, ref: "User" },
  coll: [collectionsSchema],
});
const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const User = mongoose.model("User", UserSchema);
const Data = mongoose.model("Data", DataSchema);
//----------------------------------------------------------------
// data routes
const DataRouter = express.Router();
const UserRouter = express.Router();
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
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "dist")));
app.get("/", (req, res, next) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});
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
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server is running in port ${PORT}`));
