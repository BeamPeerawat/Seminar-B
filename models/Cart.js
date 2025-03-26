import mongoose from "mongoose";

const cartSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  items: [
    {
      productId: { type: Number, required: true },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
      stock: { type: Number, required: true },
      image: { type: String },
    },
  ],
});

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;