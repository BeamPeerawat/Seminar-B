// middleware/authMiddleware.js
import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  // ดึง token จาก header
  const token = req.headers.authorization?.split(" ")[1];

  // ถ้าไม่มี token ส่งข้อความ "Unauthorized" กลับไป
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // ตรวจสอบ token และดึงข้อมูลผู้ใช้
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // เก็บข้อมูลผู้ใช้ใน req.user
    next(); // ไปยัง middleware หรือ route ถัดไป
  } catch (error) {
    // ถ้า token ไม่ถูกต้อง
    return res.status(401).json({ message: "Invalid token" });
  }
};