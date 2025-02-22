import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
  name: { type: String, required: true }, // ต้องมีชื่อ
  address: { type: String, required: true }, // ต้องมีที่อยู่
  phone: { type: String, required: true }, // ต้องมีเบอร์โทร
  email: { type: String, required: false }, // Optional, not unique (รองรับ null และซ้ำ)
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" }, // ใช้ ObjectId และอ้างอิงถึง User model
  profileCompleted: { type: Boolean, default: false }, // เพิ่ม field เพื่อบ่งบอกว่าข้อมูลสมบูรณ์หรือไม่
  createdAt: { type: Date, default: Date.now }, // เพิ่ม timestamp
  updatedAt: { type: Date, default: Date.now }, // เพิ่ม timestamp
});

profileSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Profile = mongoose.model("Profile", profileSchema);

export default Profile;