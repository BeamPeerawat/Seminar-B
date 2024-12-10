const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.json());
app.use(cors({ origin: "http://localhost:3000" })); // ตั้งค่า CORS

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes

// Route สำหรับ /auth/exchange-code
app.post("/auth/exchange-code", async (req, res) => {
  console.log("Endpoint hit: /auth/exchange-code");
  console.log("Request body:", req.body);

  const { code, state } = req.body;

  if (!code || !state) {
    console.error("Missing required parameters: code or state");
    return res.status(400).json({ error: "Missing code or state" });
  }

  const data = new URLSearchParams();
  data.append("grant_type", "authorization_code");
  data.append("code", code);
  data.append("redirect_uri", "http://localhost:3000/callback"); // Redirect URI
  data.append("client_id", process.env.LINE_CLIENT_ID); // Channel ID
  data.append("client_secret", process.env.LINE_CLIENT_SECRET); // Channel Secret

  try {
    const response = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      body: data,
    });

    if (!response.ok) {
      console.error("Failed to exchange code:", await response.text());
      return res.status(400).json({ error: "Failed to exchange code" });
    }

    const tokenData = await response.json();
    console.log("Token Data:", tokenData);

    res.json({ accessToken: tokenData.access_token });
  } catch (error) {
    console.error("Error during token exchange:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Route สำหรับ /quotations (สมมติว่าเป็นเส้นทางสำหรับ quotationRoutes)
app.get("/quotations", (req, res) => {
  res.json({ message: "Quotation endpoint" });
});

// Route สำหรับ /auth (เส้นทางที่ใช้สำหรับการสมัครสมาชิก, เข้าสู่ระบบ ฯลฯ)
app.post("/auth/register", async (req, res) => {
  // การลงทะเบียนผู้ใช้ (หากต้องการเพิ่ม)
  res.status(200).json({ message: "Registration endpoint" });
});

app.post("/auth/login", async (req, res) => {
  // การเข้าสู่ระบบ (หากต้องการเพิ่ม)
  res.status(200).json({ message: "Login endpoint" });
});

// Root Route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Error Handling for Undefined Routes
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

// Debugging Loaded Routes
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    console.log(
      `Loaded route: ${middleware.route.path} [${Object.keys(
        middleware.route.methods
      )
        .join(", ")
        .toUpperCase()}]`
    );
  } else if (middleware.name === "router") {
    middleware.handle.stack.forEach((handler) => {
      if (handler.route) {
        console.log(
          `Loaded nested route: ${handler.route.path} [${Object.keys(
            handler.route.methods
          )
            .join(", ")
            .toUpperCase()}]`
        );
      }
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
