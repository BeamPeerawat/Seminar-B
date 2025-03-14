// // middleware/authMiddleware.js
// export const authMiddleware = (req, res, next) => {
//   if (!req.user || !req.user.userId) { // ตรวจสอบว่า req.user และ userId มีค่า
//     return res.status(401).json({ message: "Unauthorized" });
//   }
//   next();
// };
export const authMiddleware = async (req, res, next) => {
  const user = await User.findById(req.userId); // สมมติว่า req.userId มาจาก token
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};