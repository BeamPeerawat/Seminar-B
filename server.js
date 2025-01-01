// Import Dependencies
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fetch from "node-fetch"; // To handle Line API requests
import dotenv from "dotenv";
import quotationRoutes from "./routes/quotationRoutes.js";
import blogRoutes from "./routes/blogRoutes.js";
dotenv.config();

// Initialize App
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors({ origin: "http://localhost:3000" }));
app.use("/quotations", quotationRoutes);
app.use("/api/blogs", blogRoutes);

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

const Visitor = mongoose.model(
  "Visitor",
  new mongoose.Schema({
    count: { type: Number, default: 0 },
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
// 1. Authentication Routes
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body;

  if (email === "AdminAutosolar@example.com" && password === "Autosolar") {
    const token = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    return res.json({ token });
  } else {
    return res.status(400).json({ error: "Invalid Credentials" });
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

// 2. User Management Routes (CRUD)
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, "fullname email");
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Error fetching users" });
  }
});

app.post("/api/users", async (req, res) => {
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

    res
      .status(201)
      .json({ message: "User created successfully", user: newUser });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/users/:id", async (req, res) => {
  const { fullname, email, password } = req.body;
  const { id } = req.params;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.fullname = fullname || user.fullname;
    user.email = email || user.email;
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();
    res.json({ message: "User updated successfully", user });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await User.findByIdAndDelete(id);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// 3. Line API Routes
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

// 4. Quotation Routes (Protected)
app.get("/quotations", (req, res) => {
  res.json({ message: "Quotation endpoint", user: req.user });
});

// 5. Visitor Routes
app.post("/increment-visitor", async (req, res) => {
  const visitor = await Visitor.findOne();
  if (!visitor) {
    const newVisitor = new Visitor({ count: 1 });
    await newVisitor.save();
    return res.json(newVisitor);
  }

  visitor.count += 1;
  await visitor.save();
  res.json(visitor);
});

app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendVisitorCount = async () => {
    const visitor = await Visitor.findOne();
    res.write(`data: ${visitor ? visitor.count : 0}\n\n`);
  };

  // Initial data send
  sendVisitorCount();

  // Set interval to send updated count every 5 seconds
  const intervalId = setInterval(sendVisitorCount, 5000);

  // Clean up when connection is closed
  req.on("close", () => {
    clearInterval(intervalId);
  });
});

// 6. Root Route
app.get("/", async (req, res) => {
  await fetch("http://localhost:5000/increment-visitor", { method: "POST" });
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
