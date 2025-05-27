import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
  userId: { type: String, required: true, ref: "User" },
  name: { type: String, required: false },
  address: { type: String, required: false }, // ฟิลด์เดิม เก็บไว้เผื่อใช้เป็นที่อยู่หลัก
  phone: { type: String, required: false },
  email: { type: String, required: false },
  profileCompleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
  addresses: [
    {
      name: { type: String, required: true }, // ชื่อผู้รับ
      address: { type: String, required: true }, // ที่อยู่
      phone: { type: String, required: true }, // เบอร์โทร
      isDefault: { type: Boolean, default: false }, // ที่อยู่เริ่มต้น
      createdAt: { type: Date, default: Date.now },
    },
  ],
});

profileSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Profile = mongoose.model("Profile", profileSchema);

export default Profile;