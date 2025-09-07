import express from "express";
import Product from "../models/Product.js";
import Service from "../models/Service.js";
import { v2 as cloudinary } from "cloudinary";

// ตั้งค่า Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const router = express.Router();

// ดึงข้อมูลสินค้าทั้งหมดหรือตาม serviceId
router.get("/", async (req, res) => {
  try {
    const { serviceId, search } = req.query;
    if (!serviceId) {
      return res.status(400).json({ error: "serviceId is required" });
    }

    let query = {};
    if (serviceId !== "all") {
      const service = await Service.findOne({ serviceId });
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      query.serviceId = serviceId;
    }
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const products = await Product.find(query);
    if (!products.length && serviceId !== "all") {
      return res.status(404).json({ message: "No products found for this service" });
    }

    const response = await Promise.all(
      products.map(async (p) => {
        const service = await Service.findOne({ serviceId: p.serviceId });
        return {
          ...p.toObject(),
          serviceId: p.serviceId,
          serviceTitle: service?.title || "Unknown",
        };
      })
    );

    res.json(response);
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
    const { productId, name, price, stock, details, serviceId } = req.body;
    const imageFiles = req.files?.images;

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

    let imageUrls = [];
    if (imageFiles) {
      const files = Array.isArray(imageFiles) ? imageFiles : [imageFiles];
      imageUrls = await Promise.all(
        files.map(async (file) => {
          if (!file.mimetype.startsWith("image/")) {
            throw new Error("File must be an image");
          }
          return await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { folder: "products" },
              (error, result) => {
                if (error) reject(new Error("Cloudinary upload failed: " + error.message));
                resolve(result.secure_url);
              }
            );
            uploadStream.end(file.data);
          });
        })
      );
    }

    const product = new Product({
      productId: Number(productId),
      name,
      price: Number(price),
      stock: Number(stock),
      details,
      images: imageUrls, // เก็บ array ของ URLs
      serviceId,
    });
    await product.save();

    service.productIds.push(Number(productId));
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
    const { name, price, stock, details, serviceId, keptImages } = req.body;
    const imageFiles = req.files?.images;

    const product = await Product.findOne({ productId: Number(productId) });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const oldServiceId = product.serviceId;
    product.name = name || product.name;
    product.price = price !== undefined ? Number(price) : product.price;
    product.stock = stock !== undefined ? Number(stock) : product.stock;
    product.details = details || product.details;
    product.serviceId = serviceId || product.serviceId;

    let imageUrls = [];
    // เก็บ URL รูปภาพที่ต้องการเก็บไว้
    const keptImageUrls = keptImages ? JSON.parse(keptImages) : [];

    // ลบรูปภาพเก่าที่ไม่อยู่ใน keptImages
    if (product.images && product.images.length > 0) {
      await Promise.all(
        product.images.map(async (url) => {
          if (!keptImageUrls.includes(url)) {
            const publicId = url.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(`products/${publicId}`);
          }
        })
      );
    }

    // อัปโหลดรูปภาพใหม่ (ถ้ามี)
    if (imageFiles) {
      const files = Array.isArray(imageFiles) ? imageFiles : [imageFiles];
      imageUrls = await Promise.all(
        files.map(async (file) => {
          if (!file.mimetype.startsWith("image/")) {
            throw new Error("File must be an image");
          }
          return await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { folder: "products" },
              (error, result) => {
                if (error) reject(new Error("Cloudinary upload failed: " + error.message));
                resolve(result.secure_url);
              }
            );
            uploadStream.end(file.data);
          });
        })
      );
    }

    // รวม URL รูปภาพที่เก็บไว้กับรูปใหม่
    product.images = [...keptImageUrls, ...imageUrls];

    await product.save();

    if (serviceId && serviceId !== oldServiceId) {
      const oldService = await Service.findOne({ serviceId: oldServiceId });
      if (oldService) {
        oldService.productIds = oldService.productIds.filter(
          (id) => id !== Number(productId)
        );
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
      service.productIds = service.productIds.filter(
        (id) => id !== Number(productId)
      );
      await service.save();
    }

    // ลบรูปภาพทั้งหมดจาก Cloudinary
    if (product.images && product.images.length > 0) {
      await Promise.all(
        product.images.map(async (url) => {
          const publicId = url.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`products/${publicId}`);
        })
      );
    }

    await Product.deleteOne({ productId: Number(productId) });
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error.message);
    res.status(500).json({ error: "Failed to delete product", details: error.message });
  }
});

// ดึงข้อมูลสต็อก
router.get("/stock", async (req, res) => {
  try {
    const stock = await Product.find().select("productId stock");
    if (!stock.length) {
      return res.status(404).json({ message: "No products found" });
    }
    const stockMap = stock.reduce((acc, product) => {
      acc[product.productId] =
        typeof product.stock === "number" ? product.stock : 0;
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
    product.stock = Math.max(0, product.stock + change);
    await product.save();
    res.json({ message: "Stock updated successfully", product });
  } catch (error) {
    console.error("Error updating stock:", error.message);
    res.status(500).json({ error: "Failed to update stock", details: error.message });
  }
});

// ตรวจสอบสต็อก
router.post("/check-stock", async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid items data" });
    }

    const stockResults = await Promise.all(
      items.map(async (item) => {
        const product = await Product.findOne({ productId: item.productId });
        if (!product) {
          return {
            productId: item.productId,
            name: "Unknown",
            availableStock: 0,
            requestedQuantity: item.quantity || 1,
            sufficient: false,
          };
        }
        return {
          productId: item.productId,
          name: product.name,
          availableStock: product.stock,
          requestedQuantity: item.quantity || 1,
          sufficient: product.stock >= (item.quantity || 1),
        };
      })
    );

    const insufficientItems = stockResults.filter((item) => !item.sufficient);

    if (insufficientItems.length > 0) {
      return res.status(400).json({
        error: "Insufficient stock",
        insufficientItems,
        allItems: stockResults,
      });
    }

    res.json({ success: true, items: stockResults });
  } catch (error) {
    console.error("Error checking stock:", error.message);
    res.status(500).json({ error: "Failed to check stock", details: error.message });
  }
});

// Seed ข้อมูล
router.post("/seed", async (req, res) => {
  try {
    const { services } = req.body;
    if (!services || typeof services !== "object") {
      return res.status(400).json({ error: "Invalid services data" });
    }

    await Product.deleteMany();
    await Service.deleteMany();

    const products = [];
    const serviceData = [];

    for (const [serviceId, service] of Object.entries(services)) {
      if (!service.products || !Array.isArray(service.products)) {
        return res
          .status(400)
          .json({ error: `Invalid products for service ${serviceId}` });
      }

      const productIds = [];
      service.products.forEach((product) => {
        if (
          !product.id ||
          !product.name ||
          !product.price ||
          !product.serviceId
        ) {
          throw new Error(
            `Missing required fields in product: ${JSON.stringify(product)}`
          );
        }
        products.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          stock: product.stock || 10,
          details: product.details || "",
          images: product.images || [], // รองรับ array ของรูปภาพ
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

    await Service.insertMany(serviceData);
    await Product.insertMany(products);

    res.status(201).json({
      message: "Data seeded successfully",
      productCount: products.length,
      serviceCount: serviceData.length,
    });
  } catch (error) {
    console.error("Error seeding data:", error.message);
    res.status(500).json({ error: "Failed to seed data", details: error.message });
  }
});

// GET /api/products/select - Get all products for selection
router.get("/select", async (req, res) => {
  try {
    const products = await Product.find().select("productId name");
    res.json({ success: true, products });
  } catch (error) {
    console.error("Error fetching products:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;