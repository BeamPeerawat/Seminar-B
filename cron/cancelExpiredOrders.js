import cron from "node-cron";
import axios from "axios";

const cancelExpiredOrders = () => {
  // รันทุกชั่วโมง
  cron.schedule("0 * * * *", async () => {
    try {
      console.log("Checking for expired orders...");
      const response = await axios.post(
        `${process.env.BACKEND_URL}/api/orders/cancel-expired`
      );
      console.log(response.data.message);
    } catch (error) {
      console.error("Error in cancelExpiredOrders cron:", error.message);
    }
  });
};

export default cancelExpiredOrders;