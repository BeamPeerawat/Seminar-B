import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, // เก็บ ObjectId ของผู้ใช้
    ref: 'User', // อ้างอิงไปยังโมเดล User
    required: true // ต้องมีผู้ใช้เสมอ
  },
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
  paymentMethod: String, // เพิ่มฟิลด์นี้
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