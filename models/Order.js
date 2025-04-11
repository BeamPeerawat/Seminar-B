// import mongoose from "mongoose";

// const orderSchema = new mongoose.Schema({
//   items: [
//     {
//       name: { type: String, required: true },
//       price: { type: Number, required: true },
//       quantity: { type: Number, required: true, default: 1 },
//       productId: { type: Number, required: true }, // เพิ่มเพื่อระบุสินค้าใน servicesData
//     },
//   ],
//   total: { type: Number, required: true },
//   customer: {
//     name: { type: String, required: true },
//     email: { type: String, required: false }, // Optional
//     address: { type: String, required: true },
//   },
//   paymentMethod: { type: String, required: true, default: "qr_code" },
//   status: {
//     type: String,
//     enum: ["pending", "completed", "cancelled"],
//     default: "pending",
//   },
//   userId: { type: String, required: true, ref: "User" }, // ใช้ userId จาก User model
//   profileId: { type: String, ref: "Profile" }, // ใช้สำหรับเชื่อมโยงกับ Profile
//   createdAt: { type: Date, default: Date.now },
// });

// const Order = mongoose.model("Order", orderSchema);
// export default Order;

import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  orderNumber: { type: Number, required: true, unique: true }, // เพิ่ม orderNumber
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
  status: { type: String, default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

export default Order;