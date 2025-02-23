import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
  userId: { type: String, required: true, ref: "User" }, // ใช้ String จาก User model
  name: { type: String, required: false }, // Optional, ใช้จาก LINE หรือกรอกใน /complete-profile
  address: { type: String, required: false }, // Optional
  phone: { type: String, required: false }, // Optional
  email: { type: String, required: false }, // Optional, not unique
  profileCompleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }], // เก็บประวัติคำสั่งซื้อ
});

profileSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Profile = mongoose.model("Profile", profileSchema);

export default Profile;