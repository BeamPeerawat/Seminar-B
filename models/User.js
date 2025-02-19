import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // ใช้ userId ตามเดิม
  displayName: { type: String, required: true },
  fullname: { type: String, required: true },
  pictureUrl: { type: String },
  statusMessage: { type: String },
  email: { type: String },
  address: { type: String }, // เพิ่ม address สำหรับการจัดส่ง
  phone: { type: String }, // เพิ่ม phone สำหรับติดต่อ
  role: { type: String, enum: ["user", "admin"], default: "user" }, // role สำหรับสิทธิ์การเข้าถึง
  createdAt: { type: Date, default: Date.now }, // เพิ่ม createdAt
});

const User = mongoose.model("User", userSchema);

export default User;