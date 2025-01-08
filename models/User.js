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

// สร้าง Schema สำหรับผู้ใช้
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  fullname: { type: String, required: true, default: "Anonymous" }, // เพิ่มการตั้งค่าหากเป็น null
  pictureUrl: String,
  statusMessage: String,
  email: String,
});

// สร้าง Model ที่ชื่อ "User" จาก Schema
const User = mongoose.model("User", userSchema);

export default User;
