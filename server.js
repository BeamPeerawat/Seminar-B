const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const quotationRoutes = require("./routes/quotationRoutes");
const authRoutes = require("./routes/authRoutes");
const lineAuthRoutes = require("./routes/lineAuth");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.json());
app.use(cors({ origin: "http://localhost:3000" })); // ตั้งค่า CORS

// Routes
app.use("/quotations", quotationRoutes);
app.use("/auth", authRoutes);
app.use("/", lineAuthRoutes);

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

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
    console.log(`Loaded route: ${middleware.route.path}`);
  } else if (middleware.name === "router") {
    middleware.handle.stack.forEach((handler) => {
      if (handler.route) {
        console.log(`Loaded nested route: ${handler.route.path}`);
      }
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
