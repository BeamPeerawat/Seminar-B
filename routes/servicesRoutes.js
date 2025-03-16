import express from "express";
const router = express.Router();

router.get("/services", (req, res) => {
  console.log("API /services called"); // เพิ่ม log เพื่อตรวจสอบ
  const services = [
    { id: "solar-panel", title: "โซลาร์เซลล์", desc: "ราคาเริ่มต้นที่ 19,900฿", imgSrc: "/img/บริการ1.png" },
    { id: "solar-tank", title: "หอถังสูงโซลาร์เซลล์", desc: "ราคาเริ่มต้นที่ 19,900฿", imgSrc: "/img/บริการ2.png" },
    { id: "well-drilling", title: "เจาะบาดาลระบบแอร์", desc: "ราคาเริ่มต้นที่ 25,000฿", imgSrc: "/img/บริการ3.png" },
  ];
  res.json(services);
});

export default router;