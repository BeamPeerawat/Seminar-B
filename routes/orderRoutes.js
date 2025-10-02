import express from "express";
import Order from "../models/Order.js";
import Profile from "../models/Profile.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import OrderCounter from "../models/OrderCounter.js";
import authenticate from "../middleware/authenticate.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import sendEmail from "../utils/sendEmail.js";
import axios from "axios";

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

    const now = new Date();
    const dateStr = now.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });

    sendEmail({
      to: userEmail,
      subject: "ยืนยันคำสั่งซื้อ",
      text: `เรียน ${customer.name},\n\nคำสั่งซื้อของคุณได้รับการบันทึก:\n\n${orderDetails}\n\nด้วยความเคารพ,\nบริษัทของคุณ`,
      html: buildOrderEmailHTML({
        subject: "ยืนยันคำสั่งซื้อ",
        customer,
        orderNumber,
        date: dateStr,
        address: customer.address,
        installationAddress,
        phone: customer.phone,
        items,
        total,
        status: "รอดำเนินการ"
      })
    });
    sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: "ได้รับคำสั่งซื้อใหม่",
      text: `เรียน แอดมิน,\n\nมีคำสั่งซื้อใหม่:\n\n${orderDetails}\n\nด้วยความเคารพ,\nบริษัทของคุณ`,
      html: buildOrderEmailHTML({
        subject: "ได้รับคำสั่งซื้อใหม่",
        customer,
        orderNumber,
        date: dateStr,
        address: customer.address,
        installationAddress,
        phone: customer.phone,
        items,
        total,
        status: "รอดำเนินการ"
      })
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
      const dateStr = new Date(order.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
      sendEmail({
        to: userEmail,
        subject: "ยกเลิกคำสั่งซื้อ",
        text: `เรียน ${order.customer.name},\n\nคำสั่งซื้อถูกยกเลิกเนื่องจากเกินกำหนดอัปโหลดสลิป:\n\n${orderDetails}\n\nด้วยความเคารพ,\nบริษัทของคุณ`,
        html: buildOrderEmailHTML({
          subject: "ยกเลิกคำสั่งซื้อ",
          customer: order.customer,
          orderNumber: order.orderNumber,
          date: dateStr,
          address: order.customer.address,
          installationAddress: order.installationAddress,
          phone: order.customer.phone,
          items: order.items,
          total: order.total,
          status: "ยกเลิก",
          note: "คำสั่งซื้อของคุณถูกยกเลิกโดยอัตโนมัติเนื่องจากไม่ได้ชำระเงินภายในเวลาที่กำหนด"
        })
      });
      sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: "ยกเลิกคำสั่งซื้อ",
        text: `เรียน แอดมิน,\n\nคำสั่งซื้อถูกยกเลิก:\n\n${orderDetails}\n\nด้วยความเคารพ,\nบริษัทของคุณ`,
        html: buildOrderEmailHTML({
          subject: "ยกเลิกคำสั่งซื้อ",
          customer: order.customer,
          orderNumber: order.orderNumber,
          date: dateStr,
          address: order.customer.address,
          installationAddress: order.installationAddress,
          phone: order.customer.phone,
          items: order.items,
          total: order.total,
          status: "ยกเลิก",
          note: "คำสั่งซื้อของลูกค้าถูกยกเลิกโดยอัตโนมัติเนื่องจากไม่ได้ชำระเงินภายในเวลาที่กำหนด"
        })
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
    const dateStr = new Date(order.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
    sendEmail({
      to: userEmail,
      subject: "อัปโหลดสลิปเรียบร้อย",
      text: `เรียน ${order.customer.name},\n\nสลิปของคุณได้รับการอัปโหลด:\n\n${orderDetails}\n\nด้วยความเคารพ,\nบริษัทของคุณ`,
      html: buildOrderEmailHTML({
        subject: "อัปโหลดสลิปเรียบร้อย",
        customer: order.customer,
        orderNumber: order.orderNumber,
        date: dateStr,
        address: order.customer.address,
        installationAddress: order.installationAddress,
        phone: order.customer.phone,
        items: order.items,
        total: order.total,
        status: "รอยืนยัน"
      })
    });
    sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: "อัปโหลดสลิปสำหรับคำสั่งซื้อ",
      text: `เรียน แอดมิน,\n\nมีสลิปอัปโหลดใหม่:\n\n${orderDetails}\n\nด้วยความเคารพ,\nบริษัทของคุณ`,
      html: buildOrderEmailHTML({
        subject: "อัปโหลดสลิปสำหรับคำสั่งซื้อ",
        customer: order.customer,
        orderNumber: order.orderNumber,
        date: dateStr,
        address: order.customer.address,
        installationAddress: order.installationAddress,
        phone: order.customer.phone,
        items: order.items,
        total: order.total,
        status: "รอยืนยัน"
      })
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
    const dateStr = new Date(order.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
    sendEmail({
      to: userEmail,
      subject: `อัปเดตสถานะคำสั่งซื้อ: ${statusMessages[status] || status}`,
      text: `เรียน ${order.customer.name},\n\nคำสั่งซื้อของคุณได้รับการอัปเดต:\n\n${orderDetails}\n\nด้วยความเคารพ,\nบริษัทของคุณ`,
      html: buildOrderEmailHTML({
        subject: `อัปเดตสถานะคำสั่งซื้อ: ${statusMessages[status] || status}`,
        customer: order.customer,
        orderNumber: order.orderNumber,
        date: dateStr,
        address: order.customer.address,
        installationAddress: order.installationAddress,
        phone: order.customer.phone,
        items: order.items,
        total: order.total,
        status: statusMessages[status] || status,
        note: status === "delivered" ? "ขอบคุณที่ใช้บริการของเรา!" : ""
      })
    });
    sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `อัปเดตสถานะคำสั่งซื้อ: ${statusMessages[status] || status}`,
      text: `เรียน แอดมิน,\n\nคำสั่งซื้อได้รับการอัปเดต:\n\n${orderDetails}\n\nด้วยความเคารพ,\nบริษัทของคุณ`,
      html: buildOrderEmailHTML({
        subject: `อัปเดตสถานะคำสั่งซื้อ: ${statusMessages[status] || status}`,
        customer: order.customer,
        orderNumber: order.orderNumber,
        date: dateStr,
        address: order.customer.address,
        installationAddress: order.installationAddress,
        phone: order.customer.phone,
        items: order.items,
        total: order.total,
        status: statusMessages[status] || status,
        note: status === "delivered" ? "ขอบคุณที่ใช้บริการของเรา!" : ""
      })
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
    const dateStr = new Date(order.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
    sendEmail({
      to: userEmail,
      subject: "อัปโหลดรูปภาพการจัดส่ง",
      text: `เรียน ${order.customer.name},\n\nรูปภาพการจัดส่งได้รับการอัปโหลด:\n\n${orderDetails}\n\nด้วยความเคารพ,\nบริษัทของคุณ`,
      html: buildOrderEmailHTML({
        subject: "อัปโหลดรูปภาพการจัดส่ง",
        customer: order.customer,
        orderNumber: order.orderNumber,
        date: dateStr,
        address: order.customer.address,
        installationAddress: order.installationAddress,
        phone: order.customer.phone,
        items: order.items,
        total: order.total,
        status: order.status === "delivered" ? "จัดส่งสำเร็จ" : order.status,
        note: order.status === "delivered" ? "ขอบคุณที่ใช้บริการของเรา!" : ""
      })
    });
    sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: "อัปโหลดรูปภาพการจัดส่ง",
      text: `เรียน แอดมิน,\n\nรูปภาพการจัดส่งได้รับการอัปโหลด:\n\n${orderDetails}\n\nด้วยความเคารพ,\nบริษัทของคุณ`,
      html: buildOrderEmailHTML({
        subject: "อัปโหลดรูปภาพการจัดส่ง",
        customer: order.customer,
        orderNumber: order.orderNumber,
        date: dateStr,
        address: order.customer.address,
        installationAddress: order.installationAddress,
        phone: order.customer.phone,
        items: order.items,
        total: order.total,
        status: order.status === "delivered" ? "จัดส่งสำเร็จ" : order.status,
        note: order.status === "delivered" ? "ขอบคุณที่ใช้บริการของเรา!" : ""
      })
    });

    res.status(200).json({ success: true, deliveryImageUrl: order.deliveryImageUrl });
  } catch (error) {
    console.error("Error uploading delivery image:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ตรวจสอบสลิป (SlipOk API)
router.post("/verify-slip", async (req, res) => {
  try {
    const { slipUrl } = req.body;
    if (!slipUrl) {
      return res.status(400).json({ success: false, error: "No slipUrl" });
    }

const slipOkRes = await axios.post(
  "https://api.slipok.com/api/line/apikey/53422",
  { url: slipUrl },
  {
    headers: {
      "x-authorization": process.env.SLIPOK_API_KEY,  // ✅ ใช้ x-authorization
      "Content-Type": "application/json",
    },
  }
);


    console.log("SlipOK response:", slipOkRes.data);

    const result = slipOkRes.data;

    if (!result.success || !result.data?.success) {
      return res.status(200).json({
        success: false,
        message: result.data?.message || result.message || "ตรวจสอบสลิปไม่ผ่าน",
      });
    }

    return res.json({ success: true, slipData: result.data });
  } catch (error) {
    console.error("Error calling SlipOK:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || null,
    });
  }
});




function buildOrderEmailHTML({ subject, customer, orderNumber, date, address, installationAddress, phone, items, total, status, note }) {
  // ป้องกัน [object Object]
  const installAddr = typeof installationAddress === "object"
    ? Object.values(installationAddress).join(" ")
    : installationAddress || "ไม่ระบุ";

  // สีสถานะ
  const statusColor = {
    "รอดำเนินการ": "#007bff",
    "รอยืนยัน": "#17a2b8",
    "ยืนยันแล้ว": "#28a745",
    "พร้อมจัดส่ง": "#ffc107",
    "จัดส่งสำเร็จ": "#6610f2",
    "ยกเลิก": "#dc3545",
    "รอตรวจสอบ": "#fd7e14"
  }[status] || "#333";

  return `
    <div style="font-family:'Kanit',Arial,sans-serif;max-width:600px;margin:auto;background:#f9f9f9;padding:32px 24px;border-radius:12px;border:1px solid #e5e5e5;">
      <div style="text-align:center;margin-bottom:24px;">
        <img src="https://www.facebook.com/photo/?fbid=927682589146601&set=a.568816241699906" alt="Logo" width="64" style="margin-bottom:8px;" />
        <h2 style="color:#007bff;margin:0;">Auto Solar</h2>
      </div>
      <div style="background:#fff;padding:24px 20px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
        <h3 style="color:#333;margin-top:0;">${subject}</h3>
        <p style="font-size:1.1em;"><b>เรียน ${customer.name},</b></p>
        <table style="width:100%;border-collapse:collapse;font-size:1em;margin-bottom:16px;">
          <tr><td style="font-weight:bold;padding:4px 0;">เลขที่คำสั่งซื้อ:</td><td style="padding:4px 0;">#${orderNumber}</td></tr>
          <tr><td style="font-weight:bold;padding:4px 0;">วันที่:</td><td style="padding:4px 0;">${date}</td></tr>
          <tr><td style="font-weight:bold;padding:4px 0;">ลูกค้า:</td><td style="padding:4px 0;">${customer.name}</td></tr>
          <tr><td style="font-weight:bold;padding:4px 0;">ที่อยู่:</td><td style="padding:4px 0;">${address}</td></tr>
          <tr><td style="font-weight:bold;padding:4px 0;">ที่อยู่ติดตั้ง:</td><td style="padding:4px 0;">${installAddr}</td></tr>
          <tr><td style="font-weight:bold;padding:4px 0;">เบอร์โทร:</td><td style="padding:4px 0;">${phone}</td></tr>
        </table>
        ${items && items.length > 0 ? `
        <h4 style="margin-bottom:8px;">รายการสินค้า</h4>
        <ul style="padding-left:20px;">
          ${items.map(item => `<li>${item.name} (จำนวน: ${item.quantity}, ราคา: ฿${item.price.toLocaleString()})</li>`).join("")}
        </ul>
        <p style="font-size:1.1em;margin-top:16px;"><b>ยอดรวม:</b> <span style="color:#28a745;">฿${total?.toLocaleString()}</span></p>
        ` : ""}
        <p style="font-size:1.05em;"><b>สถานะ:</b> <span style="color:${statusColor};">${status}</span></p>
        ${note ? `<div style="margin-top:16px;padding:12px 16px;background:#fff3cd;border-radius:6px;color:#856404;border:1px solid #ffeeba;">${note}</div>` : ""}
      </div>
      <div style="margin-top:32px;text-align:center;color:#888;font-size:0.95em;">
        <hr style="margin:24px 0 16px 0;border:none;border-top:1px solid #eee;">
        <div>Auto Solar<br/>โทร. 080-0495522</div>
        <div style="margin-top:8px;">
          <a href="https://seminar-f.vercel.app/" style="color:#007bff;text-decoration:none;">เยี่ยมชมเว็บไซต์</a>
        </div>
      </div>
    </div>
  `;
}

// เพิ่ม route สำหรับยกเลิกออเดอร์
router.post("/:orderNumber/cancel", async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const userId = req.user.userId;

    const order = await Order.findOne({ 
      orderNumber: Number(orderNumber),
      userId,
      status: "pending"
    });

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: "ไม่พบออเดอร์ หรือไม่สามารถยกเลิกได้" 
      });
    }

    order.status = "cancelled";
    order.updatedAt = Date.now();
    await order.save();

    res.status(200).json({ 
      success: true, 
      message: "ยกเลิกออเดอร์สำเร็จ" 
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

export default router;