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

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!items || !total || !customer || !paymentMethod || !userId) {
      return res.status(400).json({ success: false, error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    const orderNumber = await getNextOrderNumber();
    const slipUploadDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ชม.

    const newOrder = new Order({
      orderNumber,
      userId,
      items,
      total,
      customer,
      paymentMethod,
      installationAddress,
      slipUploadDeadline,
      status: "pending",
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
        statusMessage: "รอดำเนินการ",
      });
    }

    // ส่งอีเมลถึงแอดมิน
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: "ได้รับคำสั่งซื้อใหม่",
      order: newOrder,
      statusMessage: "รอดำเนินการ",
    });

    res.status(201).json({ success: true, order: newOrder, orderNumber: newOrder.orderNumber });
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
      return res.status(400).json({ success: false, error: "กรุณาระบุ orderNumber และ slipUrl" });
    }

    // ตรวจสอบว่า slipUrl เป็น URL ที่ถูกต้องและมาจาก Cloudinary
    const cloudinaryUrlPattern = /^https:\/\/res\.cloudinary\.com\/debhfdjki\//;
    if (!cloudinaryUrlPattern.test(slipUrl)) {
      return res.status(400).json({
        success: false,
        error: "slipUrl ไม่ถูกต้อง: ต้องเป็น URL จาก Cloudinary",
      });
    }

    const order = await Order.findOne({
      orderNumber: Number(orderNumber),
      userId,
    });
    if (!order) {
      return res.status(404).json({ success: false, error: "ไม่พบคำสั่งซื้อ" });
    }

    // ตรวจสอบสถานะ
    if (order.status === "confirmed") {
      return res.status(403).json({ success: false, error: "ไม่สามารถอัปโหลดสลิป: คำสั่งซื้อได้รับการยืนยันแล้ว" });
    }

    // ตรวจสอบ deadline
    const now = new Date();
    if (now > order.slipUploadDeadline) {
      order.status = "cancelled";
      order.updatedAt = Date.now();
      await order.save();

      // ส่งอีเมลแจ้งการยกเลิก
      const profile = await Profile.findOne({ userId });
      const userEmail = profile?.email;
      if (userEmail) {
        await sendEmail({
          to: userEmail,
          subject: "ยกเลิกคำสั่งซื้อ",
          order,
          statusMessage: "ยกเลิก",
          isCancellation: true,
        });
      }
      await sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: "ยกเลิกคำสั่งซื้อ",
        order,
        statusMessage: "ยกเลิก",
        isCancellation: true,
      });

      return res.status(403).json({ success: false, error: "เกินกำหนดเวลาอัปโหลดสลิป" });
    }

    order.slipUrl = slipUrl;
    order.status = "awaiting_verification";
    order.updatedAt = Date.now();
    await order.save();

    // ส่งอีเมลถึงผู้ใช้
    const profile = await Profile.findOne({ userId });
    const userEmail = profile?.email;
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

    res.status(200).json({ success: true, message: "อัปโหลดสลิปสำเร็จ", slipUrl });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการอัปโหลดสลิป:", error);
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
      return res.status(404).json({ success: false, error: "ไม่พบผู้ใช้" });
    }

    const query =
      user.role === "admin"
        ? { orderNumber: Number(orderNumber) }
        : { orderNumber: Number(orderNumber), userId };

    const order = await Order.findOne(query);
    if (!order) {
      return res.status(404).json({ success: false, error: "ไม่พบคำสั่งซื้อ" });
    }

    const orderData = order.toObject();
    orderData.createdAt = orderData.createdAt.toISOString();
    orderData.slipUploadDeadline = orderData.slipUploadDeadline?.toISOString();

    res.status(200).json({
      success: true,
      order: orderData,
    });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการดึงข้อมูลคำสั่งซื้อ:", error);
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
      return res.status(404).json({ success: false, error: "ไม่พบผู้ใช้" });
    }

    const query = user.role === "admin" ? {} : { userId };

    const orders = await Order.find(query).sort({ createdAt: -1 });
    if (!orders || orders.length === 0) {
      return res.status(200).json({
        success: true,
        orders: [],
        message: "ไม่พบคำสั่งซื้อ",
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
    console.error("เกิดข้อผิดพลาดในการดึงข้อมูลคำสั่งซื้อ:", error);
    res.status(500).json({
      success: false,
      error: "ไม่สามารถดึงข้อมูลคำสั่งซื้อได้",
      details: error.message,
    });
  }
});

