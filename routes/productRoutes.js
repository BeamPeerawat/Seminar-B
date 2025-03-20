import express from "express";
import Product from "../models/Product.js";
import Service from "../models/Service.js";

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

    const service = await Service.findOne({ serviceId });
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    const products = await Product.find({ serviceId }); // ใช้ serviceId ค้นหาโดยตรง
    console.log(`Found products for ${serviceId}:`, products); // Debug
    if (!products.length) {
      return res.status(404).json({ message: "No products found for this service" });
    }

    res.json(
      products.map((p) => ({
        ...p.toObject(),
        serviceId,
        serviceTitle: service.title,
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
    const service = await Service.findOne({ serviceId: product.serviceId });
    const productWithService = {
      ...product.toObject(),
      serviceId: product.serviceId,
      serviceTitle: service?.title || "ไม่ระบุ",
    };
    res.json(productWithService);
  } catch (error) {
    console.error("Error fetching product:", error.message);
    res.status(500).json({ error: "Failed to fetch product", details: error.message });
  }
});

// เพิ่มสินค้าใหม่
router.post("/", async (req, res) => {
  try {
    const { productId, name, price, stock, details, image, serviceId } = req.body;
    if (!productId || !name || !price || !stock || !details || !serviceId) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const service = await Service.findOne({ serviceId });
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    const existingProduct = await Product.findOne({ productId });
    if (existingProduct) {
      return res.status(400).json({ error: "Product ID already exists" });
    }

    const product = new Product({ productId, name, price, stock, details, image, serviceId });
    await product.save();

    // อัปเดต productIds ใน Service
    service.productIds.push(productId);
    await service.save();

    res.status(201).json({ message: "Product added successfully", product });
  } catch (error) {
    console.error("Error adding product:", error.message);
    res.status(500).json({ error: "Failed to add product", details: error.message });
  }
});

// อัปเดตสินค้า
router.put("/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const { name, price, stock, details, image, serviceId } = req.body;

    const product = await Product.findOne({ productId: Number(productId) });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const oldServiceId = product.serviceId;
    product.name = name || product.name;
    product.price = price !== undefined ? price : product.price;
    product.stock = stock !== undefined ? stock : product.stock;
    product.details = details || product.details;
    product.image = image || product.image;
    product.serviceId = serviceId || product.serviceId;
    await product.save();

    // อัปเดต productIds ใน Service ถ้า serviceId เปลี่ยน
    if (serviceId && serviceId !== oldServiceId) {
      const oldService = await Service.findOne({ serviceId: oldServiceId });
      if (oldService) {
        oldService.productIds = oldService.productIds.filter((id) => id !== Number(productId));
        await oldService.save();
      }
      const newService = await Service.findOne({ serviceId });
      if (newService) {
        newService.productIds.push(Number(productId));
        await newService.save();
      }
    }

    res.json({ message: "Product updated successfully", product });
  } catch (error) {
    console.error("Error updating product:", error.message);
    res.status(500).json({ error: "Failed to update product", details: error.message });
  }
});

// ลบสินค้า
router.delete("/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await Product.findOne({ productId: Number(productId) });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const service = await Service.findOne({ serviceId: product.serviceId });
    if (service) {
      service.productIds = service.productIds.filter((id) => id !== Number(productId));
      await service.save();
    }

    await Product.deleteOne({ productId: Number(productId) });
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error.message);
    res.status(500).json({ error: "Failed to delete product", details: error.message });
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
  try {
    const { productId, change } = req.body;
    const product = await Product.findOne({ productId });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    product.stock = Math.max(0, product.stock + change); // ไม่ให้สต็อกติดลบ
    await product.save();
    res.json({ message: "Stock updated successfully", product });
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

    // ลบข้อมูลเก่า
    await Product.deleteMany();
    await Service.deleteMany();

    // เตรียมข้อมูลสำหรับ Product และ Service
    const products = [];
    const serviceData = [];

    for (const [serviceId, service] of Object.entries(services)) {
      if (!service.products || !Array.isArray(service.products)) {
        return res.status(400).json({ error: `Invalid products for service ${serviceId}` });
      }

      const productIds = [];
      service.products.forEach((product) => {
        if (!product.id || !product.name || !product.price || !product.serviceId) {
          throw new Error(`Missing required fields in product: ${JSON.stringify(product)}`);
        }
        products.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          stock: product.stock || 10,
          details: product.details || "",
          image: product.image || "",
          serviceId: product.serviceId,
        });
        productIds.push(product.id);
      });

      serviceData.push({
        serviceId,
        title: service.title,
        productIds,
      });
    }

    // เพิ่มข้อมูล Service
    await Service.insertMany(serviceData);
    // เพิ่มข้อมูล Product
    await Product.insertMany(products);

    res.status(201).json({ message: "Data seeded successfully", productCount: products.length, serviceCount: serviceData.length });
  } catch (error) {
    console.error("Error seeding data:", error.message);
    res.status(500).json({ error: "Failed to seed data", details: error.message });
  }
});

export default router;