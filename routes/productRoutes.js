import express from "express";
import Product from "../models/Product.js";
import Service from "../models/Service.js";

const router = express.Router();

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

    const products = await Product.find({ serviceId });
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

    service.productIds.push(productId);
    await service.save();

    res.status(201).json({ message: "Product added successfully", product });
  } catch (error) {
    console.error("Error adding product:", error.message);
    res.status(500).json({ error: "Failed to add product", details: error.message });
  }
});

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

router.get("/stock", async (req, res) => {
  try {
    const stock = await Product.find().select("productId stock");
    if (!stock.length) {
      return res.status(404).json({ message: "No products found" });
    }
    const stockMap = stock.reduce((acc, product) => {
      acc[product.productId] = typeof product.stock === "number" ? product.stock : 0;
      return acc;
    }, {});
    res.json(stockMap);
  } catch (error) {
    console.error("Error fetching stock:", error.message);
    res.status(500).json({ error: "Failed to fetch stock", details: error.message });
  }
});

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
            sufficient: false
          };
        }
        return {
          productId: item.productId,
          name: product.name,
          availableStock: product.stock,
          requestedQuantity: item.quantity || 1,
          sufficient: product.stock >= (item.quantity || 1)
        };
      })
    );

    const insufficientItems = stockResults.filter(item => !item.sufficient);

    if (insufficientItems.length > 0) {
      return res.status(400).json({
        error: "Insufficient stock",
        insufficientItems,
        allItems: stockResults
      });
    }

    res.json({ success: true, items: stockResults });
  } catch (error) {
    console.error("Error checking stock:", error.message);
    res.status(500).json({ error: "Failed to check stock", details: error.message });
  }
});

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

    await Service.insertMany(serviceData);
    await Product.insertMany(products);

    res.status(201).json({ 
      message: "Data seeded successfully", 
      productCount: products.length, 
      serviceCount: serviceData.length 
    });
  } catch (error) {
    console.error("Error seeding data:", error.message);
    res.status(500).json({ error: "Failed to seed data", details: error.message });
  }
});

export default router;