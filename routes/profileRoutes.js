import express from "express";
import {
  checkProfile,
  saveProfile,
  getProfileFromDB,
} from "../controllers/profileController.js";
import { updateProfileCompleted } from "../controllers/authController.js";
import { authenticateToken } from "../middleware/authenticate.js"; // เพิ่มการนำเข้า

const router = express.Router();

router.post("/check-profile", authenticateToken, checkProfile); // ใช้ middleware
router.post("/save-profile", authenticateToken, saveProfile); // ใช้ middleware
router.post("/get-profile-from-db", authenticateToken, getProfileFromDB); // ใช้ middleware
router.post("/update-profile-completed", authenticateToken, updateProfileCompleted); // ใช้ middleware

export default router;