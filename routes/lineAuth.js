const express = require("express");
const axios = require("axios");
require("dotenv").config();

const router = express.Router();

const LINE_AUTH_URL = "https://access.line.me/oauth2/v2.1/authorize";
const LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const LINE_PROFILE_URL = "https://api.line.me/v2/profile";

// Channel ID และ Secret จาก LINE Developers Console
const CLIENT_ID = process.env.LINE_CLIENT_ID;
const CLIENT_SECRET = process.env.LINE_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3000/callback"; // แก้ไข URL ตามโปรเจกต์ของคุณ

// STEP 1: Redirect ผู้ใช้ไปยัง LINE Login
router.get("/line/login", (req, res) => {
  const loginURL = `${LINE_AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&state=randomstring&scope=profile%20openid%20email`;

  res.redirect(loginURL);
});

// STEP 2: รับ Callback และแลกเปลี่ยน Token
router.get("/callback", async (req, res) => {
  const { code } = req.query;

  try {
    // แลกเปลี่ยน Authorization Code เป็น Access Token
    const tokenResponse = await axios.post(
      LINE_TOKEN_URL,
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // ใช้ Access Token เพื่อดึงข้อมูลโปรไฟล์
    const profileResponse = await axios.get(LINE_PROFILE_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const profile = profileResponse.data;
    console.log("User Profile:", profile);

    // ส่งต่อข้อมูลผู้ใช้กลับไปแสดงผล
    res.json(profile);
  } catch (error) {
    console.error("LINE Login Error:", error);
    res.status(500).send("Login failed.");
  }
});

module.exports = router;
