export const corsOptions = {
  origin: [
    process.env.CLIENT_URL || "http://localhost:3000", // ใช้ URL ของ Frontend ในเครื่อง
    "https://seminar-f.vercel.app", // เพิ่ม URL ของ Frontend บน Vercel
  ],
  methods: "GET,POST,PUT,DELETE", // อนุญาต HTTP methods ที่จำเป็น
  allowedHeaders: ["Content-Type", "Authorization"], // อนุญาต Header ที่จำเป็น
  credentials: true, // อนุญาตให้ส่ง cookies และ credentials
};
