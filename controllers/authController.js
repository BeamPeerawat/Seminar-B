import { exchangeCodeForToken } from "../services/lineAuthService.js";
import User from "../models/User.js"; // นำเข้า User model เพื่อบันทึกข้อมูลผู้ใช้

export const exchangeCode = async (req, res) => {
  const { code, state } = req.body;

  // ตรวจสอบว่า code และ state ถูกส่งมาหรือไม่
  if (!code || !state) {
    return res.status(400).json({ error: "Code and state are required" });
  }

  try {
    // เรียกใช้ exchangeCodeForToken เพื่อแลก code เป็น tokens
    const tokens = await exchangeCodeForToken(code, state);

    // ตรวจสอบว่ามี access_token หรือไม่
    if (!tokens.access_token) {
      return res
        .status(400)
        .json({ error: "No access token received from LINE API" });
    }

    // ดึงข้อมูลผู้ใช้จาก LINE API ด้วย access_token
    const lineProfileResponse = await fetch("https://api.line.me/v2/profile", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!lineProfileResponse.ok) {
      throw new Error("Failed to fetch user profile from LINE");
    }

    const userProfile = await lineProfileResponse.json();

    // ตรวจสอบว่าผู้ใช้มีอยู่ในฐานข้อมูลหรือไม่
    let existingUser = await User.findOne({ userId: userProfile.userId });

    if (!existingUser) {
      // ถ้ายังไม่มีผู้ใช้ในฐานข้อมูล ให้สร้างผู้ใช้ใหม่
      const newUser = new User({
        userId: userProfile.userId,
        displayName: userProfile.displayName || "Anonymous", // ใช้ displayName ถ้ามี หรือใช้ 'Anonymous'
        fullname: userProfile.displayName || "Anonymous", // เพิ่ม fullname ถ้าไม่มีให้ใช้ 'Anonymous'
        pictureUrl: userProfile.pictureUrl,
        statusMessage: userProfile.statusMessage,
        email: userProfile.email || "",
      });

      // บันทึกข้อมูลผู้ใช้ลง MongoDB
      await newUser.save();
      console.log("New user created:", newUser);
      existingUser = newUser; // เพื่อใช้ข้อมูลของผู้ใช้ในขั้นตอนถัดไป
    } else {
      console.log("User already exists:", existingUser);
    }

    // ส่งข้อมูลของ tokens และข้อมูลผู้ใช้กลับไปที่ Client
    res.json({
      message: "Login successful",
      accessToken: tokens.access_token, // ใช้ access_token ที่ได้จากการแลกเปลี่ยน
      refreshToken: tokens.refresh_token, // ใช้ refresh_token ที่ได้จากการแลกเปลี่ยน
      idToken: tokens.id_token, // ใช้ id_token ที่ได้จากการแลกเปลี่ยน
      user: existingUser, // ข้อมูลผู้ใช้
    });
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    res.status(500).json({
      error: error.message || "Failed to exchange code for token",
    });
  }
};
