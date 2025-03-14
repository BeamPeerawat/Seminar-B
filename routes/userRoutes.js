import express from "express";
import User from "../models/User.js";
import Profile from "../models/Profile.js";

const router = express.Router();

// ล็อกอินด้วยไลน์ (ใช้ userId เป็น String)
router.post("/login", async (req, res) => {
  const { userId, name, profileImage } = req.body;

  try {
    let user = await User.findOne({ userId });
    if (!user) {
      user = await User.create({ userId, displayName: name, pictureUrl: profileImage });
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

// ใหม่: ดึงข้อมูลผู้ใช้ทั้งหมด
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("-__v"); // ไม่ส่ง field __v กลับไป
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error: error.message });
  }
});

// ใหม่: อัปเดต Role ของผู้ใช้
router.patch("/:id", async (req, res) => {
  try {
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Error updating user role", error: error.message });
  }
});

export default router;