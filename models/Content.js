import mongoose from "mongoose";

const contentSchema = new mongoose.Schema({
  title: String,
  description: String,
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("Content", contentSchema);
