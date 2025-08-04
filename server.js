import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import blogRoutes from "./routes/blogRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import visitorRoutes from "./routes/visitorRoutes.js";
import { corsOptions } from "./config/corsConfig.js";
import { exchangeCode } from "./controllers/authController.js";
import profileRoutes from "./routes/profileRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import authenticate from "./middleware/authenticate.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
import productRoutes from "./routes/productRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import servicesRoutes from "./routes/servicesRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import fileUpload from "express-fileupload";
import cancelExpiredOrders from "./cron/cancelExpiredOrders.js";

dotenv.config();

console.log("Starting server...");

const app = express();
const PORT = process.env.PORT || 10000;

console.log("Environment variables:", {
  MONGO_URI: process.env.MONGO_URI ? "Set" : "Missing",
  JWT_SECRET: process.env.JWT_SECRET ? "Set" : "Missing",
  LINE_CLIENT_ID: process.env.LINE_CLIENT_ID ? "Set" : "Missing",
  LINE_CLIENT_SECRET: process.env.LINE_CLIENT_SECRET ? "Set" : "Missing",
  LINE_REDIRECT_URI: process.env.LINE_REDIRECT_URI ? "Set" : "Missing",
  CLIENT_URL: process.env.CLIENT_URL ? "Set" : "Missing",
  NODE_ENV: process.env.NODE_ENV,
  PORT: PORT,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? "Set" : "Missing",
});

app.use(helmet());
app.use(express.json());
app.use(cors(corsOptions));
app.use(fileUpload()); // เพิ่ม middleware สำหรับจัดการไฟล์

app.use("/api/blogs", blogRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/visitor", visitorRoutes);
app.post("/api/auth/exchange-code", exchangeCode);
app.use("/api", profileRoutes);
app.use("/api/orders", authenticate, authMiddleware, orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/cart", cartRoutes);

cancelExpiredOrders();

app.get("/", (req, res) => {
  res.send("Hello, World! Your backend is working correctly.");
});

app.use((err, req, res, next) => {
  console.error("Global error:", err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

const startServer = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB successfully");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
