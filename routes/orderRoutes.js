import express from "express";
import Order from "../models/Order.js";
import Profile from "../models/Profile.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import OrderCounter from "../models/OrderCounter.js";
import authenticate from "../middleware/authenticate.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// ฟังก์ชันเพื่อดึงและเพิ่มเลขลำดับ
const getNextOrderNumber = async () => {
  const counter = await OrderCounter.findByIdAndUpdate(
    "order_counter",
    { $inc: { sequence_value: 1 } },
    { new: true, upsert: true }
  );
  return counter.sequence_value;
};

// ดึงออเดอร์ทั้งหมดตามสถานะ (ไม่ต้องตรวจสอบสิทธิ์)
router.get("/", async (req, res) => {
  try {
    const { status } = req.query;
    console.log("Fetching orders with status:", status);
    const query = status ? { status } : {};
    const orders = await Order.find(query).sort({ createdAt: -1 });
    console.log("Orders found:", orders.length);
    
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
    console.error("Error fetching orders:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// อัปเดตสถานะการแจ้งเตือน (ไม่ต้องตรวจสอบสิทธิ์)
router.patch("/:orderNumber/notification", async (req, res) => {
  try {
    const { orderNumber } = req.params;
    console.log("Marking notification as read for order:", orderNumber);
    const order = await Order.findOneAndUpdate(
      { orderNumber: Number(orderNumber) },
      { isNotified: true, updatedAt: Date.now() },
      { new: true }
    );
    if (!order) {
      console.log("Order not found:", orderNumber);
      return res.status(404).json({ success: false, error: "Order not found" });
    }
    console.log("Notification updated for order:", orderNumber);
    res.json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    console.error("Error updating notification:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Endpoint อื่นๆ ยังคงใช้ authenticate และ authMiddleware
// สร้างคำสั่งซื้อ
router.post("/", authenticate, authMiddleware, async (req, res) => {
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
      isNotified: false,
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
router.get("/:orderNumber", authenticate, authMiddleware, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const userId = req.user.userId;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const query = user.role === "admin" ? { orderNumber: Number(orderNumber) } : { orderNumber: Number(orderNumber), userId };

    const order = await Order.findOne(query);
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
    console.error("Error fetching order:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// อัปโหลดสลิป
router.post("/upload-slip", authenticate, authMiddleware, async (req, res) => {
  try {
    const { orderNumber, slipUrl } = req.body;
    const userId = req.user.userId;

    if (!orderNumber || !slipUrl) {
      return res.status(400).json({ success: false, error: "Missing orderNumber or slipUrl" });
    }

    const cloudinaryUrlPattern = /^https:\/\/res\.cloudinary\.com\/debhfdjki\//;
    if (!cloudinaryUrlPattern.test(slipUrl)) {
      return res.status(400).json({ success: false, error: "Invalid slipUrl: Must be a valid Cloudinary URL" });
    }

    const order = await Order.findOne({ orderNumber: Number(orderNumber), userId });
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    order.slipUrl = slipUrl;
    order.status = "awaiting_verification";
    order.updatedAt = Date.now();
    await order.save();

    res.status(200).json({ success: true, message: "Slip uploaded successfully", slipUrl });
  } catch (error) {
    console.error("Error uploading slip:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// อัปเดตสถานะออเดอร์
router.put("/:orderNumber/status", authenticate, authMiddleware, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    const user = await User.findOne({ userId });
    if (!user || user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Access denied: Admin only" });
    }

    const validStatuses = ["pending", "awaiting_verification", "confirmed", "ready_to_ship", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    const order = await Order.findOneAndUpdate(
      { orderNumber: Number(orderNumber) },
      { status, updatedAt: Date.now() },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;