import express from "express";
import Content from "../models/Content.js";
import authenticate from "../middleware/authenticate.js"; // เปลี่ยนจาก authenticateToken เป็น authenticate

const router = express.Router();

router.get("/content", authenticate, async (req, res) => {
  const contents = await Content.find();
  res.json(contents);
});

router.post("/content", authenticate, async (req, res) => {
  const newContent = new Content(req.body);
  await newContent.save();
  res.json(newContent);
});

router.put("/content/:id", authenticate, async (req, res) => {
  const updatedContent = await Content.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(updatedContent);
});

router.delete("/content/:id", authenticate, async (req, res) => {
  await Content.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted Successfully" });
});

export default router;