// import express from "express";
// const router = express.Router();

// router.get("/services", (req, res) => {
//   console.log("API /services called"); // เพิ่ม log เพื่อตรวจสอบ
//   const services = [
//     { id: "solar-panel", title: "โซลาร์เซลล์", desc: "ราคาเริ่มต้นที่ 19,900฿", imgSrc: "/img/บริการ1.png" },
//     { id: "solar-tank", title: "หอถังสูงโซลาร์เซลล์", desc: "ราคาเริ่มต้นที่ 19,900฿", imgSrc: "/img/บริการ2.png" },
//     { id: "well-drilling", title: "เจาะบาดาลระบบแอร์", desc: "ราคาเริ่มต้นที่ 25,000฿", imgSrc: "/img/บริการ3.png" },
//   ];
//   res.json(services);
// });

// export default router;

// import express from "express";
// import Product from "../models/Product.js";
// import { getServiceTitle, getProductIdsByService } from "../utils/serviceUtils.js"; // เพิ่ม getProductIdsByService

// const router = express.Router();

// // ดึงรายการบริการทั้งหมดจากฐานข้อมูล
// router.get("/", async (req, res) => {
//   try {
//     // ดึงสินค้าทั้งหมดและจัดกลุ่มตาม serviceId
//     const products = await Product.find();
//     const serviceIds = ["solar-panel", "solar-tank", "well-drilling"]; // กำหนด serviceIds ที่ต้องการ

//     const serviceList = serviceIds.map((serviceId) => {
//       const serviceProducts = products.filter((p) =>
//         getProductIdsByService(serviceId).includes(p.productId)
//       );
//       const firstProduct = serviceProducts[0];
//       return {
//         id: serviceId,
//         title: getServiceTitle(serviceId),
//         desc: firstProduct
//           ? `ราคาเริ่มต้นที่ ${firstProduct.price.toLocaleString()}฿`
//           : "ไม่มีสินค้า",
//         imgSrc: `/img/บริการ${serviceId === "solar-panel" ? "1" : serviceId === "solar-tank" ? "2" : "3"}.png`,
//         icon: serviceId === "solar-panel" ? "fa-solar-panel" : serviceId === "solar-tank" ? "fa-water" : "fa-tools",
//       };
//     });

//     res.json(serviceList);
//   } catch (error) {
//     console.error("Error fetching services:", error.message);
//     res.status(500).json({ error: "Failed to fetch services", details: error.message });
//   }
// });

// export default router;

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
    res.status(500).json({ error: "Failed to fetch services", details: error.message });
  }
});

export default router;