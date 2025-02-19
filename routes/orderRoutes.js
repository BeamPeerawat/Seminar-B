// backend/routes/orderRoutes.js
import express from "express";
import Order from "../models/Order.js";
import { verifyToken } from "../middleware/authMiddleware.js"; // ต้องมี middleware นี้

const router = express.Router();

router.post("/", verifyToken, async (req, res) => {
  try {
    const { items, total, customer, paymentMethod } = req.body;
    const lineUserId = req.user.lineUserId; // มาจากการล็อกอินผ่าน LINE

    const order = await Order.create({
      items,
      total,
      customer,
      lineUserId, // บันทึก lineUserId
      paymentMethod,
      status: "pending",
    });

    await order.save();

    const orderData = order.toObject();
    orderData.createdAt = new Date(orderData.createdAt).toLocaleString();

    res.status(201).json({
      success: true,
      orderId: order._id,
      order: orderData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ใช้ authMiddleware เพื่อป้องกันการเข้าถึงโดยไม่ได้รับอนุญาต
router.get("/user-orders", authMiddleware, async (req, res) => {
  try {
    const lineUserId = req.user.lineUserId; // ดึง lineUserId จาก req.user
    const orders = await Order.find({ lineUserId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;