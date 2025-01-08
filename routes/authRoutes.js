// // routes/authRoutes.js
// import express from "express";
// import fetch from "node-fetch";

// const router = express.Router();

// router.post("/exchange-code", async (req, res) => {
//   const { code, state } = req.body;

//   if (!code || !state) {
//     return res.status(400).json({ error: "Missing code or state" });
//   }

//   const data = new URLSearchParams();
//   data.append("grant_type", "authorization_code");
//   data.append("code", code);
//   data.append("redirect_uri", "http://localhost:3000/callback");
//   data.append("client_id", process.env.LINE_CLIENT_ID);
//   data.append("client_secret", process.env.LINE_CLIENT_SECRET);

//   try {
//     const response = await fetch("https://api.line.me/oauth2/v2.1/token", {
//       method: "POST",
//       body: data,
//     });

//     if (!response.ok) {
//       return res.status(400).json({ error: "Failed to exchange code" });
//     }

//     const tokenData = await response.json();
//     res.json({ accessToken: tokenData.access_token });
//   } catch (error) {
//     console.error("Line API error:", error);
//     res.status(500).json({ error: "Server error" });
//   }
// });

// export default router;

import express from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import qs from "querystring"; // เพิ่มการใช้ querystring

const router = express.Router();

// สร้าง URL สำหรับล็อกอิน
router.get("/login", (req, res) => {
  const { LINE_CLIENT_ID, LINE_REDIRECT_URI } = process.env;
  const lineLoginUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${LINE_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    LINE_REDIRECT_URI
  )}&state=random_state&scope=profile%20openid%20email`;
  res.redirect(lineLoginUrl);
});

// Callback เมื่อผู้ใช้ล็อกอินสำเร็จ
router.get("/callback", async (req, res) => {
  const { code } = req.query;
  const { LINE_CLIENT_ID, LINE_CLIENT_SECRET, LINE_REDIRECT_URI, JWT_SECRET } =
    process.env;

  if (!code) {
    return res.status(400).json({ message: "Code is missing" });
  }

  try {
    // แลกเปลี่ยน code เป็น access_token
    const tokenResponse = await axios.post(
      "https://api.line.me/oauth2/v2.1/token",
      qs.stringify({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: LINE_REDIRECT_URI,
        client_id: LINE_CLIENT_ID,
        client_secret: LINE_CLIENT_SECRET,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    // ตรวจสอบการตอบกลับจาก LINE API ว่ามี access_token หรือไม่
    if (!tokenResponse.data.access_token) {
      console.error("No access token received", tokenResponse.data);
      throw new Error("No access token received");
    }

    const accessToken = tokenResponse.data.access_token;

    // ดึงข้อมูลผู้ใช้จาก LINE
    const profileResponse = await axios.get("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const { userId, displayName, pictureUrl } = profileResponse.data;

    // ตรวจสอบว่าผู้ใช้มีอยู่ในระบบหรือยัง
    let user = await User.findOne({ lineUserId: userId });

    if (!user) {
      user = await User.create({
        lineUserId: userId,
        displayName,
        pictureUrl,
      });
    }

    // สร้าง JWT Token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1h" });

    // ส่ง Token และข้อมูลผู้ใช้กลับไป
    res.cookie("authToken", token, { httpOnly: true });
    res.json({ message: "Login successful", token, user });
  } catch (error) {
    console.error("Error during callback:", error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
});

export default router;
