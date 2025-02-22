import express from "express";
import User from "../models/User.js";
import Profile from "../models/Profile.js";

const router = express.Router();

// ล็อกอินด้วยไลน์ (ใช้ userId เป็น String)
router.post("/login", async (req, res) => {
  const { userId, name, profileImage } = req.body; // ใช้ userId แทน lineId

  try {
    let user = await User.findOne({ userId }); // ใช้ userId เป็น String
    if (!user) {
      user = await User.create({ userId, name, profileImage });
    }

    // ตรวจสอบสถานะโปรไฟล์จาก Profile model
    const profile = await Profile.findOne({ userId });
    const profileCompleted = profile ? profile.profileCompleted : false;

    if (!profileCompleted) {
      return res
        .status(200)
        .json({ profileCompleted: false, userId: user.userId }); // ใช้ userId เป็น String
    }

    res.status(200).json({ profileCompleted: true, userId: user.userId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - บันทึกโปรไฟล์ (ใช้ Profile model กับ userId เป็น String)
router.post("/profile", async (req, res) => {
  const { userId, fullName, address, phoneNumber, email, profileImage } =
    req.body;

  try {
    // ตรวจสอบว่าผู้ใช้มีโปรไฟล์อยู่ในระบบแล้วใน Profile model
    let profile = await Profile.findOne({ userId }); // ใช้ userId เป็น String

    if (!profile) {
      // ถ้ายังไม่มีโปรไฟล์ให้สร้างใหม่ใน Profile model
      profile = new Profile({
        userId, // ใช้ userId เป็น String
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
    const user = await User.findOne({ userId }); // ใช้ userId เป็น String
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

// ดึงข้อมูลโปรไฟล์ (ใช้ Profile model กับ userId เป็น String)
router.get("/profile/:userId", async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.params.userId }); // ใช้ userId เป็น String
    if (!profile) {
      return res.status(404).json({ error: "Profile not found." });
    }
    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;