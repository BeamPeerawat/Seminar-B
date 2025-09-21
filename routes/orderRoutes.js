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
      installationAddress, // ของคุณ
      // ...อื่นๆ
    } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!userId || !customer || !items || !total || !paymentMethod || !installationAddress) {
      return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    // ใช้ getNextOrderNumber() ของคุณ
    const orderNumber = await getNextOrderNumber();

    const now = Date.now();
    const slipUploadDeadline = new Date(now + 24 * 60 * 60 * 1000); // 24 ชั่วโมง

    const newOrder = new Order({
      orderNumber,
      userId,
      items,
      total,
      customer,
      paymentMethod,
      installationAddress, // ของคุณ
      status: "awaiting_verification", // จากโค้ดแรก
      slipUploadDeadline,
      // ...อื่นๆ
    });

    await newOrder.save();

    // ดึงอีเมลผู้ใช้จาก Profile
    const profile = await Profile.findOne({ userId });
    const userEmail = profile?.email;

    // ส่งอีเมลถึงผู้ใช้ (ถ้ามีอีเมล)
    if (userEmail) {
      await sendEmail({
        to: userEmail,
        subject: "ยืนยันคำสั่งซื้อ",
        order: newOrder,
        statusMessage: "รอยืนยัน",
      });
    }

    // ส่งอีเมลถึงแอดมิน
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: "ได้รับคำสั่งซื้อใหม่",
      order: newOrder,
      statusMessage: "รอยืนยัน",
    });

    res.status(201).json({
      success: true,
      order: newOrder,
      orderNumber: newOrder.orderNumber,
    });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// อัปโหลดสลิป
