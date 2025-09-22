import cron from "node-cron";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config(); // โหลด .env เพื่อใช้ BACKEND_URL

const cancelExpiredOrders = () => {
  // รันทุกชั่วโมง
  cron.schedule("0 * * * *", async () => {
    try {
      console.log("Checking for expired orders...");
      
      // ตรวจสอบ BACKEND_URL ก่อนเรียก API
      const backendUrl = process.env.BACKEND_URL;
      if (!backendUrl || !backendUrl.startsWith("http")) {
        console.error("Invalid BACKEND_URL in .env:", backendUrl);
        return;
      }

      const apiUrl = `${backendUrl}/api/orders/cancel-expired`;
      console.log("Calling API:", apiUrl);

      // เรียก API (เพิ่ม token ถ้าต้องการ authentication)
      const token = process.env.CRON_TOKEN || "your_cron_token"; // ถ้าต้องการ token, ใส่ใน .env
      const response = await axios.post(apiUrl, {}, {
        headers: {
          Authorization: `Bearer ${token}`, // ถ้า endpoint ต้องการ token
          "Content-Type": "application/json",
        },
        timeout: 10000, // 10 วินาที timeout
      });

      console.log("Cron response:", response.data.message || "Success");
    } catch (error) {
      if (error.code === "ECONNABORTED") {
        console.error("Cron API call timed out:", error.message);
      } else if (error.response) {
        console.error("Cron API error:", error.response.status, error.response.data);
      } else {
        console.error("Cron error:", error.message);
      }
      // ไม่ throw error เพื่อไม่ให้ cron หยุด
    }
  });

  console.log("Cron job scheduled: Cancel expired orders every hour");
};

export default cancelExpiredOrders;