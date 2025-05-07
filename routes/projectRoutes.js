import express from "express";
import Project from "../models/ProjectModel.js";
import { v2 as cloudinary } from "cloudinary";

const router = express.Router();

// ตั้งค่า Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// เพิ่ม Project ใหม่
router.post("/add", async (req, res) => {
  try {
    const { title, description } = req.body;
    const imageFile = req.files?.image;

    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    let imageUrl = "";
    if (imageFile) {
      if (!imageFile.mimetype.startsWith("image/")) {
        return res.status(400).json({ message: "File must be an image" });
      }
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "projects" },
          (error, result) => {
            if (error) reject(new Error("Cloudinary upload failed: " + error.message));
            resolve(result);
          }
        );
        uploadStream.end(imageFile.data);
      });
      imageUrl = result.secure_url;
    }

    const newProject = new Project({ title, description, imageUrl });
    await newProject.save();
    res.status(201).json(newProject);
  } catch (error) {
    console.error("Error adding project:", error.message);
    res.status(500).json({ message: "Error adding project", error: error.message });
  }
});

// ดึงข้อมูล Project ทั้งหมด
router.get("/", async (req, res) => {
  try {
    const projects = await Project.find();
    res.status(200).json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error.message);
    res.status(500).json({ message: "Error fetching projects", error: error.message });
  }
});

// แก้ไข Project
router.put("/:id", async (req, res) => {
  try {
    const { title, description } = req.body;
    const imageFile = req.files?.image;

    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.title = title;
    project.description = description;

    if (imageFile) {
      if (!imageFile.mimetype.startsWith("image/")) {
        return res.status(400).json({ message: "File must be an image" });
      }
      // ลบรูปภาพเก่าถ้ามี
      if (project.imageUrl) {
        const publicId = project.imageUrl.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`projects/${publicId}`);
      }
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "projects" },
          (error, result) => {
            if (error) reject(new Error("Cloudinary upload failed: " + error.message));
            resolve(result);
          }
        );
        uploadStream.end(imageFile.data);
      });
      project.imageUrl = result.secure_url;
    }

    await project.save();
    res.status(200).json(project);
  } catch (error) {
    console.error("Error updating project:", error.message);
    res.status(500).json({ message: "Error updating project", error: error.message });
  }
});

// ลบ Project
router.delete("/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.imageUrl) {
      const publicId = project.imageUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`projects/${publicId}`);
    }

    await Project.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error.message);
    res.status(500).json({ message: "Error deleting project", error: error.message });
  }
});

export default router;