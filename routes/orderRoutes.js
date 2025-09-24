import express from "express";
import Order from "../models/Order.js";
import Profile from "../models/Profile.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import OrderCounter from "../models/OrderCounter.js";
import authenticate from "../middleware/authenticate.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import sendEmail from "../utils/sendEmail.js";

const router = express.Router();

router.use(authenticate, authMiddleware);

// ฟังก์ชันเพื่อดึงและเพิ่มเลขลำดับ
const getNextOrderNumber = async () => {
  const counter = await OrderCounter.findByIdAndUpdate(
    "order_counter",
    { $inc: { sequence_value: 1 } },
    { new: true, upsert: true }
  );
  return counter.sequence_value;
};

// สร้างคำสั่งซื้อ
router.post("/", async (req, res) => {
  try {
    const {
      items,
      total,
      customer,
      paymentMethod,
      userId,
      installationAddress,
    } = req.body;

    const orderNumber = await getNextOrderNumber();
    const slipUploadDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const newOrder = new Order({
      orderNumber,
      userId,
      items,
      total,
      customer,
      paymentMethod,
      installationAddress,
      slipUploadDeadline,
    });

    await newOrder.save();

    // ลดสต็อกสินค้า
    for (const item of items) {
      await Product.findOneAndUpdate(
        { productId: item.productId },
        { $inc: { stock: -item.quantity } }
      );
    }

    console.log(`Order created successfully: #${orderNumber}`);

    const profile = await Profile.findOne({ userId });
    const userEmail = profile?.email || process.env.ADMIN_EMAIL;

    const orderDetails = `
เลขที่คำสั่งซื้อ: #${orderNumber}
วันที่: ${new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
ลูกค้า: ${customer.name}
ที่อยู่: ${customer.address}
ที่อยู่ติดตั้ง: ${installationAddress || "ไม่ระบุ"}
เบอร์โทร: ${customer.phone}
รายการสินค้า:
${items.map((item) => `- ${item.name} (จำนวน: ${item.quantity}, ราคา: ฿${item.price.toLocaleString()})`).join("\n")}
ยอดรวม: ฿${total.toLocaleString()}
สถานะ: รอดำเนินการ
    `;

    sendEmail({
      to: userEmail,
      subject: "ยืนยันคำสั่งซื้อ",
      text: `เรียน ${customer.name},\n\nคำสั่งซื้อของคุณได้รับการบันทึก:\n\n${orderDetails}\n\nด้วยความเคารพ,\nบริษัทของคุณ`,
    });

    sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: "ได้รับคำสั่งซื้อใหม่",
      text: `เรียน แอดมิน,\n\nมีคำสั่งซื้อใหม่:\n\n${orderDetails}\n\nด้วยความเคารพ,\nบริษัทของคุณ`,
    });

    res.status(201).json({ success: true, order: newOrder, orderNumber: newOrder.orderNumber });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// อัปโหลดสลิป
router.post("/upload-slip", async (req, res) => {
  try {
    const { orderNumber, slipUrl } = req.body;
    const userId = req.user.userId;

    if (!orderNumber || !slipUrl) {
      return res.status(400).json({ success: false, error: "Missing orderNumber or slipUrl" });
    }

    const cloudinaryUrlPattern = /^https:\/\/res\.cloudinary\.com\/debhfdjki\//;
    if (!cloudinaryUrlPattern.test(slipUrl)) {
      return res.status(400).json({
        success: false,
        error: "Invalid slipUrl: Must be a valid Cloudinary URL",
      });
    }

    const order = await Order.findOne({
      orderNumber: Number(orderNumber),
      userId,
    });
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    if (order.status === "confirmed") {
      return res.status(403).json({ success: false, error: "Cannot upload slip: Order already confirmed" });
    }

    const now = new Date();
    if (now > order.slipUploadDeadline) {
      order.status = "cancelled";
      order.updatedAt = Date.now();
      await order.save();

      const profile = await Profile.findOne({ userId });
      const userEmail = profile?.email || process.env.ADMIN_EMAIL;
      const orderDetails = `
เลขที่คำสั่งซื้อ: #${order.orderNumber}
วันที่: ${new Date(order.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
ลูกค้า: ${order.customer.name}
ที่อยู่: ${order.customer.address}
ที่อยู่ติดตั้ง: ${order.installationAddress || "ไม่ระบุ"}
เบอร์โทร: ${order.customer.phone}
สถานะ: ยกเลิก
      `;
      sendEmail({
        to: userEmail,
        subject: "ยกเลิกคำสั่งซื้อ",
        text: `เรียน ${order.customer.name},\n\nคำสั่งซื้อถูกยกเลิกเนื่องจากเกินกำหนดอัปโหลดสลิป:\n\n${orderDetails}\n\nด้วยความเคารพ,\nบริษัทของคุณ`,
      });
      sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: "ยกเลิกคำสั่งซื้อ",
        text: `เรียน แอดมิน,\n\nคำสั่งซื้อถูกยกเลิก:\n\n${orderDetails}\n\nด้วยความเคารพ,\nบริษัทของคุณ`,
      });

      return res.status(403).json({ success: false, error: "Slip upload deadline has passed" });
    }

    order.slipUrl = slipUrl;
    order.status = "awaiting_verification";
    order.updatedAt = Date.now();
    await order.save();

    const profile = await Profile.findOne({ userId });
    const userEmail = profile?.email || process.env.ADMIN_EMAIL;
    const orderDetails = `
เลขที่คำสั่งซื้อ: #${order.orderNumber}
วันที่: ${new Date(order.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
ลูกค้า: ${order.customer.name}
ที่อยู่: ${order.customer.address}
ที่อยู่ติดตั้ง: ${order.installationAddress || "ไม่ระบุ"}
เบอร์โทร: ${order.customer.phone}
สถานะ: รอยืนยัน
    `;
    sendEmail({
      to: userEmail,
      subject: "อัปโหลดสลิปเรียบร้อย",
      text: `เรียน ${order.customer.name},\n\nสลิปของคุณได้รับการอัปโหลด:\n\n${orderDetails}\n\nด้วยความเคารพ,\nบริษัทของคุณ`,
    });
    sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: "อัปโหลดสลิปสำหรับคำสั่งซื้อ",
      text: `เรียน แอดมิน,\n\nมีสลิปอัปโหลดใหม่:\n\n${orderDetails}\n\nด้วยความเคารพ,\nบริษัทของคุณ`,
    });

    res.status(200).json({ success: true, message: "Slip uploaded successfully", slipUrl });
  } catch (error) {
    console.error("Error uploading slip:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ดึงข้อมูลคำสั่งซื้อตาม orderNumber
router.get("/:orderNumber", async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const userId = req.user.userId;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const query =
      user.role === "admin"
        ? { orderNumber: Number(orderNumber) }
        : { orderNumber: Number(orderNumber), userId };

    const order = await Order.findOne(query);
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const orderData = order.toObject();
    orderData.createdAt = orderData.createdAt.toISOString();
    orderData.slipUploadDeadline = orderData.slipUploadDeadline?.toISOString();

    res.status(200).json({
      success: true,
      order: orderData,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ดึงประวัติคำสั่งซื้อทั้งหมด
router.get("/", async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const query = user.role === "admin" ? {} : { userId };

    const orders = await Order.find(query).sort({ createdAt: -1 });
    if (!orders || orders.length === 0) {
      return res.status(200).json({
        success: true,
        orders: [],
        message: "No orders found",
      });
    }

    const ordersData = orders.map((order) => {
      const orderData = order.toObject();
      orderData.createdAt = orderData.createdAt.toISOString();
      orderData.slipUploadDeadline = orderData.slipUploadDeadline?.toISOString();
      return orderData;
    });

    res.status(200).json({
      success: true,
      orders: ordersData,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch orders",
      details: error.message,
    });
  }
});

// ดึงออเดอร์ที่รอดำเนินการ (สำหรับแอดมิน)
router.get("/pending", async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log(`Fetching pending orders for userId: ${userId}`);

    const user = await User.findOne({ userId });
    if (!user) {
      console.log(`User not found: ${userId}`);
      return res.status(404).json({ success: false, error: "User not found" });
    }

    if (user.role !== "admin") {
      console.log(`Access denied: User ${userId} is not admin`);
      return res.status(403).json({ success: false, error: "Access denied: Admin only" });
    }

    const orders = await Order.find({ status: "pending" }).sort({
      createdAt: -1,
    });
    console.log(`Found ${orders.length} pending orders`);

    const ordersData = orders.map((order) => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt.toISOString(),
      slipUploadDeadline: order.slipUploadDeadline?.toISOString(),
    }));

    res.status(200).json({
      success: true,
      orders: ordersData,
      message: orders.length === 0 ? "No pending orders found" : undefined,
    });
  } catch (error) {
    console.error("Error fetching pending orders:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch pending orders",
      details: error.message,
    });
  }
});

