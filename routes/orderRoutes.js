// backend/routes/orderRoutes.js
import express from "express";
import Order from "../models/Order.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { items, total, customer, paymentMethod } = req.body;

    const order = await Order.create({
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
      order: order.toObject(), // แปลงข้อมูลให้ถูกต้อง
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
