import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  fullname: { type: String, required: true },
  pictureUrl: { type: String },
  statusMessage: { type: String },
  email: { type: String },
  role: { type: String, enum: ["user", "admin"], default: "user" }, // เพิ่ม role
});

const User = mongoose.model("User", userSchema);

export default User;
