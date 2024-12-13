const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema(
  {
    fullname: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [/.+@.+\..+/, "Please enter a valid email address"],
    },
    password: { type: String, required: true },
  },
  { timestamps: true } // เปิดใช้งาน timestamps
);

// เข้ารหัส Password ก่อนบันทึก
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // ตรวจสอบว่ารหัสผ่านมีการเปลี่ยนแปลงหรือไม่
  const saltRounds = 10;
  this.password = await bcrypt.hash(this.password, saltRounds);
  next();
});

module.exports = mongoose.model("User", UserSchema);
