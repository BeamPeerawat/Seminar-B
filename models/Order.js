import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: Number,
    required: [true, "Order number is required"],
    unique: true,
    validate: {
      validator: function (value) {
        return !isNaN(value) && Number.isInteger(value) && value > 0;
      },
      message: "Order number must be a valid positive integer",
    },
  },
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
}, { timestamps: true });

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

export default Order;