import express from "express";
import mongoose from "mongoose"; // เพิ่มการนำเข้า mongoose
import User from "../models/User.js";
import Profile from "../models/Profile.js";

const router = express.Router();

// ล็อกอินด้วยไลน์
router.post("/login", async (req, res) => {
  const { lineId, name, profileImage } = req.body;

  try {
    let user = await User.findOne({ lineId });
    if (!user) {
      user = await User.create({ lineId, name });
    }

    if (!user.isProfileComplete) {
      return res
        .status(200)
        .json({ isProfileComplete: false, userId: user._id });
    }

    res.status(200).json({ isProfileComplete: true, userId: user._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - บันทึกโปรไฟล์
router.post("/profile", async (req, res) => {
  const { userId, fullName, address, phoneNumber, email, profileImage } =
    req.body;

  try {
    // แปลง userId เป็น ObjectId โดยใช้ 'new'
    const userIdObjectId = new mongoose.Types.ObjectId(userId);

    // ตรวจสอบว่าผู้ใช้มีโปรไฟล์อยู่ในระบบแล้ว
    let profile = await Profile.findOne({ userId: userIdObjectId });

    if (!profile) {
      // ถ้ายังไม่มีโปรไฟล์ให้สร้างใหม่
      profile = new Profile({
        userId: userIdObjectId,
        fullName,
        address,
        phoneNumber,
        email,
        profileImage,
      });
    } else {
      // ถ้ามีโปรไฟล์แล้วให้ทำการอัปเดต
      profile.fullName = fullName;
      profile.address = address;
      profile.phoneNumber = phoneNumber;
      profile.email = email;
      profile.profileImage = profileImage;
    }

    // บันทึกโปรไฟล์ในฐานข้อมูล
    await profile.save();

    // อัปเดตสถานะโปรไฟล์ใน User
    const user = await User.findById(userIdObjectId);
    user.isProfileComplete = true;
    await user.save();

    res.status(200).json({ message: "Profile updated successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ดึงข้อมูลโปรไฟล์
router.get("/profile/:userId", async (req, res) => {
  try {
    // แปลง userId เป็น ObjectId โดยใช้ 'new'
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
