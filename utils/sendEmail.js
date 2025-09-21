import nodemailer from "nodemailer";

const sendEmail = async ({ to, subject, order, statusMessage, isCancellation = false, isThankYou = false }) => {
  try {
    // สร้าง transporter สำหรับส่งอีเมล
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false, // ใช้ TLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // จัดรูปแบบรายละเอียดคำสั่งซื้อ
    const orderDetails = `
      เลขที่คำสั่งซื้อ: #${order.orderNumber}
      วันที่: ${new Date(order.createdAt).toLocaleString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Bangkok",
      })}
      ลูกค้า: ${order.customer.name}
      ที่อยู่: ${order.customer.address}
      เบอร์โทร: ${order.customer.phone}
      รายการสินค้า:
      ${order.items
        .map(
          (item) => `- ${item.name} (จำนวน: ${item.quantity}, ราคา: ฿${item.price.toLocaleString()})`
        )
        .join("\n")}
      ยอดรวม: ฿${order.total.toLocaleString()}
      สถานะ: ${statusMessage}${isThankYou ? "\nขอบคุณที่ใช้บริการของเรา!" : ""}
    `;

    // เนื้อหาอีเมล
    const mailOptions = {
      from: `"บริษัทของคุณ" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text: `
${isCancellation ? "แจ้งการยกเลิกคำสั่งซื้อ" : "แจ้งสถานะคำสั่งซื้อ"}

เรียน ${isCancellation || to === process.env.ADMIN_EMAIL ? "แอดมิน" : order.customer.name},

${isCancellation ? "คำสั่งซื้อต่อไปนี้ถูกยกเลิกแล้ว:" : "คำสั่งซื้อของคุณได้รับการอัปเดตดังนี้:"}

${orderDetails}

ด้วยความเคารพ,
บริษัทของคุณ
      `,
    };

    // ส่งอีเมล
    await transporter.sendMail(mailOptions);
    console.log(`ส่งอีเมลถึง ${to} สำหรับคำสั่งซื้อ #${order.orderNumber}`);
  } catch (error) {
    console.error(`เกิดข้อผิดพลาดในการส่งอีเมลถึง ${to}:`, error);
    throw new Error(`ไม่สามารถส่งอีเมลได้: ${error.message}`);
  }
};

export default sendEmail;