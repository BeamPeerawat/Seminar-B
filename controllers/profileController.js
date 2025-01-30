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
    console.error("Error fetching profile:", errorMessage);
    res.status(500).json({
      message: "Failed to fetch profile",
      error: errorMessage,
    });
  }
};

// ตรวจสอบโปรไฟล์ว่ากรอกข้อมูลแล้วหรือยัง
export const checkProfile = async (req, res) => {
  const { email, userId } = req.body; // เพิ่ม userId เข้ามา

  try {
    // ตรวจสอบข้อมูลโปรไฟล์ในฐานข้อมูลด้วย userId ก่อน
    console.log("Request body:", req.body); // Logging request body
    const profile = await Profile.findOne({
      $or: [
        ...(email ? [{ email }] : []), // เพิ่มเงื่อนไขเมื่อ email มีค่าเท่านั้น
        { userId },
      ],
    });
    console.log("Profile found:", profile);

    if (profile) {
      // ถ้าโปรไฟล์มีข้อมูลแล้ว
      return res.json({ profileCompleted: true });
    } else {
      // ถ้าโปรไฟล์ยังไม่มีข้อมูล
      return res.json({ profileCompleted: false });
    }
  } catch (error) {
    console.error("Error checking profile:", error);
    res.status(500).json({ message: "Error checking profile" });
  }
};

// บันทึกข้อมูลโปรไฟล์
export const saveProfile = async (req, res) => {
  try {
    const { name, address, phone, email, userId } = req.body; // ดึง userId จาก req.body

    if (!name || !address || !phone || !email || !userId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });
    }

    console.log("Save profile request body:", req.body);

    // ตรวจสอบว่ามีโปรไฟล์ของ userId นี้ในฐานข้อมูลหรือไม่
    const existingProfile = await Profile.findOne({ userId });

    if (existingProfile) {
      // ถ้ามีโปรไฟล์แล้ว -> อัปเดตข้อมูลแทน
      const updatedProfile = await Profile.findOneAndUpdate(
        { userId },
        { name, address, phone, email },
        { new: true }
      );

      console.log("Profile updated:", updatedProfile);

      return res.status(200).json({ success: true, user: updatedProfile });
    }

    // ถ้าไม่มีโปรไฟล์ -> สร้างใหม่
    const newProfile = new Profile({
      name,
      address,
      phone,
      email,
      userId, // บันทึก userId ลงในฐานข้อมูล
    });

    await newProfile.save();

    // อัปเดต `profileCompleted` ใน `User` model
    await User.findOneAndUpdate(
      { userId }, // ใช้ userId แทน email
      { profileCompleted: true },
      { new: true }
    );

    res.status(200).json({ success: true, user: newProfile });
  } catch (error) {
    console.error("Error saving profile:", error);
    res.status(500).json({ success: false, message: "Failed to save profile" });
  }
};

// ดึงข้อมูลโปรไฟล์จากฐานข้อมูล
export const getProfileFromDB = async (req, res) => {
  const { userId } = req.body; // รับ userId จาก body (หรืออาจจะใช้ req.userId ถ้าทำการ authenticate แล้ว)

  if (!userId) {
    return res.status(400).json({ message: "Missing userId" });
  }

  try {
    // ค้นหาข้อมูลโปรไฟล์จากฐานข้อมูลด้วย userId
    const profile = await Profile.findOne({ userId });

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // ส่งข้อมูลโปรไฟล์กลับไป
    res.json({
      name: profile.name,
      address: profile.address,
      phone: profile.phone,
      email: profile.email,
    });
  } catch (error) {
    console.error("Error fetching profile from database:", error.message);
    res.status(500).json({
      message: "Failed to fetch profile from database",
      error: error.message,
    });
  }
};
