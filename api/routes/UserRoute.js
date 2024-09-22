import * as express from "express";
import bcrypt from "bcryptjs";
import cors from "cors";
const UserRouter = express.Router();
import User from "../models/UserModel.js";

UserRouter.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    console.log("Username:", username);
    console.log("Password:", password);

    // User existence check
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    console.log("Salt:", salt);

    const hashedPassword = await bcrypt.hash(password, salt);
    console.log("Hashed Password:", hashedPassword);

    // Create and save new user
    const newUser = new User({
      username,
      password: hashedPassword,
    });

    await newUser.save();
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

  // Set session cookie
  req.session.userId = user._id;
  res.json({ message: "Login successful" });
});
UserRouter.post("/logout", (req, res) => {
  req.session.destroy();
  res.clearCookie("connect.sid");
  res.json({ message: "Logout successful" });
});

export default UserRouter;
