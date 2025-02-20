// config/corsConfig.js

export const corsOptions = {
  origin: [
    process.env.CLIENT_URL || "http://localhost:3000", // ใช้ URL ของ Frontend ในเครื่อง
    "https://seminar-f.vercel.app", // เพิ่ม URL ของ Frontend บน Vercel
    "http://another-frontend-domain.com", // ตัวอย่างอนุญาต domain อื่นๆ
  ],
  methods: "GET,POST", // กำหนด HTTP methods ที่อนุญาต
  allowedHeaders: "Content-Type", // กำหนด headers ที่อนุญาต
};
