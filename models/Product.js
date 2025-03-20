import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  productId: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  details: { type: String },
  image: { type: String }, // เพิ่มฟิลด์ image
});

const Product = mongoose.model("Product", productSchema);
export default Product;