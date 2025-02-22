import express from "express";
import mongoose from "mongoose"; // เพิ่มการนำเข้า mongoose
import User from "../models/User.js";
import Profile from "../models/Profile.js";

const router = express.Router();

// ล็อกอินด้วยไลน์ (ไม่เปลี่ยนแปลงมาก แต่ใช้ profileCompleted แทน isProfileComplete)
router.post("/login", async (req, res) => {
  const { lineId, name, profileImage } = req.body;

  try {
    let user = await User.findOne({ lineId });
    if (!user) {
      user = await User.create({ lineId, name, profileImage });
    }

    // ตรวจสอบสถานะโปรไฟล์จาก Profile model
    const profile = await Profile.findOne({ userId: user._id });
    const profileCompleted = profile ? profile.profileCompleted : false;

    if (!profileCompleted) {
      return res
        .status(200)
        .json({ profileCompleted: false, userId: user._id });
    }

    res.status(200).json({ profileCompleted: true, userId: user._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - บันทึกโปรไฟล์ (ใช้ Profile model)
router.post("/profile", async (req, res) => {
  const { userId, fullName, address, phoneNumber, email, profileImage } =
    req.body;

  try {
    // แปลง userId เป็น ObjectId
    const userIdObjectId = new mongoose.Types.ObjectId(userId);

    // ตรวจสอบว่าผู้ใช้มีโปรไฟล์อยู่ในระบบแล้วใน Profile model
    let profile = await Profile.findOne({ userId: userIdObjectId });

    if (!profile) {
      // ถ้ายังไม่มีโปรไฟล์ให้สร้างใหม่ใน Profile model
      profile = new Profile({
        userId: userIdObjectId,
        name: fullName,
        address,
        phone: phoneNumber,
        email: email || null, // อนุญาตให้ email เป็น null
        profileImage,
        profileCompleted: true, // ตั้งค่าเป็น true หลังจากบันทึกข้อมูลครบ
      });
    } else {
      // ถ้ามีโปรไฟล์แล้วให้ทำการอัปเดต
      profile.name = fullName;
      profile.address = address;
      profile.phone = phoneNumber;
      profile.email = email || null; // อนุญาตให้ email เป็น null
      profile.profileImage = profileImage;
      profile.profileCompleted = true; // ตั้งค่าเป็น true หลังจากบันทึกข้อมูลครบ
    }

    // บันทึกโปรไฟล์ในฐานข้อมูล Profile
    await profile.save();

    // อัปเดตสถานะโปรไฟล์ใน User model
    const user = await User.findById(userIdObjectId);
    if (user) {
      user.profileCompleted = true; // อัปเดต profileCompleted ใน User
      user.updatedAt = Date.now();
      await user.save();
    }

    res.status(200).json({ message: "Profile updated successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ดึงข้อมูลโปรไฟล์ (ใช้ Profile model)
router.get("/profile/:userId", async (req, res) => {
  try {
    // แปลง userId เป็น ObjectId
    const userId = new mongoose.Types.ObjectId(req.params.userId);

    const profile = await Profile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ error: "Profile not found." });
    }
    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;