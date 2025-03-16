import express from "express";
import dotenv from "dotenv";
import cors from "cors";
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
import authenticate from "./middleware/authenticate.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
import productRoutes from "./routes/productRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import servicesRoutes from "./routes/servicesRoutes.js";
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
app.use("/api/orders", authenticate, authMiddleware, orderRoutes);
app.use("/api/products", productRoutes); // เพิ่ม route สำหรับสินค้า
app.use("/api/users", userRoutes);
app.use("/api/services", servicesRoutes);

// Route สำหรับหน้าแรก
app.get("/", (req, res) => {
  res.send("Hello, World! Your backend is working correctly.");
});

// Connect to Database
connectDB()
  .then(() => logger.info("Connected to MongoDB successfully"))
  .catch((error) => logger.error("Failed to connect to MongoDB:", error));

// Start Server
app.listen(PORT, '0.0.0.0', () => {   // ใช้ 0.0.0.0 เพื่อให้แอปฟังการเชื่อมต่อจากภายนอก
  logger.info(`Server is running on http://localhost:${PORT}`);
});
