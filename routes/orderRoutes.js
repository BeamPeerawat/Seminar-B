import express from "express";
import Order from "../models/Order.js";
import authenticate from "../middleware/authenticate.js"; // นำเข้า authenticate
import { authMiddleware } from "../middleware/authMiddleware.js"; // นำเข้า authMiddleware

const router = express.Router();

// ใช้ authenticate และ authMiddleware ร่วมกัน
router.post("/", authenticate, authMiddleware, async (req, res) => {
  try {
    const { items, total, customer, paymentMethod } = req.body;

    // สร้างคำสั่งซื้อและเชื่อมโยงกับผู้ใช้ที่ล็อกอิน
    const order = await Order.create({
      user: req.user._id, // ใช้ req.user._id จาก authenticate
      items,
      total,
      customer,
      paymentMethod,
      status: "pending",
    });

    await order.save();

    // แปลงข้อมูลให้เป็น Object และเพิ่มฟิลด์ createdAt แบบอ่านง่าย
    const orderData = order.toObject();
    orderData.createdAt = new Date(orderData.createdAt).toLocaleString();

    res.status(201).json({
      success: true,
      orderId: order._id,
      order: order.toObject(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;