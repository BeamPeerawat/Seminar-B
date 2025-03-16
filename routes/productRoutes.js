import express from "express";
import Product from "../models/Product.js";

const router = express.Router();

// ดึงสินค้าตาม serviceId
router.get("/products", async (req, res) => {
  try {
    const { serviceId } = req.query;
    if (!serviceId) {
      return res.status(400).json({ error: "serviceId is required" });
    }

    const productIds = getProductIdsByService(serviceId);
    if (!productIds.length) {
      return res.status(404).json({ message: "No products found for this service" });
    }

    const products = await Product.find({ productId: { $in: productIds } });
    if (!products.length) {
      return res.status(404).json({ message: "No products found in database" });
    }

    res.json(
      products.map((p) => ({
        ...p.toObject(),
        serviceTitle: getServiceTitle(serviceId),
      }))
    );
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// อื่น ๆ (stock, seed, post, delete) ยังคงเหมือนเดิม

// ฟังก์ชันช่วย (ย้ายไปไฟล์ utils)
const getProductIdsByService = (serviceId) => {
  const serviceMap = {
    "solar-panel": [1, 2, 3],
    "solar-tank": [4, 5],
    "well-drilling": [6, 7],
  };
  return serviceMap[serviceId] || [];
};

const getServiceTitle = (serviceId) => {
  const serviceTitles = {
    "solar-panel": "โซลาร์เซลล์",
    "solar-tank": "หอถังสูงโซลาร์เซลล์",
    "well-drilling": "เจาะบาดาลระบบแอร์",
  };
  return serviceTitles[serviceId] || "ไม่ระบุ";
};

export default router;