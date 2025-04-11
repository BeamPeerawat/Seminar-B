import express from "express";
import Order from "../models/Order.js";
import Profile from "../models/Profile.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import authenticate from "../middleware/authenticate.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticate, authMiddleware);

// สร้างคำสั่งซื้อ (มีอยู่แล้ว)
router.post("/", async (req, res) => {
  try {
    const { items, total, customer, paymentMethod } = req.body;
    const userId = req.user.userId;

    console.log("Received order data:", { items, total, customer, paymentMethod, userId }); // Debug

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized: No user logged in" });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // ตรวจสอบและอัปเดตสต็อกสินค้าจาก Model Product ใน MongoDB
    for (const item of items) {
      const product = await Product.findOne({ productId: item.productId });
      if (!product) {
        return res.status(404).json({ success: false, error: `Product ${item.name} not found` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ success: false, error: `Insufficient stock for ${item.name}` });
      }
      product.stock -= item.quantity;
      await product.save();
    }

    const order = await Order.create({
      items,
      total,
      customer,
      paymentMethod,
      status: "pending",
      userId,
    });

    const profile = await Profile.findOne({ userId });
    if (profile) {
      profile.orders.push(order._id);
      profile.updatedAt = Date.now();
      await profile.save();
    }

    const orderData = order.toObject();
    orderData.createdAt = new Date(orderData.createdAt).toLocaleString();

    res.status(201).json({
      success: true,
      orderId: order._id,
      order: orderData,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ดึงข้อมูลคำสั่งซื้อตาม orderId
router.get("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;

    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const orderData = order.toObject();
    orderData.createdAt = new Date(orderData.createdAt).toLocaleString();

    res.status(200).json({
      success: true,
      order: orderData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ดึงประวัติคำสั่งซื้อทั้งหมดของผู้ใช้
router.get("/", async (req, res) => {
  try {
    const userId = req.user.userId; // ได้จาก middleware authenticate

    const orders = await Order.find({ userId }).sort({ createdAt: -1 }); // เรียงจากใหม่ไปเก่า
    if (!orders || orders.length === 0) {
      return res.status(200).json({
        success: true,
        orders: [],
        message: "No orders found for this user",
      });
    }

    const ordersData = orders.map((order) => {
      const orderData = order.toObject();
      orderData.createdAt = new Date(orderData.createdAt).toLocaleString("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
      });
      return orderData;
    });

    res.status(200).json({
      success: true,
      orders: ordersData,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch orders",
      details: error.message,
    });
  }
});

export default router;