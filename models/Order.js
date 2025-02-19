// backend/models/Order.js
import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  items: [
    {
      name: String,
      price: Number,
      quantity: Number,
    },
  ],
  total: Number,
  customer: {
    name: String,
    email: String,
    address: String,
  },
  lineUserId: { type: String, required: true }, // เพิ่มฟิลด์นี้
  paymentMethod: String,
  status: {
    type: String,
    enum: ["pending", "completed", "cancelled"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Order = mongoose.model("Order", orderSchema);
export default Order;