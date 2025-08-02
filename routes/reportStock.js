import express from "express";
import Product from "../models/Product.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import User from "../models/User.js";

const router = express.Router();

router.use(authMiddleware);

// GET /api/reports/stock
router.get("/stock", async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findOne({ userId });
    if (!user || user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Access denied: Admin only" });
    }

    const products = await Product.find().select("productId name stock");

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Error fetching stock report:", error);
    res.status(500).json({ success: false, error: "Failed to fetch stock report" });
  }
});

export default router;