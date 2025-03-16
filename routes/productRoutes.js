// backend/routes/productRoutes.js
import express from "express";
import Product from "../models/Product.js";

const router = express.Router();

// ดึงสินค้าทั้งหมดตาม serviceId
router.get("/products", async (req, res) => {
  try {
    const { serviceId } = req.query;
    const query = serviceId ? { productId: { $in: getProductIdsByService(serviceId) } } : {};
    const products = await Product.find(query);
    res.json(products.map(p => ({
      ...p.toObject(),
      serviceTitle: getServiceTitle(serviceId) // สมมติว่าเพิ่มฟังก์ชันนี้
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ดึงสต็อก
router.get("/stock", async (req, res) => {
  try {
    const stock = await Product.find().select("productId stock");
    const stockMap = stock.reduce((acc, product) => {
      acc[product.productId] = product.stock;
      return acc;
    }, {});
    res.json(stockMap);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// อัปเดตสต็อก
router.post("/stock", async (req, res) => {
  const { productId, change, userId } = req.body;
  try {
    const product = await Product.findOne({ productId });
    if (!product) return res.status(404).json({ error: "Product not found" });
    product.stock += change;
    if (product.stock < 0) product.stock = 0;
    await product.save();
    res.json({ [productId]: product.stock });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Seed ข้อมูล
router.post("/seed", async (req, res) => {
  try {
    const { services } = req.body;
    await Product.deleteMany();
    const products = [];
    Object.values(services).forEach((service) => {
      service.products.forEach((product) => {
        products.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          stock: 10,
          details: product.details,
        });
      });
    });
    await Product.insertMany(products);
    res.status(201).json({ message: "Products seeded successfully", count: products.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// เพิ่ม POST /products และ DELETE /products/:productId
router.post("/products", async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/products/:productId", async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ productId: req.params.productId });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ฟังก์ชันช่วย (สมมติ)
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