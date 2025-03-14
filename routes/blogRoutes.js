// backend/routes/blogRoutes.js
import express from "express";
import Blog from "../models/BlogModel.js";
const router = express.Router(); // เพิ่มบรรทัดนี้เพื่อกำหนด router

// เพิ่ม Blog ใหม่
router.post("/add", async (req, res) => {
  try {
    const { title, description, imageUrl } = req.body;
    const newBlog = new Blog({ title, description, imageUrl });
    await newBlog.save();
    res.status(201).json(newBlog);
  } catch (error) {
    res.status(500).json({ message: "Error adding blog", error });
  }
});

// ดึงข้อมูล Blog ทั้งหมด
router.get("/", async (req, res) => {
  try {
    const blogs = await Blog.find();
    if (!blogs) {
      return res.status(404).json({ message: "No blogs found" });
    }
    res.status(200).json(blogs);
  } catch (error) {
    logger.error("Error fetching blogs:", error); // ใช้ logger
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// แก้ไข Blog
router.put("/:id", async (req, res) => {
  try {
    const { title, description, imageUrl } = req.body;
    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      { title, description, imageUrl },
      { new: true }
    );
    res.status(200).json(updatedBlog);
  } catch (error) {
    res.status(500).json({ message: "Error updating blog", error });
  }
});

// ลบ Blog
router.delete("/:id", async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting blog", error });
  }
});

export default router;
