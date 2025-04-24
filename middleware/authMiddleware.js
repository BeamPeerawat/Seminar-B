export const authMiddleware = (req, res, next) => {
  if (!req.user || !req.user.userId) { // ตรวจสอบว่า req.user และ userId มีค่า
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};