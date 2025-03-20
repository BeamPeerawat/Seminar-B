import express from "express";
import Product from "../models/Product.js";
import { getProductIdsByService, getServiceTitle } from "../utils/serviceUtils.js";

const router = express.Router();

// ดึงสินค้าตาม serviceId
router.get("/", async (req, res) => {
  try {
    const { serviceId } = req.query;
    if (!serviceId) {
      return res.status(400).json({ error: "serviceId is required" });
    }

    if (serviceId === "all") {
      const products = await Product.find();
      return res.json(products);
    }

    const productIds = getProductIdsByService(serviceId);
    console.log(`Service ID: ${serviceId}, Product IDs: ${productIds}`); // Debug
    if (!productIds.length) {
      return res.status(404).json({ message: "No products found for this service" });
    }

    const products = await Product.find({ productId: { $in: productIds } });
    console.log(`Found products for ${serviceId}:`, products); // Debug
    if (!products.length) {
      return res.status(404).json({ message: "No products found in database" });
    }

    res.json(
      products.map((p) => ({
        ...p.toObject(),
        serviceId,
        serviceTitle: getServiceTitle(serviceId),
      }))
    );
  } catch (error) {
    console.error("Error fetching products:", error.message);
    res.status(500).json({ error: "Failed to fetch products", details: error.message });
  }
});

// ดึงข้อมูลสินค้าตาม productId
router.get("/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await Product.findOne({ productId: Number(productId) });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    // เพิ่ม serviceTitle ตาม serviceId ที่เกี่ยวข้อง
    const serviceId = Object.keys(getProductIdsByService).find((key) =>
      getProductIdsByService(key).includes(Number(productId))
    );
    const productWithService = {
      ...product.toObject(),
      serviceId,
      serviceTitle: getServiceTitle(serviceId),
    };
    res.json(productWithService);
  } catch (error) {
    console.error("Error fetching product:", error.message);
    res.status(500).json({ error: "Failed to fetch product", details: error.message });
  }
});

// ดึงสินค้าตาม serviceId
router.get("/products", async (req, res) => {
  try {
    const { serviceId } = req.query;
    if (!serviceId) {
      return res.status(400).json({ error: "serviceId is required" });
    }

    if (serviceId === "all") {
      const products = await Product.find();
      return res.json(products);
    }

    const productIds = getProductIdsByService(serviceId);
    console.log(`Service ID: ${serviceId}, Product IDs: ${productIds}`); // Debug
    if (!productIds.length) {
      return res.status(404).json({ message: "No products found for this service" });
    }

    const products = await Product.find({ productId: { $in: productIds } });
    console.log(`Found products for ${serviceId}:`, products); // Debug
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
    console.error("Error fetching products:", error.message);
    res.status(500).json({ error: "Failed to fetch products", details: error.message });
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
    console.error("Error fetching stock:", error.message);
    res.status(500).json({ error: "Failed to fetch stock", details: error.message });
  }
});

// อัปเดตสต็อก
router.post("/stock", async (req, res) => {
  const { productId, change, userId } = req.body;
  try {
    if (!productId || typeof change !== "number" || !userId) {
      return res.status(400).json({ error: "productId, change, and userId are required" });
    }

    const product = await Product.findOne({ productId });
    if (!product) return res.status(404).json({ error: "Product not found" });

    product.stock += change;
    if (product.stock < 0) product.stock = 0;
    await product.save();
    res.json({ [productId]: product.stock });
  } catch (error) {
    console.error("Error updating stock:", error.message);
    res.status(500).json({ error: "Failed to update stock", details: error.message });
  }
});

// Seed ข้อมูล
router.post("/seed", async (req, res) => {
  try {
    const { services } = req.body;
    if (!services || typeof services !== "object") {
      return res.status(400).json({ error: "Invalid services data" });
    }

    const products = [];
    for (const [serviceId, service] of Object.entries(services)) {
      if (!service.products || !Array.isArray(service.products)) {
        return res.status(400).json({ error: `Invalid products for service ${serviceId}` });
      }
      service.products.forEach((product) => {
        if (!product.id || !product.name || !product.price) {
          throw new Error(`Missing required fields in product: ${JSON.stringify(product)}`);
        }
        products.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          stock: 10,
          details: product.details || "",
        });
      });
    }

    await Product.deleteMany();
    await Product.insertMany(products);
    res.status(201).json({ message: "Products seeded successfully", count: products.length });
  } catch (error) {
    console.error("Error seeding products:", error.message);
    res.status(500).json({ error: "Failed to seed products", details: error.message });
  }
});

// เพิ่มสินค้า
router.post("/products", async (req, res) => {
  try {
    const { productId, name, price, stock, details } = req.body;
    if (!productId || !name || !price) {
      return res.status(400).json({ error: "productId, name, and price are required" });
    }

    const product = new Product({ productId, name, price, stock: stock || 10, details });
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    console.error("Error adding product:", error.message);
    res.status(500).json({ error: "Failed to add product", details: error.message });
  }
});

// ลบสินค้า
router.delete("/products/:productId", async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ productId: req.params.productId });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error.message);
    res.status(500).json({ error: "Failed to delete product", details: error.message });
  }
});

export default router;