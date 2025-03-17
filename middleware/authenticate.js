// import axios from "axios"; // ใช้ axios แทน jwt
// import User from "../models/User.js";
// import logger from "../utils/logger.js"; // นำเข้า logger เพื่อ log ข้อผิดพลาด

// const authenticate = async (req, res, next) => {
//   const token = req.headers.authorization?.split(" ")[1]; // ดึง token จาก header (Bearer <token>)

//   if (!token) {
//     return res.status(401).json({ message: "Unauthorized: No token provided" });
//   }

//   try {
//     // เรียก LINE API เพื่อตรวจสอบ token และดึงข้อมูลผู้ใช้
//     const response = await axios.get("https://api.line.me/v2/profile", {
//       headers: { Authorization: `Bearer ${token}` },
//     });

//     if (response.status !== 200) {
//       throw new Error("Invalid LINE token");
//     }

//     const { userId } = response.data; // ดึง userId จาก LINE API

//     // ตรวจสอบว่าผู้ใช้มีอยู่ใน User model หรือไม่
//     const user = await User.findOne({ userId }); // ใช้ userId เป็น String

//     if (!user) {
//       return res.status(401).json({ message: "User not found" });
//     }

//     // เก็บข้อมูลผู้ใช้ใน req.user (ใช้ userId จาก LINE)
//     req.user = { userId: user.userId }; // หรือเก็บข้อมูลเพิ่มเติมจาก User model
//     next();
//   } catch (error) {
//     logger.error("Error authenticating LINE token:", error.message);
//     res.status(401).json({ message: "Invalid token" });
//   }
// };

// export default authenticate;

import jwt from "jsonwebtoken"; // เปลี่ยนจาก axios เป็น jwt
import User from "../models/User.js";
import logger from "../utils/logger.js";

const authenticate = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    // ตรวจสอบ token ด้วย JWT secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { userId } = decoded; // ดึง userId จาก payload ของ token

    // ตรวจสอบว่าผู้ใช้มีอยู่ใน User model หรือไม่
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // เก็บข้อมูลผู้ใช้ใน req.user รวมถึง role และ profileCompleted
    req.user = {
      userId: user.userId,
      role: user.role || "user", // เพิ่ม role
      profileCompleted: user.profileCompleted || false, // เพิ่มสถานะโปรไฟล์
    };

    next();
  } catch (error) {
    logger.error("Error authenticating token:", error.message);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token has expired" });
    }
    res.status(401).json({ message: "Invalid token" });
  }
};

export default authenticate;