const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const quotationRoutes = require("./routes/quotationRoutes");
const authRoutes = require("./routes/auth");
const lineAuthRoutes = require("./routes/lineAuth");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.json());
app.use(cors({ origin: "http://localhost:3000" })); // ตั้งค่า CORS ให้รับคำขอจาก localhost:3000 หรือ URL ที่เว็บไซต์ของคุณใช้งานอยู่
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
  .catch((err) => console.log(err));

// Routes
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
