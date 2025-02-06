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
dotenv.config();

// Initialize App
const app = express();
const PORT = process.env.PORT || 5000;

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

// Connect to Database
connectDB()
  .then(() => logger.info("Connected to MongoDB successfully"))
  .catch((error) => logger.error("Failed to connect to MongoDB:", error));

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
});

