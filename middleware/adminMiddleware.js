import logger from "../utils/logger.js";

export const adminMiddleware = async (req, res, next) => {
  try {
    const { userId, role } = req.user; // ดึง userId และ role จาก req.user (ที่ตั้งโดย authenticate)

    if (!userId || !role) {
      return res
        .status(401)
        .json({ success: false, error: "Unauthorized: Missing user data" });
    }

    if (role !== "admin") {
      return res
        .status(403)
        .json({ success: false, error: "Access denied: Admin only" });
    }

    next();
  } catch (error) {
    logger.error("Admin middleware error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
};
