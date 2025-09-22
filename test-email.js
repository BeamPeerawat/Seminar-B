import nodemailer from "nodemailer";
import dotenv from "dotenv";

// โหลด environment variables จาก .env
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === "true", // true สำหรับ port 465, false สำหรับ 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

transporter.sendMail(
  {
    from: `"Test" <${process.env.EMAIL_USER}>`,
    to: "beamsaenpong@gmail.com",
    subject: "Test Email",
    text: "This is a test email.",
  },
  (error, info) => {
    if (error) {
      console.error("Test email failed:", error);
    } else {
      console.log("Test email sent:", info.response);
    }
  }
);