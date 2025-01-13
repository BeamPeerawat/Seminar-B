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

    console.log("Response data from LINE API:", response.data); // ตรวจสอบคำตอบที่ได้รับจาก LINE API

    const { access_token, refresh_token, id_token } = response.data;

    // ตรวจสอบการตอบกลับจาก LINE API
    if (!access_token) {
      throw new Error("No access token received from LINE API");
    }

    return { access_token, refresh_token, id_token };
  } catch (error) {
    console.error("Error exchanging code for token:", error);

    // ถ้าข้อผิดพลาดเกิดจากการตอบกลับจาก LINE API
    if (error.response) {
      const { error_description, error } = error.response.data;
      console.error("Error response from LINE API:", error_description);
      throw new Error(`Error from LINE API: ${error_description || error}`);
    }

    // ถ้าไม่ใช่ข้อผิดพลาดจากการตอบกลับ (เช่นไม่สามารถเชื่อมต่อกับ API)
    throw new Error(`Error exchanging code for token: ${error.message}`);
  }
};
