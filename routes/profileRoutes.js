import express from "express";
import {
  checkProfile,
  saveProfile,
  getProfileFromDB,
} from "../controllers/profileController.js"; // เพิ่มการนำเข้า getProfileFromDB
import { updateProfileCompleted } from "../controllers/authController.js"; // นำเข้า updateProfileCompleted จาก authController

const router = express.Router();

// เส้นทางหลักใน profileRoutes.js
router.post("/check-profile", checkProfile); // ตรวจสอบโปรไฟล์
router.post("/save-profile", saveProfile); // บันทึกโปรไฟล์
router.post("/get-profile-from-db", getProfileFromDB); // ดึงข้อมูลโปรไฟล์จากฐานข้อมูล
router.post("/update-profile-completed", updateProfileCompleted); // อัปเดตสถานะ profileCompleted

export default router;