
import express from "express";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Visitor from "../models/Visitor.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/summary", async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findOne({ userId });
    if (!user || user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Access denied: Admin only" });
    }

    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const sales = await Order.aggregate([
      { $match: { status: { $in: ["confirmed", "delivered"] } } },
      {
        $group: {
          _id: null,
          daily: {
            $sum: {
              $cond: [{ $gte: ["$createdAt", startOfDay] }, "$total", 0],
            },
          },
          monthly: {
            $sum: {
              $cond: [{ $gte: ["$createdAt", startOfMonth] }, "$total", 0],
            },
          },
          yearly: {
            $sum: {
              $cond: [{ $gte: ["$createdAt", startOfYear] }, "$total", 0],
            },
          },
          total: { $sum: "$total" },
        },
      },
    ]);

    const orderStatus = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const topProducts = await Order.aggregate([
      { $match: { status: { $in: ["confirmed", "delivered"] } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          name: { $first: "$items.name" },
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 },
    ]);

    const totalUsers = await User.countDocuments();
    const visitor = await Visitor.findOne();
    const visitorCount = visitor ? visitor.count : 0;

    const responseData = {
      success: true,
      data: {
        sales: sales[0] || { daily: 0, monthly: 0, yearly: 0, total: 0 },
        orderStatus: orderStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        topProducts,
        totalUsers,
        visitorCount,
      },
    };

    console.log("Report response:", responseData); // Debug
    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching report summary:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
