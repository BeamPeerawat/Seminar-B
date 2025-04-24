import express from "express";
import User from "../models/User.js";
import Profile from "../models/Profile.js";
import authenticate from "../middleware/authenticate.js"; // เพิ่ม import นี้

const router = express.Router();

// ดึงข้อมูลผู้ใช้ทั้งหมด (สำหรับ Admin)
router.get("/", async (req, res) => {
  try {
    const users = await User.find();
    const totalUsers = await User.countDocuments();
    res.status(200).json({ users, totalUsers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ล็อกอินด้วยไลน์ (ใช้ userId เป็น String)
router.post("/login", async (req, res) => {
  const { userId, name, profileImage } = req.body;

  try {
    let user = await User.findOne({ userId });
    if (!user) {
      user = await User.create({ userId, name, profileImage });
    }

    const profile = await Profile.findOne({ userId });
    const profileCompleted = profile ? profile.profileCompleted : false;

    if (!profileCompleted) {
      return res.status(200).json({ profileCompleted: false, userId: user.userId });
    }

    res.status(200).json({ profileCompleted: true, userId: user.userId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - บันทึกโปรไฟล์ (ใช้ Profile model กับ userId เป็น String)
router.post("/profile", async (req, res) => {
  const { userId, fullName, address, phoneNumber, email, profileImage } = req.body;

  try {
    let profile = await Profile.findOne({ userId });

    if (!profile) {
      profile = new Profile({
        userId,
        name: fullName,
        address,
        phone: phoneNumber,
        email: email || null,
        profileImage,
        profileCompleted: true,
      });
    } else {
      profile.name = fullName;
      profile.address = address;
      profile.phone = phoneNumber;
      profile.email = email || null;
      profile.profileImage = profileImage;
      profile.profileCompleted = true;
    }

    await profile.save();

    const user = await User.findOne({ userId });
    if (user) {
      user.profileCompleted = true;
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
    const profile = await Profile.findOne({ userId: req.params.userId });
    if (!profile) {
      return res.status(404).json({ error: "Profile not found." });
    }
    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { fullname, role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { fullname, role },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// routes/userRoutes.js
router.get("/admin/profile", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const profile = await Profile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }
    res.status(200).json({
      success: true,
      profile: {
        userId,
        name: profile.name,
        address: profile.address,
        phone: profile.phone,
        email: profile.email,
        profileCompleted: profile.profileCompleted,
      },
    });
  } catch (error) {
    console.error("Error fetching admin profile:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ดึงผู้ใช้ทั้งหมดสำหรับแอดมิน
router.get("/admin/users", authenticate, async (req, res) => {
  try {
    const users = await User.find();
    const totalUsers = await User.countDocuments();
    res.status(200).json({ success: true, users, totalUsers });
  } catch (error) {
    console.error("Error fetching users for admin:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;