import mongoose from "mongoose";

const orderCounterSchema = new mongoose.Schema({
  _id: { type: String, required: true, default: "order_counter" },
  sequence_value: { type: Number, default: 10000 },
});

const OrderCounter = mongoose.models.OrderCounter || mongoose.model("OrderCounter", orderCounterSchema);

export default OrderCounter;