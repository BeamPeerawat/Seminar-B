import axios from "axios";
import Profile from "../models/Profile.js"; // นำเข้า Model ใหม่
import User from "../models/User.js"; // เพิ่มการนำเข้า User model
import logger from "../utils/logger.js"; // เพิ่มบรรทัดนี้

// ดึงข้อมูลโปรไฟล์จาก LINE
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
  const { email, userId } = req.body; // ใช้ userId เป็นหลัก

  try {
    logger.debug("Request body for checkProfile:", req.body); // Logging request body
    const user = await User.findOne({ userId }); // ใช้ User model แทน Profile

    if (user) {
      return res.json({ profileCompleted: user.profileCompleted });
    } else {
      return res.json({ profileCompleted: false });
    }
  } catch (error) {
    logger.error("Error checking profile:", error);
    res.status(500).json({ message: "Error checking profile" });
  }
};

// บันทึกข้อมูลโปรไฟล์
export const saveProfile = async (req, res) => {
  try {
    const { name, address, phone, email, userId } = req.body; // ดึง userId จาก req.body

    if (!userId || !name || !address || !phone) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (userId, Name, Address, or Phone)",
      });
    }

    logger.debug("Save profile request body:", req.body);

    // ตรวจสอบว่ามีโปรไฟล์ของ userId นี้ในฐานข้อมูล User หรือไม่
    const existingUser = await User.findOne({ userId });

    if (existingUser) {
      // ถ้ามีผู้ใช้แล้ว -> อัปเดตข้อมูลใน User model
      existingUser.displayName = name; // อัปเดต displayName
      existingUser.fullname = name; // อัปเดต fullname
      existingUser.email = email || null; // อนุญาตให้ email เป็น null
      existingUser.address = address; // เพิ่ม field address
      existingUser.phone = phone; // เพิ่ม field phone
      existingUser.profileCompleted = true; // ตั้งค่าเป็น true หลังจากบันทึกข้อมูลครบ
      existingUser.updatedAt = Date.now(); // อัปเดต timestamp

      await existingUser.save();
      logger.info("User profile updated:", existingUser);

      return res.status(200).json({
        success: true,
        user: {
          userId: existingUser.userId,
          displayName: existingUser.displayName,
          email: existingUser.email,
          profileCompleted: existingUser.profileCompleted,
        },
      });
    }

    // ถ้าไม่มีผู้ใช้ -> สร้างใหม่ใน User model (ไม่ใช้ Profile model)
    const newUser = new User({
      userId,
      displayName: name,
      fullname: name,
      email: email || null, // อนุญาตให้ email เป็น null
      address, // เพิ่ม field address
      phone, // เพิ่ม field phone
      role: "user",
      profileCompleted: true, // ตั้งค่าเป็น true หลังจากบันทึกข้อมูลครบ
    });

    await newUser.save();
    logger.info("New user profile created:", newUser);

    res.status(200).json({
      success: true,
      user: {
        userId: newUser.userId,
        displayName: newUser.displayName,
        email: newUser.email,
        profileCompleted: newUser.profileCompleted,
      },
    });
  } catch (error) {
    logger.error("Error saving profile:", error);
    res.status(500).json({ success: false, message: "Failed to save profile" });
  }
};

// อัปเดตสถานะ profileCompleted
export const updateProfileCompleted = async (req, res) => {
  const { userId, profileCompleted } = req.body;

  try {
    const user = await User.findOneAndUpdate(
      { userId },
      { profileCompleted, updatedAt: Date.now() }, // อัปเดต timestamp ด้วย
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "Profile status updated successfully", user });
  } catch (error) {
    logger.error("Error updating profile completed status:", error);
    res.status(500).json({ error: "Failed to update profile status" });
  }
};

// ดึงข้อมูลโปรไฟล์จากฐานข้อมูล
export const getProfileFromDB = async (req, res) => {
  const { userId } = req.body; // รับ userId จาก body

  if (!userId) {
    return res.status(400).json({ message: "Missing userId" });
  }

  try {
    // ค้นหาข้อมูลโปรไฟล์จาก User model ด้วย userId
    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // ส่งข้อมูลโปรไฟล์กลับไป
    res.json({
      name: user.displayName,
      address: user.address,
      phone: user.phone,
      email: user.email,
      profileCompleted: user.profileCompleted,
    });
  } catch (error) {
    logger.error("Error fetching profile from database:", error.message);
    res.status(500).json({
      message: "Failed to fetch profile from database",
      error: error.message,
    });
  }
};