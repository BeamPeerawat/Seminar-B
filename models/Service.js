import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema({
  serviceId: { type: String, required: true, unique: true }, // เช่น "solar-panel"
  title: { type: String, required: true }, // เช่น "โซลาร์เซลล์"
  productIds: [{ type: Number }], // รายการ productId ที่อยู่ในบริการนี้
});

export default mongoose.model("Service", serviceSchema);
