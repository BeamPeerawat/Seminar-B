// services/lineAuthService.js

import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export const exchangeCodeForToken = async (code, state) => {
  const lineTokenUrl = "https://api.line.me/oauth2/v2.1/token";

  const data = {
    grant_type: "authorization_code",
    code: code,
    redirect_uri: process.env.LINE_REDIRECT_URI, // redirect_uri ที่ตั้งไว้ใน LINE Developers
    client_id: process.env.LINE_CLIENT_ID, // Channel ID ที่ได้จาก LINE Developer Console
    client_secret: process.env.LINE_CLIENT_SECRET, // Channel Secret ที่ได้จาก LINE Developer Console
  };

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  try {
    // ใช้ axios เพื่อส่งคำขอไปที่ LINE API
    const response = await axios.post(lineTokenUrl, new URLSearchParams(data), {
      headers,
    });
    console.log("Response data from LINE API:", response.data); // เพิ่มการตรวจสอบที่นี่

    const { access_token, refresh_token, id_token } = response.data;

    // ตรวจสอบการตอบกลับจาก LINE API
    if (!access_token) {
      throw new Error("No access token received from LINE API");
    }

    return { access_token, refresh_token, id_token };
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    // ให้ข้อมูลข้อผิดพลาดที่ชัดเจนขึ้น
    throw new Error(
      `Error exchanging code for token: ${
        error.response ? error.response.data.error_description : error.message
      }`
    );
  }
};
