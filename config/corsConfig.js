// กำหนดตัวเลือก (Options) สำหรับการตั้งค่า CORS (Cross-Origin Resource Sharing)
export const corsOptions = {
  // กำหนดแหล่งที่สามารถเข้าถึง API นี้ได้ (Allowlist)
  origin: [
    "https://seminar-f.vercel.app", // เว็บไซต์ที่ Deploy จริง
    "http://localhost:3000",        // สำหรับใช้ตอนพัฒนาในเครื่อง
  ],

  // กำหนด HTTP methods ที่อนุญาตให้เรียกใช้ API ได้
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],

  // อนุญาตให้มีการส่ง cookie หรือ credential อื่น ๆ เช่น token มาพร้อมกับ request
  credentials: true,

  // กำหนด headers ที่สามารถส่งมาได้จากฝั่ง client
  allowedHeaders: ["Content-Type", "Authorization"], // ต้องมี Authorization
};
