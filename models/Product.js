import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  productId: { type: Number, required: true, unique: true }, // ใช้ ID จาก servicesData
  name: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true, default: 10 }, // สต็อกเริ่มต้น
  details: { type: String, required: true },
});

const Product = mongoose.model("Product", productSchema);
export default Product;