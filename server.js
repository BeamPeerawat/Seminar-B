// Import Dependencies
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const fetch = require("node-fetch"); // To handle Line API requests
require("dotenv").config();

// Initialize App
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors({ origin: "http://localhost:3000" }));

// MongoDB Connection
mongoose
  .connect(
    "mongodb+srv://beamsaenpong:beam160246@beam.8uqze.mongodb.net/TestProjectSeminar?retryWrites=true&w=majority",
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Import Models
const User = mongoose.model(
  "User",
  new mongoose.Schema({
    fullname: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  })
);

// JWT Middleware
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) {
    return res.status(403).json({ error: "Access denied, token missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Routes

// Auth Routes
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  // ตรวจสอบ Username และ Password
  if (username === "admin" && password === "yourAdminPassword") {
    const token = jwt.sign({ username }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({ token });
  } else {
    res.status(400).json({ message: "Invalid Credentials" });
  }
});

app.post("/auth/register", async (req, res) => {
  const { fullname, email, password } = req.body;

  if (!fullname || !email || !password) {
    return res
      .status(400)
      .json({ error: "Fullname, email, and password are required" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ fullname, email, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.status(201).json({ message: "User registered successfully", token });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Server error, please try again later" });
  }
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Line API Routes
app.post("/auth/exchange-code", async (req, res) => {
  const { code, state } = req.body;

  if (!code || !state) {
    return res.status(400).json({ error: "Missing code or state" });
  }

  const data = new URLSearchParams();
  data.append("grant_type", "authorization_code");
  data.append("code", code);
  data.append("redirect_uri", "http://localhost:3000/callback");
  data.append("client_id", process.env.LINE_CLIENT_ID);
  data.append("client_secret", process.env.LINE_CLIENT_SECRET);

  try {
    const response = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      body: data,
    });

    if (!response.ok) {
      return res.status(400).json({ error: "Failed to exchange code" });
    }

    const tokenData = await response.json();
    res.json({ accessToken: tokenData.access_token });
  } catch (error) {
    console.error("Line API error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Quotation Routes (Protected)
app.get("/quotations", verifyToken, (req, res) => {
  res.json({ message: "Quotation endpoint", user: req.user });
});

// Root Route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Error Handling for Undefined Routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found", path: req.originalUrl });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
