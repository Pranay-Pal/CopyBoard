import express from "express";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import cors from "cors";
import session from "express-session";
import cookieParser from "cookie-parser";
import UserRoute from "./api/routes/UserRoute.js";
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

//MongoDB connection
var mongostatus = " False";
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    mongostatus = " TRUE";
  })
  .catch((err) => console.log(err));
//Static frontend serving
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "dist")));
app.get("/", (req, res, next) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});
// APIs section
app.use(express.json());
app.get("/api/dbstat/", (req, res, next) => {
  res.json({ status: mongostatus });
});
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3 * 24 * 60 * 60 * 1000 },
  })
);
app.use("/api/user", UserRoute);
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server is running in port ${PORT}`));
