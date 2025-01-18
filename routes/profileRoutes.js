import express from "express";
import { checkProfile, saveProfile } from "../controllers/profileController.js";

const router = express.Router();

// Route สำหรับตรวจสอบโปรไฟล์
router.post("/check-profile", checkProfile);

// Route สำหรับบันทึกโปรไฟล์
router.post("/save-profile", saveProfile);

export default router;
