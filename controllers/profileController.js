import axios from "axios";
import Profile from "../models/Profile.js"; // นำเข้า Model Profile
import User from "../models/User.js"; // นำเข้า User model
import logger from "../utils/logger.js"; // เพิ่มบรรทัดนี้

// ดึงข้อมูลโปรไฟล์จาก LINE (ไม่เปลี่ยนแปลง)
export const getProfile = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token || typeof token !== "string") {
    return res.status(400).json({ message: "Invalid or missing token" });
  }

  try {
    const response = await axios.get("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status !== 200) {
      return res.status(response.status).json({
        message: `Failed to fetch profile: ${response.statusText}`,
      });
    }

    res.json({
      name: response.data.displayName,
      email: response.data.email,
      profilePicture: response.data.pictureUrl,
    });
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    logger.error("Error fetching profile:", errorMessage);
    res.status(500).json({
      message: "Failed to fetch profile",
      error: errorMessage,
    });
  }
};

// ตรวจสอบโปรไฟล์ว่ากรอกข้อมูลแล้วหรือยัง
export const checkProfile = async (req, res) => {
  try {
    const { userId } = req.user; // ดึงจาก token
    logger.debug("Checking profile for userId:", userId);

    const user = await User.findOne({ userId });
    if (!user) {
      // สร้างผู้ใช้ใหม่ถ้ายังไม่มี
      const newUser = new User({ userId, profileCompleted: false });
      await newUser.save();
      return res.json({ profileCompleted: false, role: newUser.role });
    }

    const profile = await Profile.findOne({ userId });
    const profileCompleted = profile ? profile.profileCompleted : false;

    res.json({ profileCompleted, role: user.role });
  } catch (error) {
    logger.error("Error checking profile:", error);
    res.status(500).json({ message: "Error checking profile", error: error.message });
  }
};

// บันทึกข้อมูลโปรไฟล์ (ใช้ Profile model กับ userId เป็น String)
export const saveProfile = async (req, res) => {
  try {
    const { userId } = req.user; // ดึงจาก token
    const { name, address, phone, email } = req.body;

    if (!userId || !name || !address || !phone) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (userId, Name, Address, or Phone)",
      });
    }

    logger.debug("Save profile request body:", req.body);

    let profile = await Profile.findOne({ userId });

    if (!profile) {
      profile = new Profile({
        userId,
        name,
        address,
        phone,
        email: email || null,
        profileCompleted: true,
      });
    } else {
      profile.name = name;
      profile.address = address;
      profile.phone = phone;
      profile.email = email || null;
      profile.profileCompleted = true;
    }

    await profile.save();
    logger.info("Profile saved or updated:", profile);

    const user = await User.findOne({ userId });
    if (user) {
      user.profileCompleted = true;
      user.updatedAt = Date.now();
      await user.save();
    }

    res.status(200).json({
      success: true,
      user: {
        userId,
        name,
        email: profile.email,
        profileCompleted: profile.profileCompleted,
      },
    });
  } catch (error) {
    logger.error("Error saving profile:", error);
    res.status(500).json({ success: false, message: "Failed to save profile", error: error.message });
  }
};

// อัปเดตสถานะ profileCompleted (ใช้ Profile model กับ userId เป็น String)
export const updateProfileCompleted = async (req, res) => {
  const { userId, profileCompleted } = req.body;

  try {
    const profile = await Profile.findOneAndUpdate(
      { userId }, // ใช้ userId เป็น String
      { profileCompleted, updatedAt: Date.now() }, // อัปเดต timestamp ด้วย
      { new: true, runValidators: true }
    );

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // อัปเดตสถานะใน User model ด้วย
    const user = await User.findOne({ userId });
    if (user) {
      user.profileCompleted = profileCompleted;
      user.updatedAt = Date.now();
      await user.save();
    }

    res.json({ message: "Profile status updated successfully", profile });
  } catch (error) {
    logger.error("Error updating profile completed status:", error);
    res.status(500).json({ error: "Failed to update profile status" });
  }
};

// ดึงข้อมูลโปรไฟล์จากฐานข้อมูล (ใช้ Profile model กับ userId เป็น String)
export const getProfileFromDB = async (req, res) => {
  const { userId } = req.body; // รับ userId จาก body

  if (!userId) {
    return res.status(400).json({ message: "Missing userId" });
  }

  try {
    // ค้นหาข้อมูลโปรไฟล์จาก Profile model ด้วย userId
    const profile = await Profile.findOne({ userId }); // ใช้ userId เป็น String

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // ส่งข้อมูลโปรไฟล์กลับไป
    res.json({
      name: profile.name,
      address: profile.address,
      phone: profile.phone,
      email: profile.email,
      profileCompleted: profile.profileCompleted,
    });
  } catch (error) {
    logger.error("Error fetching profile from database:", error.message);
    res.status(500).json({
      message: "Failed to fetch profile from database",
      error: error.message,
    });
  }
};