// อัปเดตสถานะออเดอร์
router.put("/:orderNumber/status", async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    const user = await User.findOne({ userId });
    if (!user || user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Access denied: Admin only" });
    }

    const validStatuses = [
      "pending",
      "awaiting_verification",
      "confirmed",
      "ready_to_ship",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    const order = await Order.findOneAndUpdate(
      { orderNumber: Number(orderNumber) },
      { status, updatedAt: Date.now() },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const profile = await Profile.findOne({ userId: order.userId });
    const userEmail = profile?.email || process.env.ADMIN_EMAIL;
    const statusMessages = {
      pending: "รอดำเนินการ",
      awaiting_verification: "รอยืนยัน",
      confirmed: "ยืนยันแล้ว",
      ready_to_ship: "พร้อมจัดส่ง",
      delivered: "จัดส่งสำเร็จ",
      cancelled: "ยกเลิก",
    };
    const orderDetails = `
เลขที่คำสั่งซื้อ: #${order.orderNumber}
วันที่: ${new Date(order.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
ลูกค้า: ${order.customer.name}
ที่อยู่: ${order.customer.address}
ที่อยู่ติดตั้ง: ${order.installationAddress || "ไม่ระบุ"}
เบอร์โทร: ${order.customer.phone}
สถานะ: ${statusMessages[status] || status}${status === "delivered" ? "\nขอบคุณที่ใช้บริการของเรา!" : ""}
    `;
    sendEmail({
      to: userEmail,
      subject: `อัปเดตสถานะคำสั่งซื้อ: ${statusMessages[status] || status}`,
      text: `เรียน ${order.customer.name},\n\nคำสั่งซื้อของคุณได้รับการอัปเดต:\n\n${orderDetails}\n\nด้วยความเคารพ,\nบริษัทของคุณ`,
    });
    sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `อัปเดตสถานะคำสั่งซื้อ: ${statusMessages[status] || status}`,
      text: `เรียน แอดมิน,\n\nคำสั่งซื้อได้รับการอัปเดต:\n\n${orderDetails}\n\nด้วยความเคารพ,\nบริษัทของคุณ`,
    });

    const orderData = order.toObject();
    orderData.createdAt = orderData.createdAt.toISOString();
    orderData.slipUploadDeadline = orderData.slipUploadDeadline?.toISOString();

    res.status(200).json({ success: true, order: orderData });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint สำหรับยกเลิกออเดอร์ที่เกิน deadline
router.post("/cancel-expired", async (req, res) => {
  try {
    const now = new Date();
    const expiredOrders = await Order.find({
      status: "pending",
      slipUrl: { $exists: false },
      slipUploadDeadline: { $lt: now },
    });

    if (expiredOrders.length > 0) {
      for (const order of expiredOrders) {
        order.status = "cancelled";
        order.updatedAt = now;
        await order.save();

        const profile = await Profile.findOne({ userId: order.userId });
        const userEmail = profile?.email || process.env.ADMIN_EMAIL;
        const orderDetails = `
เลขที่คำสั่งซื้อ: #${order.orderNumber}
วันที่: ${new Date(order.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
ลูกค้า: ${order.customer.name}
ที่อยู่: ${order.customer.address}
ที่อยู่ติดตั้ง: ${order.installationAddress || "ไม่ระบุ"}
เบอร์โทร: ${order.customer.phone}
สถานะ: ยกเลิก
        `;
        sendEmail({
          to: userEmail,
          subject: "ยกเลิกคำสั่งซื้อ",
          text: `เรียน ${order.customer.name},\n\nคำสั่งซื้อถูกยกเลิกเนื่องจากเกินกำหนดอัปโหลดสลิป:\n\n${orderDetails}\n\nด้วยความเคารพ,\nบริษัทของคุณ`,
        });
        sendEmail({
          to: process.env.ADMIN_EMAIL,
          subject: "ยกเลิกคำสั่งซื้อ",
          text: `เรียน แอดมิน,\n\nคำสั่งซื้อถูกยกเลิก:\n\n${orderDetails}\n\nด้วยความเคารพ,\nบริษัทของคุณ`,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Cancelled ${expiredOrders.length} expired orders`,
    });
  } catch (error) {
    console.error("Error cancelling expired orders:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// อัปโหลดรูปจัดส่ง (admin เท่านั้น)
router.post("/:orderNumber/upload-delivery-image", async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const userId = req.user.userId;

    const user = await User.findOne({ userId });
    if (!user || user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Access denied: Admin only" });
    }

    const order = await Order.findOneAndUpdate(
      { orderNumber: Number(req.params.orderNumber) },
      { deliveryImageUrl: imageUrl, updatedAt: Date.now() },
      { new: true }
    );
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });

    const profile = await Profile.findOne({ userId: order.userId });
    const userEmail = profile?.email || process.env.ADMIN_EMAIL;
    const orderDetails = `
เลขที่คำสั่งซื้อ: #${order.orderNumber}
วันที่: ${new Date(order.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
ลูกค้า: ${order.customer.name}
ที่อยู่: ${order.customer.address}
ที่อยู่ติดตั้ง: ${order.installationAddress || "ไม่ระบุ"}
เบอร์โทร: ${order.customer.phone}
สถานะ: ${order.status === "delivered" ? "จัดส่งสำเร็จ\nขอบคุณที่ใช้บริการของเรา!" : order.status}
    `;
    sendEmail({
      to: userEmail,
      subject: "อัปโหลดรูปภาพการจัดส่ง",
      text: `เรียน ${order.customer.name},\n\nรูปภาพการจัดส่งได้รับการอัปโหลด:\n\n${orderDetails}\n\nด้วยความเคารพ,\nบริษัทของคุณ`,
    });
    sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: "อัปโหลดรูปภาพการจัดส่ง",
      text: `เรียน แอดมิน,\n\nรูปภาพการจัดส่งได้รับการอัปโหลด:\n\n${orderDetails}\n\nด้วยความเคารพ,\nบริษัทของคุณ`,
    });

    res.status(200).json({ success: true, deliveryImageUrl: order.deliveryImageUrl });
  } catch (error) {
    console.error("Error uploading delivery image:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;