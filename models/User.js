import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  displayName: { type: String, required: false, default: "Anonymous" }, // เปลี่ยนเป็น optional และใช้ default
  fullname: { type: String, required: false, default: "Anonymous" }, // เปลี่ยนเป็น optional และใช้ default
  pictureUrl: { type: String, required: false }, // Optional, can be null
  statusMessage: { type: String, required: false }, // Optional, can be null
  email: { type: String, required: false }, // Optional, not unique to avoid E11000
  role: { type: String, enum: ["user", "admin"], default: "user" },
  profileCompleted: { type: Boolean, default: false }, // เพิ่ม field สำหรับสถานะโปรไฟล์
});

const User = mongoose.model("User", userSchema);

export default User;