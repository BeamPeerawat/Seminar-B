// config/corsConfig.js

export const corsOptions = {
  origin: [
    process.env.CLIENT_URL || "http://localhost:3000", // Frontend domain
    "http://another-frontend-domain.com", // ตัวอย่างอนุญาต domain อื่นๆ
  ],
  methods: "GET,POST", // กำหนด HTTP methods ที่อนุญาต
  allowedHeaders: "Content-Type", // กำหนด headers ที่อนุญาต
};
