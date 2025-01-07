// const mongoose = require("mongoose");
// const bcrypt = require("bcryptjs");

// const UserSchema = new mongoose.Schema(
//   {
//     fullname: { type: String, required: true },
//     email: {
//       type: String,
//       required: true,
//       unique: true,
//       match: [/.+@.+\..+/, "Please enter a valid email address"],
//     },
//     password: { type: String, required: true },
//   },
//   { timestamps: true } // เปิดใช้งาน timestamps
// );

// // เข้ารหัส Password ก่อนบันทึก
// UserSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next(); // ตรวจสอบว่ารหัสผ่านมีการเปลี่ยนแปลงหรือไม่
//   const saltRounds = 10;
//   this.password = await bcrypt.hash(this.password, saltRounds);
//   next();
// });

// module.exports = mongoose.model("User", UserSchema);

import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  lineId: { type: String, required: true, unique: true }, // lineId สำหรับการล็อกอิน
  name: { type: String, required: true }, // ชื่อ
  phone: { type: String, required: false }, // เปลี่ยนเป็นไม่จำเป็น
  address: { type: String, required: false }, // เปลี่ยนเป็นไม่จำเป็น
  email: { type: String }, // อีเมล์ (สามารถเป็น null ได้)
  isProfileComplete: { type: Boolean, default: false }, // เช็คสถานะว่าโปรไฟล์สมบูรณ์หรือยัง
});

const User = mongoose.model("User", userSchema);
export default User;
