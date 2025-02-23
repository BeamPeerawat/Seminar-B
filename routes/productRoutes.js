// backend/routes/productRoutes.js
import express from "express";
import Product from "../models/Product.js";

const router = express.Router();

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

router.post("/stock", async (req, res) => {
  const { productId, change, userId } = req.body;
  try {
    const product = await Product.findOne({ productId });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    product.stock += change;
    if (product.stock < 0) product.stock = 0;
    await product.save();
    res.json({ [productId]: product.stock });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// เพิ่ม endpoint สำหรับ seed ข้อมูลจาก Frontend
router.post("/seed", async (req, res) => {
  try {
    const { services } = req.body; // รับข้อมูล services จาก Frontend

    // ลบข้อมูลเก่าใน Product collection (ถ้าต้องการเริ่มใหม่)
    await Product.deleteMany();

    // เตรียมข้อมูลสินค้าจาก services
    const products = [];
    Object.values(services).forEach((service) => {
      service.products.forEach((product) => {
        products.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          stock: 10, // สต็อกเริ่มต้น
          details: product.details,
        });
      });
    });

    // บันทึกข้อมูลลง MongoDB
    await Product.insertMany(products);
    res.status(201).json({ message: "Products seeded successfully", count: products.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;