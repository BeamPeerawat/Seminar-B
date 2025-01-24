import express from "express";
import {
  checkProfile,
  saveProfile,
  getProfileFromDB,
} from "../controllers/profileController.js"; // เพิ่มการนำเข้า getProfileFromDB

const router = express.Router();

// เส้นทางหลักใน profileRoutes.js
router.post("/check-profile", checkProfile); // ตรวจสอบโปรไฟล์
router.post("/save-profile", saveProfile); // บันทึกโปรไฟล์
router.post("/get-profile-from-db", getProfileFromDB); // ดึงข้อมูลโปรไฟล์จากฐานข้อมูล

export default router;
