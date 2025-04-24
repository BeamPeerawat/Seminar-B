const express = require("express");
const router = express.Router();
const Content = require("../models/Content");
const authenticateToken = require("../middleware/authenticateToken"); // Middleware

// อ่านข้อมูลทั้งหมด
router.get("/content", authenticateToken, async (req, res) => {
  const contents = await Content.find();
  res.json(contents);
});

// เพิ่มข้อมูลใหม่
router.post("/content", authenticateToken, async (req, res) => {
  const newContent = new Content(req.body);
  await newContent.save();
  res.json(newContent);
});

// แก้ไขข้อมูล
router.put("/content/:id", authenticateToken, async (req, res) => {
  const updatedContent = await Content.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(updatedContent);
});

// ลบข้อมูล
router.delete("/content/:id", authenticateToken, async (req, res) => {
  await Content.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted Successfully" });
});

module.exports = router;
