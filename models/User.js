import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  displayName: { type: String, required: false, default: "Anonymous" }, // Optional
  fullname: { type: String, required: false, default: "Anonymous" }, // Optional
  pictureUrl: { type: String, required: false }, // Optional
  statusMessage: { type: String, required: false }, // Optional
  email: { type: String, required: false }, // Optional, not unique
  role: { type: String, enum: ["user", "admin"], default: "user" },
  profileCompleted: { type: Boolean, default: false }, // Optional
});

const User = mongoose.model("User", userSchema);

export default User;