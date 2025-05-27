import express from "express";
import Blog from "../models/BlogModel.js";
import { v2 as cloudinary } from "cloudinary";

const router = express.Router();

// ตั้งค่า Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// เพิ่ม Blog ใหม่
router.post("/add", async (req, res) => {
  try {
    const { title, description } = req.body;
    const imageFile = req.files?.image;

    if (!title || !description) {
      return res
        .status(400)
        .json({ message: "Title and description are required" });
    }

    let imageUrl = "";
    if (imageFile) {
      if (!imageFile.mimetype.startsWith("image/")) {
        return res.status(400).json({ message: "File must be an image" });
      }
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "blogs" },
          (error, result) => {
            if (error)
              reject(new Error("Cloudinary upload failed: " + error.message));
            resolve(result);
          }
        );
        uploadStream.end(imageFile.data);
      });
      imageUrl = result.secure_url;
    }

    const newBlog = new Blog({ title, description, imageUrl });
    await newBlog.save();
    res.status(201).json(newBlog);
  } catch (error) {
    console.error("Error adding blog:", error.message);
    res
      .status(500)
      .json({ message: "Error adding blog", error: error.message });
  }
});

// ดึงข้อมูล Blog ทั้งหมด
router.get("/", async (req, res) => {
  try {
    const blogs = await Blog.find();
    res.status(200).json(blogs);
  } catch (error) {
    console.error("Error fetching blogs:", error.message);
    res
      .status(500)
      .json({ message: "Error fetching blogs", error: error.message });
  }
});

// ดึงข้อมูล Blog ตาม ID
router.get("/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    res.status(200).json(blog);
  } catch (error) {
    console.error("Error fetching blog:", error.message);
    res
      .status(500)
      .json({ message: "Error fetching blog", error: error.message });
  }
});

// แก้ไข Blog
router.put("/:id", async (req, res) => {
  try {
    const { title, description } = req.body;
    const imageFile = req.files?.image;

    if (!title || !description) {
      return res
        .status(400)
        .json({ message: "Title and description are required" });
    }

    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    blog.title = title;
    blog.description = description;

    if (imageFile) {
      if (!imageFile.mimetype.startsWith("image/")) {
        return res.status(400).json({ message: "File must be an image" });
      }
      // ลบรูปภาพเก่าถ้ามี
      if (blog.imageUrl) {
        const publicId = blog.imageUrl.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`blogs/${publicId}`);
      }
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "blogs" },
          (error, result) => {
            if (error)
              reject(new Error("Cloudinary upload failed: " + error.message));
            resolve(result);
          }
        );
        uploadStream.end(imageFile.data);
      });
      blog.imageUrl = result.secure_url;
    }

    await blog.save();
    res.status(200).json(blog);
  } catch (error) {
    console.error("Error updating blog:", error.message);
    res
      .status(500)
      .json({ message: "Error updating blog", error: error.message });
  }
});

// ลบ Blog
router.delete("/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    if (blog.imageUrl) {
      const publicId = blog.imageUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`blogs/${publicId}`);
    }

    await Blog.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Blog deleted successfully" });
  } catch (error) {
    console.error("Error deleting blog:", error.message);
    res
      .status(500)
      .json({ message: "Error deleting blog", error: error.message });
  }
});

export default router;
