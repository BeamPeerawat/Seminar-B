import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
  name: String,
  address: String,
  phone: String,
  email: {
    type: String,
    unique: true, // เพิ่มให้ email เป็น unique
  },
  userId: String,
});

const Profile = mongoose.model("Profile", profileSchema);

export default Profile;
