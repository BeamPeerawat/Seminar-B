// routes/adminRoutes.js (หรือเพิ่มใน routes/profileRoutes.js)
import express from "express";
import User from "../models/User.js";
import authenticate from "../middleware/authenticate.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// ดึงข้อมูลผู้ใช้ทั้งหมด (สำหรับแอดมินเท่านั้น)
router.get("/users", authenticate, authMiddleware, async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Error fetching users", message: error.message });
  }
});

// อัปเดต role ของผู้ใช้ (สำหรับแอดมินเท่านั้น)
router.put("/users/:userId/role", authenticate, authMiddleware, async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body; // role ใหม่ (ต้องเป็น "admin" หรือ "user")

  // ตรวจสอบว่า role ที่ส่งมามีค่าใน enum หรือไม่
  if (!["admin", "user"].includes(role)) {
    return res.status(400).json({ error: "Invalid role. Must be 'admin' or 'user'" });
  }

  try {
    const user = await User.findOneAndUpdate(
      { userId }, // ใช้ userId เป็น String
      { role, updatedAt: Date.now() }, // อัปเดต role และ timestamp
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "Role updated successfully", user });
  } catch (error) {
    res.status(500).json({ error: "Failed to update role", message: error.message });
  }
});

export default router;