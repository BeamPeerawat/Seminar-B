import express from "express";
import {
  checkProfile,
  saveProfile,
  getProfileFromDB,
} from "../controllers/profileController.js";
import { updateProfileCompleted } from "../controllers/authController.js";
import authenticate from "../middleware/authenticate.js"; // เพิ่ม
import { authMiddleware } from "../middleware/authMiddleware.js"; // เพิ่ม

const router = express.Router();

// เส้นทางหลักใน profileRoutes.js
router.post("/check-profile", checkProfile); // ตรวจสอบโปรไฟล์
router.post("/save-profile", authenticate, authMiddleware, saveProfile); // บันทึกโปรไฟล์
router.get("/get-profile-from-db", authenticate, authMiddleware, getProfileFromDB); // เปลี่ยนจาก post เป็น get และเพิ่ม middleware
router.post("/update-profile-completed", updateProfileCompleted); // อัปเดตสถานะ profileCompleted

export default router;