// ดึงออเดอร์ที่รอดำเนินการ (สำหรับแอดมิน)
router.get("/pending", async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log(`กำลังดึงคำสั่งซื้อที่รอดำเนินการสำหรับ userId: ${userId}`);

    const user = await User.findOne({ userId });
    if (!user) {
      console.log(`ไม่พบผู้ใช้: ${userId}`);
      return res.status(404).json({ success: false, error: "ไม่พบผู้ใช้" });
    }

    if (user.role !== "admin") {
      console.log(`การเข้าถึงถูกปฏิเสธ: ผู้ใช้ ${userId} ไม่ใช่แอดมิน`);
      return res.status(403).json({ success: false, error: "การเข้าถึงถูกปฏิเสธ: เฉพาะแอดมินเท่านั้น" });
    }

    const orders = await Order.find({ status: "pending" }).sort({
      createdAt: -1,
    });
    console.log(`พบ ${orders.length} คำสั่งซื้อที่รอดำเนินการ`);

    const ordersData = orders.map((order) => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt.toISOString(),
      slipUploadDeadline: order.slipUploadDeadline?.toISOString(),
    }));

    res.status(200).json({
      success: true,
      orders: ordersData,
      message: orders.length === 0 ? "ไม่พบคำสั่งซื้อที่รอดำเนินการ" : undefined,
    });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการดึงคำสั่งซื้อที่รอดำเนินการ:", error);
    res.status(500).json({
      success: false,
      error: "ไม่สามารถดึงคำสั่งซื้อที่รอดำเนินการได้",
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
      return res.status(403).json({ success: false, error: "การเข้าถึงถูกปฏิเสธ: เฉพาะแอดมินเท่านั้น" });
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
      return res.status(400).json({ success: false, error: "สถานะไม่ถูกต้อง" });
    }

    const order = await Order.findOneAndUpdate(
      { orderNumber: Number(orderNumber) },
      { status, updatedAt: Date.now() },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, error: "ไม่พบคำสั่งซื้อ" });
    }

    // แมปสถานะเป็นข้อความภาษาไทย
    const statusMessages = {
      pending: "รอดำเนินการ",
      awaiting_verification: "รอยืนยัน",
      confirmed: "ยืนยันแล้ว",
      ready_to_ship: "พร้อมจัดส่ง",
      delivered: "จัดส่งสำเร็จ",
      cancelled: "ยกเลิก",
    };

    // ดึงอีเมลผู้ใช้
    const profile = await Profile.findOne({ userId: order.userId });
    const userEmail = profile?.email;

    // ส่งอีเมลถึงผู้ใช้
    if (userEmail) {
      await sendEmail({
        to: userEmail,
        subject: `อัปเดตสถานะคำสั่งซื้อ: ${statusMessages[status]}`,
        order,
        statusMessage: statusMessages[status],
        isThankYou: status === "delivered",
      });
    }

    // ส่งอีเมลถึงแอดมิน
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `อัปเดตสถานะคำสั่งซื้อ: ${statusMessages[status]}`,
      order,
      statusMessage: statusMessages[status],
      isThankYou: status === "delivered",
    });

    const orderData = order.toObject();
    orderData.createdAt = orderData.createdAt.toISOString();
    orderData.slipUploadDeadline = orderData.slipUploadDeadline?.toISOString();

    res.status(200).json({ success: true, order: orderData });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการอัปเดตสถานะ:", error);
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
      for (const order of expiredOrders) {
        order.status = "cancelled";
        order.updatedAt = now;
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
      }
      console.log(`ยกเลิก ${expiredOrders.length} คำสั่งซื้อที่หมดอายุ`);
    }

    res.status(200).json({
      success: true,
      message: `ยกเลิก ${expiredOrders.length} คำสั่งซื้อที่หมดอายุ`,
    });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการยกเลิกคำสั่งซื้อที่หมดอายุ:", error);
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
      return res.status(403).json({ success: false, error: "การเข้าถึงถูกปฏิเสธ: เฉพาะแอดมินเท่านั้น" });
    }

    // ตรวจสอบว่า imageUrl เป็น URL ที่ถูกต้องและมาจาก Cloudinary
    const cloudinaryUrlPattern = /^https:\/\/res\.cloudinary\.com\/debhfdjki\//;
    if (!imageUrl || !cloudinaryUrlPattern.test(imageUrl)) {
      return res.status(400).json({
        success: false,
        error: "imageUrl ไม่ถูกต้อง: ต้องเป็น URL จาก Cloudinary",
      });
    }

    const order = await Order.findOneAndUpdate(
      { orderNumber: Number(req.params.orderNumber) },
      { deliveryImageUrl: imageUrl, updatedAt: Date.now() },
      { new: true }
    );
    if (!order) {
      return res.status(404).json({ success: false, error: "ไม่พบคำสั่งซื้อ" });
    }

    // ส่งอีเมลถึงผู้ใช้
    const profile = await Profile.findOne({ userId: order.userId });
    const userEmail = profile?.email;
    if (userEmail) {
      await sendEmail({
        to: userEmail,
        subject: "อัปโหลดรูปภาพการจัดส่ง",
        order,
        statusMessage: order.status === "delivered" ? "จัดส่งสำเร็จ" : order.status,
        isThankYou: order.status === "delivered",
      });
    }

    // ส่งอีเมลถึงแอดมิน
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: "อัปโหลดรูปภาพการจัดส่ง",
      order,
      statusMessage: order.status === "delivered" ? "จัดส่งสำเร็จ" : order.status,
      isThankYou: order.status === "delivered",
    });

    res.status(200).json({ success: true, deliveryImageUrl: order.deliveryImageUrl });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพการจัดส่ง:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;