router.post("/upload-slip", async (req, res) => {
  try {
    const { orderNumber, slipUrl } = req.body;
    const userId = req.user.userId;

    if (!orderNumber || !slipUrl) {
      return res
        .status(400)
        .json({ success: false, error: "Missing orderNumber or slipUrl" });
    }

    // ตรวจสอบว่า slipUrl เป็น URL ที่ถูกต้องและมาจาก Cloudinary
    const cloudinaryUrlPattern = /^https:\/\/res\.cloudinary\.com\/debhfdjki\//;
    if (!cloudinaryUrlPattern.test(slipUrl)) {
      return res
        .status(400)
        .json({
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

    // ตรวจสอบสถานะ
    if (order.status === "confirmed") {
      return res
        .status(403)
        .json({ success: false, error: "Cannot upload slip: Order already confirmed" });
    }

    // ตรวจสอบ deadline
    const now = new Date();
    if (now > order.slipUploadDeadline) {
      order.status = "cancelled";
      order.updatedAt = Date.now();
      await order.save();
      return res
        .status(403)
        .json({ success: false, error: "Slip upload deadline has passed" });
    }

    order.slipUrl = slipUrl;
    order.status = "awaiting_verification";
    order.updatedAt = Date.now();
    await order.save();

    res
      .status(200)
      .json({ success: true, message: "Slip uploaded successfully", slipUrl });
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

    const { from, to } = req.query;
    let query = user.role === "admin" ? {} : { userId };

    // ✅ ถ้ามีการกรองตามช่วงเวลา
    if (from && to) {
      query.createdAt = {
        $gte: new Date(from),
        $lte: new Date(to),
      };
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });
    if (!orders || orders.length === 0) {
      return res.status(200).json({
        success: true,
        orders: [],
        message: "No orders found",
      });
    }

    // ✅ แปลงข้อมูลให้เป็น ISO string
    const ordersData = orders.map((order) => {
      const orderData = order.toObject();
      orderData.createdAt = orderData.createdAt.toISOString();
      orderData.slipUploadDeadline =
        orderData.slipUploadDeadline?.toISOString();
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
      return res
        .status(403)
        .json({ success: false, error: "Access denied: Admin only" });
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

    // ✅ ตรวจสอบสิทธิ์ว่าเป็น admin เท่านั้น
    const user = await User.findOne({ userId });
    if (!user || user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, error: "Access denied: Admin only" });
    }

    // ✅ ตรวจสอบ status
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

    // ✅ หา order
    const order = await Order.findOne({ orderNumber: Number(orderNumber) });
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    // ✅ อัปเดตสถานะ
    order.status = status;
    order.updatedAt = Date.now();

    // ✅ ถ้ามีการส่งรูปหลังจัดส่ง
    if (status === "delivered" && req.files && req.files.postDeliveryImage) {
      const result = await cloudinary.uploader.upload(
        req.files.postDeliveryImage.tempFilePath,
        {
          folder: "delivery_images",
        }
      );
      order.postDeliveryImage = result.secure_url;
    }

    await order.save();

    // ✅ แปลงเวลาเป็น ISO string
    const orderData = order.toObject();
    orderData.createdAt = orderData.createdAt.toISOString();
    orderData.slipUploadDeadline =
      orderData.slipUploadDeadline?.toISOString();

    // ✅ แมปสถานะเป็นข้อความภาษาไทย
    const statusMessages = {
      pending: "กำลังตรวจสอบ",
      awaiting_verification: "รอยืนยัน",
      confirmed: "ยืนยันแล้ว",
      ready_to_ship: "พร้อมจัดส่ง",
      delivered: "จัดส่งสำเร็จ",
      cancelled: "ยกเลิก",
    };

    // ✅ ดึงอีเมลผู้ใช้
    const profile = await Profile.findOne({ userId: order.userId });
    const userEmail = profile?.email;

    // ✅ ส่งอีเมลถึงผู้ใช้
    if (userEmail) {
      await sendEmail({
        to: userEmail,
        subject: `อัปเดตสถานะคำสั่งซื้อ: ${statusMessages[status]}`,
        order,
        statusMessage: statusMessages[status],
        isThankYou: status === "delivered",
      });
    }

    // ✅ ส่งอีเมลถึงแอดมิน
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `อัปเดตสถานะคำสั่งซื้อ: ${statusMessages[status]}`,
      order,
      statusMessage: statusMessages[status],
      isThankYou: status === "delivered",
    });

    res.status(200).json({ success: true, order: orderData });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// Endpoint สำหรับยกเลิกออเดอร์ที่เกิน deadline (เรียกโดย cron)
router.post("/cancel-expired", async (req, res) => {
  try {
    const now = new Date();
    const expiredOrders = await Order.find({
      status: "pending",
      slipUrl: { $exists: false },
      slipUploadDeadline: { $lt: now },
    });

    if (expiredOrders.length > 0) {
      await Order.updateMany(
        {
          _id: { $in: expiredOrders.map((order) => order._id) },
        },
        {
          status: "cancelled",
          updatedAt: now,
        }
      );
      console.log(`Cancelled ${expiredOrders.length} expired orders`);
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
    const order = await Order.findOneAndUpdate(
      { orderNumber: Number(req.params.orderNumber) },
      { deliveryImageUrl: imageUrl, updatedAt: Date.now() },
      { new: true }
    );
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });
    res.status(200).json({ success: true, deliveryImageUrl: order.deliveryImageUrl });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// อัปโหลดสลิป
router.post("/:orderNumber/upload-slip", async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const order = await Order.findOne({ orderNumber });
    if (!order) {
      return res.status(404).json({ error: "ไม่พบคำสั่งซื้อ" });
    }

    if (!req.files || !req.files.slip) {
      return res.status(400).json({ error: "กรุณาอัปโหลดไฟล์สลิป" });
    }

    const slip = req.files.slip;
    // สมมติว่าใช้ Cloudinary
    const result = await cloudinary.uploader.upload(slip.tempFilePath, {
      folder: "order_slips",
    });
    order.paymentSlip = result.secure_url;
    await order.save();

    // ดึงอีเมลผู้ใช้
    const profile = await Profile.findOne({ userId: order.userId });
    const userEmail = profile?.email;

    // ส่งอีเมลถึงผู้ใช้
    if (userEmail) {
      await sendEmail({
        to: userEmail,
        subject: "อัปโหลดสลิปเรียบร้อย",
        order,
        statusMessage: "รอยืนยัน",
      });
    }

    // ส่งอีเมลถึงแอดมิน
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: "อัปโหลดสลิปสำหรับคำสั่งซื้อ",
      order,
      statusMessage: "รอยืนยัน",
    });

    res.status(200).json({ success: true, message: "อัปโหลดสลิปสำเร็จ" });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการอัปโหลดสลิป:", error);
    res.status(500).json({ error: error.message });
  }
});

// ยกเลิกคำสั่งซื้อ
router.post("/:orderNumber/cancel", async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const order = await Order.findOne({ orderNumber });
    if (!order) {
      return res.status(404).json({ error: "ไม่พบคำสั่งซื้อ" });
    }

    order.status = "cancelled";
    await order.save();

    // ดึงอีเมลผู้ใช้
    const profile = await Profile.findOne({ userId: order.userId });
    const userEmail = profile?.email;

    // ส่งอีเมลถึงผู้ใช้
    if (userEmail) {
      await sendEmail({
        to: userEmail,
        subject: "ยกเลิกคำสั่งซื้อ",
        order,
        statusMessage: "ยกเลิก",
        isCancellation: true,
      });
    }

    // ส่งอีเมลถึงแอดมิน
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: "ยกเลิกคำสั่งซื้อ",
      order,
      statusMessage: "ยกเลิก",
      isCancellation: true,
    });

    res.status(200).json({ success: true, message: "ยกเลิกคำสั่งซื้อสำเร็จ" });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการยกเลิกคำสั่งซื้อ:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;