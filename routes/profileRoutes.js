import express from "express";
import {
  checkProfile,
  saveProfile,
  getProfileFromDB,
} from "../controllers/profileController.js";
import { updateProfileCompleted } from "../controllers/authController.js";
import authenticate from "../middleware/authenticate.js"; // เปลี่ยนเป็น authenticate

const router = express.Router();

router.post("/check-profile", authenticate, checkProfile); // ใช้ middleware
router.post("/save-profile", authenticate, saveProfile); // ใช้ middleware
router.post("/get-profile-from-db", authenticate, getProfileFromDB); // ใช้ middleware
router.post("/update-profile-completed", authenticate, updateProfileCompleted); // ใช้ middleware

export default router;