// backend/models/BlogModel.js
import mongoose from "mongoose";

const BlogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  imageUrl: { type: String, required: true },
});

const Blog = mongoose.model("Blog", BlogSchema);

export default Blog;
