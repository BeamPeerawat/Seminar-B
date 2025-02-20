import mongoose from "mongoose";
import { exchangeCodeForToken } from "../services/lineAuthService.js";
import User from "../models/User.js"; // Import User model
import logger from "../utils/logger.js";
import fetch from "node-fetch";
import jwt from "jsonwebtoken"; // เพิ่มการนำเข้า jwt

export const exchangeCode = async (req, res) => {
  const { code, state } = req.body;

  // Validate input
  if (!code || typeof code !== "string" || !state || typeof state !== "string") {
    return res.status(400).json({ error: "Invalid code or state" });
  }

  try {
    // Step 1: แลก Code เป็น Token กับ LINE
    const tokens = await exchangeCodeForToken(code, state);
    if (!tokens.access_token) {
      return res.status(400).json({ error: "No access token received from LINE API" });
    }

    // Step 2: ดึงข้อมูลโปรไฟล์จาก LINE API
    const lineProfileResponse = await fetch(
      process.env.LINE_PROFILE_URL || "https://api.line.me/v2/profile",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    if (!lineProfileResponse.ok) {
      const errorDetail = await lineProfileResponse.json();
      throw new Error(`Failed to fetch user profile: ${errorDetail.message || "Unknown error"}`);
    }

    const userProfile = await lineProfileResponse.json();

    // Step 3: ตรวจสอบว่าผู้ใช้มีอยู่ในฐานข้อมูลหรือไม่
    let existingUser = await User.findOne({ userId: userProfile.userId });

    if (!existingUser) {
      // หากไม่มีผู้ใช้ในฐานข้อมูล สร้างผู้ใช้ใหม่
      let email = userProfile.email;

      // หาก email เป็น null กำหนดให้เป็นค่า default
      if (!email) {
        email = "default@example.com"; // หรือกำหนดเป็นค่า default อื่นๆ
      }

      const newUser = new User({
        userId: userProfile.userId,
        displayName: userProfile.displayName || "Anonymous",
        fullname: userProfile.displayName || "Anonymous",
        pictureUrl: userProfile.pictureUrl,
        statusMessage: userProfile.statusMessage,
        email, // Ensure email is never null
        role: "user", // Default role as 'user'
        profileCompleted: false, // ค่าเริ่มต้นเมื่อผู้ใช้ยังไม่ได้กรอกข้อมูลครบถ้วน
      });

      // บันทึกผู้ใช้ใหม่ในฐานข้อมูล
      await newUser.save();
      logger.info("New user created:", newUser);

      existingUser = newUser;
    } else {
      logger.info("User already exists:", existingUser);
    }

    // Step 4: สร้าง JWT Token
    const token = jwt.sign(
      { userId: existingUser._id }, // ใช้ _id จาก MongoDB
      process.env.JWT_SECRET, // ใช้ JWT_SECRET จาก .env
      { expiresIn: "1d" } // กำหนดอายุ Token
    );

    // Step 5: ส่งข้อมูลกลับ
    res.json({
      message: "Login successful",
      accessToken: tokens.access_token, // Token จาก LINE
      jwtToken: token, // Token ที่สร้างจาก JWT
      user: {
        userId: existingUser.userId,
        displayName: existingUser.displayName,
        pictureUrl: existingUser.pictureUrl,
        statusMessage: existingUser.statusMessage,
        role: existingUser.role,
        profileCompleted: existingUser.profileCompleted,
      },
    });
  } catch (error) {
    logger.error("Error exchanging code for token:", error);
    res.status(500).json({
      error: error.message || "Failed to exchange code for token",
    });
  }
};
