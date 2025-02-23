// backend/routes/orderRoutes.js
import express from "express";
import Order from "../models/Order.js";
import Profile from "../models/Profile.js"; // นำเข้า Profile
import User from "../models/User.js"; // นำเข้า User
import authenticate from "../middleware/authenticate.js"; // นำเข้า authenticate
import { authMiddleware } from "../middleware/authMiddleware.js"; // นำเข้า authMiddleware

const router = express.Router();

// ใช้ middleware เพื่อตรวจสอบผู้ใช้
router.use(authenticate, authMiddleware);

router.post("/", async (req, res) => {
  try {
    const { items, total, customer, paymentMethod } = req.body;
    const userId = req.user.userId; // ดึง userId จาก req.user (หลัง authenticate)

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized: No user logged in" });
    }

    // ตรวจสอบผู้ใช้จาก User model
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // ตรวจสอบและอัปเดตสต็อกสินค้า (สมมติว่ามี model Product หรือ logic ตรวจสอบสต็อก)
    for (const item of items) {
      // ตรวจสอบสต็อกจาก servicesData หรือ Product model (ต้องสร้าง Product model ถ้าจำเป็น)
      const product = services[item.productId]; // ใช้ servicesData จาก frontend
      if (!product || product.stock < item.quantity) {
        return res.status(400).json({ success: false, error: `Insufficient stock for ${item.name}` });
      }
    }

    const order = await Order.create({
      items,
      total,
      customer,
      paymentMethod,
      status: "pending",
      userId, // เชื่อมโยงกับผู้ใช้ที่ล็อกอิน
    });

    // อัปเดตโปรไฟล์ของผู้ใช้ (เพิ่ม order ใน Profile)
    const profile = await Profile.findOne({ userId });
    if (profile) {
      profile.orders.push(order._id);
      profile.updatedAt = Date.now();
      await profile.save();
    }

    // แปลงข้อมูลให้เป็น Object และเพิ่มฟิลด์ createdAt แบบอ่านง่าย
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