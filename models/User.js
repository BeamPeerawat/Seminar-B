import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // จาก LINE
  displayName: { type: String, required: false, default: "Anonymous" },
  fullname: { type: String, required: false, default: "Anonymous" },
  pictureUrl: { type: String, required: false },
  statusMessage: { type: String, required: false },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  profileCompleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

userSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const User = mongoose.model("User", userSchema);

export default User;
