import express from "express";
import Order from "../models/Order.js";
import Profile from "../models/Profile.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import OrderCounter from "../models/OrderCounter.js";
import authenticate from "../middleware/authenticate.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { adminMiddleware } from "../middleware/adminMiddleware.js"; // เพิ่ม middleware

const router = express.Router();

// เฉพาะแอดมิน: ดึงคำสั่งซื้อทั้งหมด
router.get("/admin/all", authenticate, adminMiddleware, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }); // เรียงจากใหม่สุด
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
      totalOrders: orders.length,
    });
  } catch (error) {
    console.error("Error fetching all orders:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch orders",
      details: error.message,
    });
  }
});

// อัปเดตสถานะคำสั่งซื้อ (สำหรับแอดมิน)
router.put("/:orderNumber/status", authenticate, adminMiddleware, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { status } = req.body;

    // ตรวจสอบสถานะที่ถูกต้อง
    const validStatuses = ["pending", "confirmed", "processing", "shipped", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    const order = await Order.findOne({ orderNumber: Number(orderNumber) });
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    // ถ้ายกเลิกคำสั่งซื้อ ให้คืนสต็อก
    if (status === "cancelled" && order.status !== "cancelled") {
      for (const item of order.items) {
        const product = await Product.findOne({ productId: item.productId });
        if (product) {
          product.stock += item.quantity;
          await product.save();
        }
      }
    }

    order.status = status;
    await order.save();

    const orderData = order.toObject();
    orderData.createdAt = new Date(orderData.createdAt).toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order: orderData,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update order status",
      details: error.message,
    });
  }
});

// เส้นทางที่มีอยู่ (สำหรับผู้ใช้ทั่วไป)
router.use(authenticate, authMiddleware);

// สร้างคำสั่งซื้อ
router.post("/", async (req, res) => {
  try {
    const { items, total, customer, paymentMethod } = req.body;
    const userId = req.user.userId;

    console.log("Received order data:", { items, total, customer, paymentMethod, userId });

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized: No user logged in" });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // ตรวจสอบและอัปเดตสต็อกสินค้า
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

    // ดึงเลขลำดับใหม่
    const orderNumber = await getNextOrderNumber();

    const order = await Order.create({
      orderNumber,
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

    const responseData = {
      success: true,
      orderNumber,
      order: orderData,
    };
    console.log("Sending response:", responseData);

    res.status(201).json(responseData);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ดึงข้อมูลคำสั่งซื้อตาม orderNumber
router.get("/:orderNumber", async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const userId = req.user.userId;

    const order = await Order.findOne({ orderNumber: Number(orderNumber), userId });
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
    const userId = req.user.userId;

    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
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

// ฟังก์ชันเพื่อดึงและเพิ่มเลขลำดับ
const getNextOrderNumber = async () => {
  const counter = await OrderCounter.findByIdAndUpdate(
    "order_counter",
    { $inc: { sequence_value: 1 } },
    { new: true, upsert: true }
  );
  return counter.sequence_value;
};

export default router;