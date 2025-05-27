import express from "express";
import {
  checkProfile,
  saveProfile,
  getProfileFromDB,
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
} from "../controllers/profileController.js";
import { updateProfileCompleted } from "../controllers/authController.js";

const router = express.Router();

router.post("/check-profile", checkProfile);
router.post("/save-profile", saveProfile);
router.post("/get-profile-from-db", getProfileFromDB);
router.post("/update-profile-completed", updateProfileCompleted);
router.post("/add-address", addAddress); // เพิ่มที่อยู่ใหม่
router.post("/get-addresses", getAddresses); // ดึงรายการที่อยู่
router.put("/update-address/:addressId", updateAddress); // อัปเดตที่อยู่
router.delete("/delete-address/:addressId", deleteAddress); // ลบที่อยู่

export default router;