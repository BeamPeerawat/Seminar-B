import express from "express";
import Order from "../models/Order.js";
import Profile from "../models/Profile.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import OrderCounter from "../models/OrderCounter.js";
import authenticate from "../middleware/authenticate.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Middleware สำหรับตรวจสอบบทบาท Admin
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findOne({ userId: req.user.userId });
    if (!user || user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Access denied: Admin only" });
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ฟังก์ชันเพื่อดึงและเพิ่มเลขลำดับ
const getNextOrderNumber = async () => {
  try {
    const counter = await OrderCounter.findByIdAndUpdate(
      "order_counter",
      { $inc: { sequence_value: 1 } },
      { new: true, upsert: true }
    );
    const sequenceValue = counter.sequence_value;
    if (typeof sequenceValue !== "number" || isNaN(sequenceValue)) {
      throw new Error("Invalid sequence value for orderNumber");
    }
    return sequenceValue;
  } catch (error) {
    console.error("Error generating orderNumber:", error);
    throw error;
  }
};

// สร้างคำสั่งซื้อ
router.post("/", authenticate, authMiddleware, async (req, res) => {
  try {
    const { items, total, customer, paymentMethod } = req.body;
    const userId = req.user.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized: No user logged in" });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

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

    const orderNumber = await getNextOrderNumber();
    if (typeof orderNumber !== "number" || isNaN(orderNumber)) {
      throw new Error("Invalid orderNumber generated");
    }

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

    res.status(201).json({
      success: true,
      orderNumber,
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

// ดึงข้อมูลคำสั่งซื้อตาม orderNumber
router.get("/:orderNumber", authenticate, authMiddleware, async (req, res) => {
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
router.get("/", authenticate, authMiddleware, async (req, res) => {
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

// ดึงคำสั่งซื้อทั้งหมด (สำหรับ Admin)
router.get("/all", authenticate, isAdmin, async (req, res) => {
  try {
    // Query เฉพาะ document ที่ orderNumber เป็น number
    const orders = await Order.find({ orderNumber: { $type: "number" } })
      .sort({ createdAt: -1 })
      .populate("userId");
    
    if (!orders || orders.length === 0) {
      return res.status(200).json({
        success: true,
        orders: [],
        message: "No orders found",
      });
    }

    const ordersData = await Promise.all(
      orders.map(async (order) => {
        const orderData = order.toObject();
        // Debug: Log orderNumber ที่ไม่ถูกต้อง
        if (typeof orderData.orderNumber !== "number" || isNaN(orderData.orderNumber)) {
          console.error(`Invalid orderNumber found: _id=${orderData._id}, orderNumber=${orderData.orderNumber}`);
        }
        try {
          const user = await User.findOne({ userId: order.userId });
          orderData.customerName = user ? user.displayName : "Unknown User";
        } catch (userError) {
          console.error(`Error fetching user for order ${order.orderNumber}:`, userError);
          orderData.customerName = "Unknown User";
        }
        orderData.createdAt = new Date(orderData.createdAt).toLocaleString("th-TH", {
          dateStyle: "medium",
          timeStyle: "short",
        });
        return orderData;
      })
    );

    console.log("Fetched orders:", ordersData.length); // Debug
    res.status(200).json({
      success: true,
      orders: ordersData,
    });
  } catch (error) {
    console.error("Error in GET /api/orders/all:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch orders",
      details: error.message,
    });
  }
});

// อัปเดตสถานะคำสั่งซื้อ
router.put("/:orderNumber/status", authenticate, isAdmin, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    const order = await Order.findOne({ orderNumber: Number(orderNumber) });
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    order.status = status;
    await order.save();

    const orderData = order.toObject();
    orderData.createdAt = new Date(orderData.createdAt).toLocaleString();

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

export default router;