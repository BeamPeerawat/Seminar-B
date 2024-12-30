// routes/users.js
import express from "express";
import dbConnect from "../lib/dbConnect"; // การเชื่อมต่อกับฐานข้อมูล
import User from "../models/User"; // โมเดล User

const router = express.Router();

// ดึงข้อมูลผู้ใช้ทั้งหมดจากฐานข้อมูล
router.get("/users", async (req, res) => {
  try {
    await dbConnect(); // เชื่อมต่อกับ MongoDB
    const users = await User.find({}, "fullname email"); // ดึงข้อมูล fullname และ email
    res.status(200).json(users); // ส่งข้อมูลกลับ
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Error fetching users" });
  }
});

export default router; // ส่ง router กลับไปใช้งานใน server.js
