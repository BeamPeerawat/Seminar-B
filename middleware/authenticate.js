import axios from "axios";
import User from "../models/User.js";
import logger from "../utils/logger.js";

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // ดึง token จาก header (Bearer <token>)

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    // เรียก LINE API เพื่อตรวจสอบ token และดึงข้อมูลผู้ใช้
    const response = await axios.get("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status !== 200) {
      throw new Error("Invalid LINE token");
    }

    const { userId } = response.data; // ดึง userId จาก LINE API

    // ตรวจสอบว่าผู้ใช้มีอยู่ใน User model หรือไม่
    const user = await User.findOne({ userId }); // ใช้ userId เป็น String

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // เก็บข้อมูลผู้ใช้ใน req.user รวมถึง role
    req.user = { userId: user.userId, role: user.role }; // เพิ่ม role
    next();
  } catch (error) {
    logger.error("Error authenticating LINE token:", error.message);
    res.status(401).json({ message: "Invalid token" });
  }
};

export default authenticate;