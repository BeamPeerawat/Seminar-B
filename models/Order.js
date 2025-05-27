import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  orderNumber: { type: Number, required: true, unique: true },
  userId: { type: String, required: true },
  items: [
    {
      productId: { type: String, required: true },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true, default: 1 },
      image: { type: String },
    },
  ],
  total: { type: Number, required: true },
  customer: {
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String },
  },
  paymentMethod: { type: String, required: true },
  status: {
    type: String,
    enum: [
      "pending",
      "awaiting_verification",
      "confirmed",
      "ready_to_ship",
      "delivered",
      "cancelled",
    ],
    default: "pending",
  },
  slipUrl: { type: String }, // เปลี่ยนจาก slipPath เป็น slipUrl
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("Order", orderSchema);
