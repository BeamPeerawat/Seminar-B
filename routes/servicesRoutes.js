import express from "express";
import Service from "../models/Service.js";

const router = express.Router();

// ดึงรายการบริการทั้งหมด
router.get("/", async (req, res) => {
  try {
    const services = await Service.find();
    if (!services.length) {
      return res.status(404).json({ message: "No services found" });
    }

    // ปรับโครงสร้าง response ให้เหมาะกับหน้าแอดมิน
    const serviceList = services.map((service) => ({
      serviceId: service.serviceId,
      title: service.title,
    }));

    res.json(serviceList);
  } catch (error) {
    console.error("Error fetching services:", error.message);
    res
      .status(500)
      .json({ error: "Failed to fetch services", details: error.message });
  }
});

export default router;
