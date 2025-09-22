import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.GMAIL_HOST,
  port: process.env.GMAIL_PORT || 587,
  secure: false, // ใช้ STARTTLS สำหรับพอร์ต 587
  auth: {
    user: process.env.GMAIL_USERNAME,
    pass: process.env.GMAIL_PASSWORD,
  },
  connectionTimeout: 15000, // 15 วินาที
  greetingTimeout: 15000,
  socketTimeout: 15000,
  tls: {
    rejectUnauthorized: false, // เพื่อหลีกเลี่ยงปัญหา certificate บน Render
  },
});

const sendEmail = async ({ to, subject, text }) => {
  const mailOptions = {
    from: `"Auto Solar" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}:`, info.messageId);
    return info;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    throw error;
  }
};

export default sendEmail;