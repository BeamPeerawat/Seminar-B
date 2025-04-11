import mongoose from "mongoose";

const orderCounterSchema = new mongoose.Schema({
  _id: { type: String, required: true, default: "order_counter" },
  sequence_value: { type: Number, default: 9999 }, // เปลี่ยนจาก 10000 เป็น 9999 เพราะจะ +1 ตอนใช้งาน
});

const OrderCounter = mongoose.models.OrderCounter || mongoose.model("OrderCounter", orderCounterSchema);

export default OrderCounter;