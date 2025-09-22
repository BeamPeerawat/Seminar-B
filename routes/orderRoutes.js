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
  try {
    const counter = await OrderCounter.findByIdAndUpdate(
      "order_counter",
      { $inc: { sequence_value: 1 } },
      { new: true, upsert: true }
    );
    return counter.sequence_value;
  } catch (error) {
    console.error("Error generating order number:", error);
    throw new Error("Failed to generate order number");
  }
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
      console.error("Missing required fields:", { items, total, customer, paymentMethod, userId });
      return res.status(400).json({ success: false, error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    // ตรวจสอบว่า items เป็น array และมีข้อมูล
    if (!Array.isArray(items) || items.length === 0) {
      console.error("Invalid items array:", items);
      return res.status(400).json({ success: false, error: "รายการสินค้าต้องไม่ว่างเปล่า" });
    }

    // ตรวจสอบว่า customer มีข้อมูลที่จำเป็น
    if (!customer.name || !customer.address || !customer.phone) {
      console.error("Invalid customer data:", customer);
      return res.status(400).json({ success: false, error: "กรุณาระบุชื่อ ที่อยู่ และเบอร์โทรของลูกค้า" });
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
    console.log(`Order created successfully: #${orderNumber}`);

    // ดึงอีเมลผู้ใช้จาก Profile
    const profile = await Profile.findOne({ userId });
    const userEmail = profile?.email;

    // ส่งอีเมลถึงผู้ใช้ (ถ้ามีอีเมล)
    if (userEmail) {
      try {
        await sendEmail({
          to: userEmail,
          subject: "ยืนยันคำสั่งซื้อ",
          order: newOrder,
          statusMessage: "รอดำเนินการ",
        });
        console.log(`Email sent to user: ${userEmail}`);
      } catch (emailError) {
        console.error(`Failed to send email to user ${userEmail}:`, emailError);
      }
    } else {
      console.warn(`No email found for userId: ${userId}`);
    }

    // ส่งอีเมลถึงแอดมิน
    try {
      await sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: "ได้รับคำสั่งซื้อใหม่",
        order: newOrder,
        statusMessage: "รอดำเนินการ",
      });
      console.log(`Email sent to admin: ${process.env.ADMIN_EMAIL}`);
    } catch (emailError) {
      console.error(`Failed to send email to admin ${process.env.ADMIN_EMAIL}:`, emailError);
    }

    // ส่ง response ที่ frontend คาดหวัง
    const orderData = newOrder.toObject();
    orderData.createdAt = orderData.createdAt.toISOString();
    orderData.slipUploadDeadline = orderData.slipUploadDeadline?.toISOString();

    res.status(201).json({
      success: true,
      order: orderData,
      orderNumber: newOrder.orderNumber,
      message: "Order created successfully",
    });
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
      console.error("Missing orderNumber or slipUrl:", { orderNumber, slipUrl });
      return res.status(400).json({ success: false, error: "กรุณาระบุ orderNumber และ slipUrl" });
    }

    // ตรวจสอบว่า slipUrl เป็น URL ที่ถูกต้องและมาจาก Cloudinary
    const cloudinaryUrlPattern = /^https:\/\/res\.cloudinary\.com\/debhfdjki\//;
    if (!cloudinaryUrlPattern.test(slipUrl)) {
      console.error("Invalid slipUrl:", slipUrl);
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
      console.error(`Order not found: #${orderNumber}, userId: ${userId}`);
      return res.status(404).json({ success: false, error: "ไม่พบคำสั่งซื้อ" });
    }

    // ตรวจสอบสถานะ
    if (order.status === "confirmed") {
      console.warn(`Order already confirmed: #${orderNumber}`);
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
        try {
          await sendEmail({
            to: userEmail,
            subject: "ยกเลิกคำสั่งซื้อ",
            order,
            statusMessage: "ยกเลิก",
            isCancellation: true,
          });
          console.log(`Cancellation email sent to user: ${userEmail}`);
        } catch (emailError) {
          console.error(`Failed to send cancellation email to user ${userEmail}:`, emailError);
        }
      }
      try {
        await sendEmail({
          to: process.env.ADMIN_EMAIL,
          subject: "ยกเลิกคำสั่งซื้อ",
          order,
          statusMessage: "ยกเลิก",
          isCancellation: true,
        });
        console.log(`Cancellation email sent to admin: ${process.env.ADMIN_EMAIL}`);
      } catch (emailError) {
        console.error(`Failed to send cancellation email to admin ${process.env.ADMIN_EMAIL}:`, emailError);
      }

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
      try {
        await sendEmail({
          to: userEmail,
          subject: "อัปโหลดสลิปเรียบร้อย",
          order,
          statusMessage: "รอยืนยัน",
        });
        console.log(`Slip upload email sent to user: ${userEmail}`);
      } catch (emailError) {
        console.error(`Failed to send slip upload email to user ${userEmail}:`, emailError);
      }
    }

    // ส่งอีเมลถึงแอดมิน
    try {
      await sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: "อัปโหลดสลิปสำหรับคำสั่งซื้อ",
        order,
        statusMessage: "รอยืนยัน",
      });
      console.log(`Slip upload email sent to admin: ${process.env.ADMIN_EMAIL}`);
    } catch (emailError) {
      console.error(`Failed to send slip upload email to admin ${process.env.ADMIN_EMAIL}:`, emailError);
    }

    res.status(200).json({ success: true, message: "อัปโหลดสลิปสำเร็จ", slipUrl });
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
      console.error(`User not found: ${userId}`);
      return res.status(404).json({ success: false, error: "ไม่พบผู้ใช้" });
    }

    const query =
      user.role === "admin"
        ? { orderNumber: Number(orderNumber) }
        : { orderNumber: Number(orderNumber), userId };

    const order = await Order.findOne(query);
    if (!order) {
      console.error(`Order not found: #${orderNumber}, userId: ${userId}`);
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
      console.error(`User not found: ${userId}`);
      return res.status(404).json({ success: false, error: "ไม่พบผู้ใช้" });
    }

    const query = user.role === "admin" ? {} : { userId };

    const orders = await Order.find(query).sort({ createdAt: -1 });
    if (!orders || orders.length === 0) {
      console.log(`No orders found for userId: ${userId}`);
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
    console.error("Error fetching orders:", error);
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
    console.log(`Fetching pending orders for userId: ${userId}`);

    const user = await User.findOne({ userId });
    if (!user) {
      console.error(`User not found: ${userId}`);
      return res.status(404).json({ success: false, error: "ไม่พบผู้ใช้" });
    }

    if (user.role !== "admin") {
      console.warn(`Access denied: User ${userId} is not admin`);
      return res.status(403).json({ success: false, error: "การเข้าถึงถูกปฏิเสธ: เฉพาะแอดมินเท่านั้น" });
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
      message: orders.length === 0 ? "ไม่พบคำสั่งซื้อที่รอดำเนินการ" : undefined,
    });
  } catch (error) {
    console.error("Error fetching pending orders:", error);
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
      console.warn(`Access denied: User ${userId} is not admin`);
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
      console.error("Invalid status:", status);
      return res.status(400).json({ success: false, error: "สถานะไม่ถูกต้อง" });
    }

    const order = await Order.findOneAndUpdate(
      { orderNumber: Number(orderNumber) },
      { status, updatedAt: Date.now() },
      { new: true }
    );

    if (!order) {
      console.error(`Order not found: #${orderNumber}`);
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
      try {
        await sendEmail({
          to: userEmail,
          subject: `อัปเดตสถานะคำสั่งซื้อ: ${statusMessages[status]}`,
          order,
          statusMessage: statusMessages[status],
          isThankYou: status === "delivered",
        });
        console.log(`Status update email sent to user: ${userEmail}`);
      } catch (emailError) {
        console.error(`Failed to send status update email to user ${userEmail}:`, emailError);
      }
    }

    // ส่งอีเมลถึงแอดมิน
    try {
      await sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: `อัปเดตสถานะคำสั่งซื้อ: ${statusMessages[status]}`,
        order,
        statusMessage: statusMessages[status],
        isThankYou: status === "delivered",
      });
      console.log(`Status update email sent to admin: ${process.env.ADMIN_EMAIL}`);
    } catch (emailError) {
      console.error(`Failed to send status update email to admin ${process.env.ADMIN_EMAIL}:`, emailError);
    }

    const orderData = order.toObject();
    orderData.createdAt = orderData.createdAt.toISOString();
    orderData.slipUploadDeadline = orderData.slipUploadDeadline?.toISOString();

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
      for (const order of expiredOrders) {
        order.status = "cancelled";
        order.updatedAt = now;
        await order.save();

        // ดึงอีเมลผู้ใช้
        const profile = await Profile.findOne({ userId: order.userId });
        const userEmail = profile?.email;

        // ส่งอีเมลถึงผู้ใช้
        if (userEmail) {
          try {
            await sendEmail({
              to: userEmail,
              subject: "ยกเลิกคำสั่งซื้อ",
              order,
              statusMessage: "ยกเลิก",
              isCancellation: true,
            });
            console.log(`Cancellation email sent to user: ${userEmail}`);
          } catch (emailError) {
            console.error(`Failed to send cancellation email to user ${userEmail}:`, emailError);
          }
        }

        // ส่งอีเมลถึงแอดมิน
        try {
          await sendEmail({
            to: process.env.ADMIN_EMAIL,
            subject: "ยกเลิกคำสั่งซื้อ",
            order,
            statusMessage: "ยกเลิก",
            isCancellation: true,
          });
          console.log(`Cancellation email sent to admin: ${process.env.ADMIN_EMAIL}`);
        } catch (emailError) {
          console.error(`Failed to send cancellation email to admin ${process.env.ADMIN_EMAIL}:`, emailError);
        }
      }
      console.log(`Cancelled ${expiredOrders.length} expired orders`);
    }

    res.status(200).json({
      success: true,
      message: `ยกเลิก ${expiredOrders.length} คำสั่งซื้อที่หมดอายุ`,
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
      console.warn(`Access denied: User ${userId} is not admin`);
      return res.status(403).json({ success: false, error: "การเข้าถึงถูกปฏิเสธ: เฉพาะแอดมินเท่านั้น" });
    }

    // ตรวจสอบว่า imageUrl เป็น URL ที่ถูกต้องและมาจาก Cloudinary
    const cloudinaryUrlPattern = /^https:\/\/res\.cloudinary\.com\/debhfdjki\//;
    if (!imageUrl || !cloudinaryUrlPattern.test(imageUrl)) {
      console.error("Invalid imageUrl:", imageUrl);
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
      console.error(`Order not found: #${req.params.orderNumber}`);
      return res.status(404).json({ success: false, error: "ไม่พบคำสั่งซื้อ" });
    }

    // ส่งอีเมลถึงผู้ใช้
    const profile = await Profile.findOne({ userId: order.userId });
    const userEmail = profile?.email;
    if (userEmail) {
      try {
        await sendEmail({
          to: userEmail,
          subject: "อัปโหลดรูปภาพการจัดส่ง",
          order,
          statusMessage: order.status === "delivered" ? "จัดส่งสำเร็จ" : order.status,
          isThankYou: order.status === "delivered",
        });
        console.log(`Delivery image email sent to user: ${userEmail}`);
      } catch (emailError) {
        console.error(`Failed to send delivery image email to user ${userEmail}:`, emailError);
      }
    }

    // ส่งอีเมลถึงแอดมิน
    try {
      await sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: "อัปโหลดรูปภาพการจัดส่ง",
        order,
        statusMessage: order.status === "delivered" ? "จัดส่งสำเร็จ" : order.status,
        isThankYou: order.status === "delivered",
      });
      console.log(`Delivery image email sent to admin: ${process.env.ADMIN_EMAIL}`);
    } catch (emailError) {
      console.error(`Failed to send delivery image email to admin ${process.env.ADMIN_EMAIL}:`, emailError);
    }

    res.status(200).json({ success: true, deliveryImageUrl: order.deliveryImageUrl });
  } catch (error) {
    console.error("Error uploading delivery image:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;