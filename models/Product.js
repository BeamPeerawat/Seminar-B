import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  productId: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true, default: 0 },
  details: { type: String, required: true },
  serviceId: { type: String, required: true },
  serviceTitle: { type: String },
  image: { type: String }, // ฟิลด์สำหรับเก็บ URL รูปภาพ
});

export default mongoose.model("Product", productSchema);
