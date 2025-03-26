import express from "express";
import Cart from "../models/Cart.js";

const router = express.Router();

// ดึงตะกร้าสินค้าของผู้ใช้
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(200).json([]);
    }
    res.json(cart.items || []);
  } catch (error) {
    console.error("Error fetching cart:", error.message);
    res.status(500).json({ error: "Failed to fetch cart", details: error.message });
  }
});

// บันทึกตะกร้าสินค้า
router.post("/", async (req, res) => {
  try {
    const { userId, cartItems } = req.body;
    if (!userId || !Array.isArray(cartItems)) {
      return res.status(400).json({ message: "Invalid request" });
    }
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: cartItems });
    } else {
      cart.items = cartItems;
    }
    await cart.save();
    res.status(200).json({ message: "Cart updated successfully" });
  } catch (error) {
    console.error("Error saving cart:", error.message);
    res.status(500).json({ error: "Failed to save cart", details: error.message });
  }
});

export default router;