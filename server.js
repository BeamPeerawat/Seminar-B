// server.js

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import blogRoutes from "./routes/blogRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import visitorRoutes from "./routes/visitorRoutes.js";
import connectDB from "./db.js";
import { corsOptions } from "./config/corsConfig.js";
import authenticate from "./middleware/authenticate.js";
import { exchangeCode } from "./controllers/authController.js";

dotenv.config();

// Initialize App
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors(corsOptions));

// Routes
app.use("/api/blogs", blogRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/visitor", visitorRoutes);
app.post("/api/auth/exchange-code", exchangeCode);
app.get("/api/profile", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1]; // รับ Token จาก header (Authorization: Bearer <token>)

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  try {
    // ใช้ access_token เพื่อดึงข้อมูลจาก LINE API
    const response = await axios.get("https://api.line.me/v2/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // ส่งข้อมูลโปรไฟล์กลับไปยัง Frontend
    res.json({
      name: response.data.displayName,
      email: response.data.email,
      profilePicture: response.data.pictureUrl,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch profile", error: error.message });
  }
});

// Connect to Database
connectDB();

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
