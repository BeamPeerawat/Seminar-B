import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // ใช้ userId เป็น unique identifier
  displayName: { type: String, required: false, default: "Anonymous" }, // Optional, default เป็น "Anonymous"
  fullname: { type: String, required: false, default: "Anonymous" }, // Optional, default เป็น "Anonymous"
  pictureUrl: { type: String, required: false }, // Optional
  statusMessage: { type: String, required: false }, // Optional
  email: { type: String, required: false }, // Optional, not unique (รองรับ null และซ้ำ)
  role: { type: String, enum: ["user", "admin"], default: "user" }, // Default role เป็น "user"
  profileCompleted: { type: Boolean, default: false }, // ใช้เช็คว่าข้อมูลโปรไฟล์สมบูรณ์หรือไม่
  createdAt: { type: Date, default: Date.now }, // เพิ่ม timestamp เพื่อติดตามการสร้างผู้ใช้
  updatedAt: { type: Date, default: Date.now }, // เพิ่ม timestamp เพื่อติดตามการอัปเดต
});

userSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const User = mongoose.model("User", userSchema);

export default User;