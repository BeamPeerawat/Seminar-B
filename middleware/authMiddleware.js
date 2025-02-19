// middleware/authMiddleware.js
export const verifyToken = (req, res, next) => {
  // ตรวจสอบ Token จาก header หรือ request
  const token = req.headers["authorization"];
  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }

  try {
    // ตรวจสอบ token เช่นกับ JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // ใช้ JWT เพื่อ decode
    req.user = decoded; // เก็บข้อมูลของ user ที่ได้จาก token
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
