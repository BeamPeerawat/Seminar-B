// นำเข้าโมดูลที่จำเป็น
import { exchangeCodeForToken } from "../services/lineAuthService.js"; // ฟังก์ชันสำหรับแลก code เป็น token
import User from "../models/User.js"; // โมเดลของผู้ใช้
import Profile from "../models/Profile.js"; // โมเดลโปรไฟล์ผู้ใช้
import logger from "../utils/logger.js"; // เครื่องมือสำหรับ log ข้อความ
import fetch from "node-fetch"; // ใช้สำหรับเรียก API ภายนอก

// ฟังก์ชันสำหรับแลก code ที่ได้จาก LINE login เป็น access token และจัดการบัญชีผู้ใช้
export const exchangeCode = async (req, res) => {
  const { code, state } = req.body;

  // ตรวจสอบความถูกต้องของข้อมูลที่ส่งเข้ามา
  if (
    !code ||
    typeof code !== "string" ||
    !state ||
    typeof state !== "string"
  ) {
    return res.status(400).json({ error: "Invalid code or state" }); // ส่ง error ถ้าข้อมูลไม่ถูกต้อง
  }

  try {
    // ใช้ code แลก access token จาก LINE API
    const tokens = await exchangeCodeForToken(code, state);

    // ตรวจสอบว่าได้ access token มาหรือไม่
    if (!tokens.access_token) {
      return res
        .status(400)
        .json({ error: "No access token received from LINE API" });
    }

    // เรียกดูโปรไฟล์ของผู้ใช้จาก LINE API โดยใช้ access token
    const lineProfileResponse = await fetch(
      process.env.LINE_PROFILE_URL || "https://api.line.me/v2/profile",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokens.access_token}`, // แนบ token ใน header
        },
      }
    );

    // ตรวจสอบว่าเรียกโปรไฟล์สำเร็จหรือไม่
    if (!lineProfileResponse.ok) {
      const errorDetail = await lineProfileResponse.json();
      throw new Error(
        `Failed to fetch user profile: ${
          errorDetail.message || "Unknown error"
        }`
      );
    }

    const userProfile = await lineProfileResponse.json(); // แปลงผลลัพธ์เป็น JSON

    // log ข้อมูลโปรไฟล์จาก LINE เพื่อดูค่าในการ debug
    logger.debug("LINE User Profile:", userProfile);

    // ค้นหาว่าผู้ใช้มีอยู่ในฐานข้อมูลหรือยัง โดยดูจาก userId ที่ได้จาก LINE
    let existingUser = await User.findOne({ userId: userProfile.userId });

    if (!existingUser) {
      // ถ้าไม่มีผู้ใช้อยู่ สร้างผู้ใช้ใหม่
      const newUser = new User({
        userId: userProfile.userId,
        displayName: userProfile.displayName || "Anonymous",
        fullname: userProfile.displayName || "Anonymous",
        pictureUrl: userProfile.pictureUrl,
        statusMessage: userProfile.statusMessage,
        role: "user",
        profileCompleted: false, // เริ่มต้นเป็น false
      });

      // บันทึกผู้ใช้ใหม่ลงฐานข้อมูล
      await newUser.save();
      logger.info("New user created:", newUser);

      existingUser = newUser; // ตั้งค่าผู้ใช้นี้เป็น existingUser
    } else {
      // ถ้ามีผู้ใช้อยู่แล้ว ตรวจสอบข้อมูล profileCompleted จาก collection Profile
      const profile = await Profile.findOne({ userId: existingUser.userId });
      existingUser.profileCompleted = profile
        ? profile.profileCompleted
        : false;
      await existingUser.save(); // อัปเดตสถานะ profileCompleted
      logger.info(
        "User already exists, updated profileCompleted:",
        existingUser
      );
    }

    // ส่ง response กลับไปพร้อม accessToken และข้อมูลผู้ใช้
    res.json({
      message: "Login successful",
      accessToken: tokens.access_token,
      user: {
        userId: existingUser.userId,
        displayName: existingUser.displayName,
        pictureUrl: existingUser.pictureUrl,
        statusMessage: existingUser.statusMessage,
        role: existingUser.role,
        profileCompleted: existingUser.profileCompleted,
        profile: await Profile.findOne({ userId: existingUser.userId }), // ดึงข้อมูลโปรไฟล์มาแสดงด้วย
      },
    });
  } catch (error) {
    // จัดการ error และ log ข้อความ
    logger.error("Error exchanging code for token:", error);
    res.status(500).json({
      error: error.message || "Failed to exchange code for token",
    });
  }
};

// ฟังก์ชันสำหรับอัปเดตสถานะ profileCompleted ของผู้ใช้
export const updateProfileCompleted = async (req, res) => {
  const { userId, profileCompleted } = req.body;

  try {
    // อัปเดตสถานะในฐานข้อมูลจาก userId ที่ส่งเข้ามา
    const user = await User.findOneAndUpdate(
      { userId },
      { profileCompleted, updatedAt: Date.now() }, // อัปเดต profileCompleted และเวลา
      { new: true, runValidators: true } // คืนค่าข้อมูลใหม่ที่ถูกอัปเดต
    );

    // ถ้าไม่พบผู้ใช้
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // ส่งผลลัพธ์กลับ
    res.json({ message: "Profile status updated successfully", user });
  } catch (error) {
    logger.error("Error updating profile completed status:", error);
    res.status(500).json({ error: "Failed to update profile status" });
  }
};
