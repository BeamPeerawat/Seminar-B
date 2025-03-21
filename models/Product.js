import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  productId: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true, default: 0 }, // เพิ่ม default: 0
  details: { type: String, required: true },
  image: { type: String },
  serviceId: { type: String, required: true },
});

const Product = mongoose.model("Product", productSchema);
export default Product;