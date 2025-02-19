import express from "express";
import dotenv from "dotenv";
import cors from "";
import helmet from "helmet";
import axios from "axios";
import blogRoutes from "./routes/blogRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import visitorRoutes from "./routes/visitorRoutes.js";
import connectDB from "./db.js";
import { corsOptions } from "./config/corsConfig.js";
import { exchangeCode } from "./controllers/authController.js";
import { getProfile } from "./controllers/profileController.js";
import logger from "./utils/logger.js";
import profileRoutes from "./routes/profileRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
dotenv.config();

// Initialize App
const app = express();
const PORT = process.env.PORT || 5000; // ใช้ process.env.PORT ที่ Render กำหนด หรือ 5000 ถ้าไม่กำหนด

// Middleware
app.use(helmet());
app.use(express.json());
app.use(cors(corsOptions));

// Routes
app.use("/api/blogs", blogRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/visitor", visitorRoutes);
app.post("/api/auth/exchange-code", exchangeCode);
app.use("/api", profileRoutes);
app.use("/api/orders", orderRoutes);

// Route สำหรับหน้าแรก
app.get("/", (req, res) => {
  res.send("Hello, World! Your backend is working correctly.");
});

// เพิ่ม route สำหรับตรวจสอบโปรไฟล์
app.post("/api/check-profile", async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, profileCompleted: user.profileCompleted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// อนุญาต Preflight Request สำหรับทุก route
app.options("*", cors(corsOptions));

// Connect to Database
connectDB()
  .then(() => logger.info("Connected to MongoDB successfully"))
  .catch((error) => logger.error("Failed to connect to MongoDB:", error));

// Start Server
app.listen(PORT, '0.0.0.0', () => {   // ใช้ 0.0.0.0 เพื่อให้แอปฟังการเชื่อมต่อจากภายนอก
  logger.info(`Server is running on http://localhost:${PORT}`);
});
