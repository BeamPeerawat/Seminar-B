import express from "express";
import Order from "../models/Order.js";
import Profile from "../models/Profile.js";
import User from "../models/User.js";
import Product from "../models/Product.js"; // นำเข้า Model Product
import authenticate from "../middleware/authenticate.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticate, authMiddleware);

router.post("/", async (req, res) => {
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

    // ตรวจสอบและอัปเดตสต็อกสินค้าจาก Model Product ใน MongoDB
    for (const item of items) {
      const product = await Product.findOne({ productId: item.productId });
      if (!product) {
        return res.status(404).json({ success: false, error: `Product ${item.name} not found` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ success: false, error: `Insufficient stock for ${item.name}` });
      }
      // ลดสต็อกทันที (ถ้าต้องการเก็บสต็อกไว้ในฐานข้อมูล)
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
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;