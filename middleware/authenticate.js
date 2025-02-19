import jwt from "jsonwebtoken";
import User from "../models/User.js";

const authenticate = async (req, res, next) => {
  // ดึง Token จาก Cookies หรือ Authorization Header
  const token =
    req.cookies.authToken || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
  }

  try {
    // ตรวจสอบ Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ค้นหาผู้ใช้จากฐานข้อมูล
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized: User not found" });
    }

    // เพิ่มข้อมูลผู้ใช้ใน Request Object
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Unauthorized: Invalid token" });
  }
};

export default authenticate;