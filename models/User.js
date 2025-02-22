import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // ใช้ userId เป็น unique identifier
  displayName: { type: String, required: false, default: "Anonymous" }, // Optional
  fullname: { type: String, required: false, default: "Anonymous" }, // Optional
  pictureUrl: { type: String, required: false }, // Optional
  statusMessage: { type: String, required: false }, // Optional
  role: { type: String, enum: ["user", "admin"], default: "user" }, // Default role เป็น "user"
  profileCompleted: { type: Boolean, default: false }, // ใช้เช็คว่าข้อมูลโปรไฟล์สมบูรณ์หรือไม่
  createdAt: { type: Date, default: Date.now }, // เพิ่ม timestamp
  updatedAt: { type: Date, default: Date.now }, // เพิ่ม timestamp
});

userSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const User = mongoose.model("User", userSchema);

export default User;