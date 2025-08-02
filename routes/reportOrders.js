import express from "express";
import Order from "../models/Order.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import User from "../models/User.js";

const router = express.Router();

router.use(authMiddleware);

// GET /api/reports/orders
router.get("/orders", async (req, res) => {
  try {
    const { from, to } = req.query;
    const userId = req.user.userId;
    const user = await User.findOne({ userId });
    if (!user || user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Access denied: Admin only" });
    }

    if (!from || !to) {
      return res.status(400).json({ success: false, error: "Please provide both 'from' and 'to' dates" });
    }

    const orders = await Order.find({
      createdAt: {
        $gte: new Date(from),
        $lte: new Date(to),
      },
    });

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Error fetching orders report:", error);
    res.status(500).json({ success: false, error: "Failed to fetch orders report" });
  }
});

export default router;