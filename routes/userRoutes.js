// routes/userRoutes.js
import express from "express";
import User from "../models/User.js";
import Profile from "../models/Profile.js";
import Visitor from "../models/Visitor.js"; // เพิ่ม Visitor model

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

// POST - บันทึกโปรไฟล์
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

// ดึงข้อมูลโปรไฟล์
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

// ดึงข้อมูลผู้ใช้ทั้งหมด
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("-__v");
    // ดึงข้อมูลโปรไฟล์ของผู้ใช้แต่ละคน
    const usersWithProfile = await Promise.all(
      users.map(async (user) => {
        const profile = await Profile.findOne({ userId: user.userId });
        return { ...user._doc, profile };
      })
    );
    res.status(200).json(usersWithProfile);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error: error.message });
  }
});

// อัปเดต Role ของผู้ใช้
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

// อัปเดตข้อมูลผู้ใช้ (PUT)
router.put("/:id", async (req, res) => {
  try {
    const { fullname, email } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { fullname, email },
      { new: true, runValidators: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Error updating user", error: error.message });
  }
});

// ลบผู้ใช้ (DELETE)
router.delete("/:id", async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error: error.message });
  }
});

// เพิ่ม Route สำหรับ Server-Sent Events (SSE)
router.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendVisitorCount = async () => {
    const visitor = await Visitor.findOne() || { count: 0 };
    res.write(`data: ${visitor.count}\n\n`);
  };

  sendVisitorCount(); // ส่งข้อมูลเริ่มต้น

  const interval = setInterval(sendVisitorCount, 1000); // อัปเดตทุก 1 วินาที

  req.on("close", () => {
    clearInterval(interval);
    res.end();
  });
});

export default router;