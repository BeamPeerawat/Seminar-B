// backend/routes/ProjectRoutes.js
import express from "express";
import Project from "../models/ProjectModel.js";
const router = express.Router(); // เพิ่มบรรทัดนี้เพื่อกำหนด router

// เพิ่ม Project ใหม่
router.post("/add", async (req, res) => {
  try {
    const { title, description, imageUrl } = req.body;
    const newProject = new Project({ title, description, imageUrl });
    await newProject.save();
    res.status(201).json(newProject);
  } catch (error) {
    res.status(500).json({ message: "Error adding Project", error });
  }
});

// ดึงข้อมูล Project ทั้งหมด
router.get("/", async (req, res) => {
  try {
    const Projects = await Project.find();
    res.status(200).json(Projects);
  } catch (error) {
    res.status(500).json({ message: "Error fetching Projects", error });
  }
});

// แก้ไข Project
router.put("/:id", async (req, res) => {
  try {
    const { title, description, imageUrl } = req.body;
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      { title, description, imageUrl },
      { new: true }
    );
    res.status(200).json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: "Error updating Project", error });
  }
});

// ลบ Project
router.delete("/:id", async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting Project", error });
  }
});

export default router;
