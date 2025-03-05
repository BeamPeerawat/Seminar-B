// config/corsConfig.js

export const corsOptions = {
  origin: [
    'https://seminar-f.vercel.app', // อนุญาตเฉพาะ Frontend บน Vercel
    'http://localhost:3000', // อนุญาตสำหรับการพัฒนาท้องถิ่น
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // อนุญาตทุกวิธีการที่อาจใช้ รวมถึง OPTIONS สำหรับ preflight
  allowedHeaders: ['Content-Type', 'Authorization'], // อนุญาต headers ที่ Frontend อาจส่งมา
  credentials: true, // อนุญาตการส่ง cookies, authorization headers, หรือ credentials อื่นๆ (ถ้าจำเป็น)
  optionSuccessStatus: 200, // บางเบราว์เซอร์ (เช่น Safari) ต้องการสถานะ 200 สำหรับ preflight
};