import nodemailer from "nodemailer";

const sendEmail = ({ to, subject, text }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === "true", // true สำหรับ port 465, false สำหรับ 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // เพิ่ม timeout และ retry
    connectionTimeout: 10000, // 10 วินาที
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  const mailOptions = {
    from: `"บริษัทของคุณ" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
  };

  // ส่งอีเมลแบบ non-blocking พร้อม retry
  let retries = 3;
  const send = () => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(`Failed to send email to ${to}:`, error);
        if (retries > 0 && error.code === "ETIMEDOUT") {
          console.log(`Retrying email to ${to} (${retries} attempts left)`);
          retries--;
          setTimeout(send, 1000); // รอ 1 วินาทีก่อน retry
        }
      } else {
        console.log(`Email sent to ${to}: ${info.response}`);
      }
    });
  };
  send();
};

export default sendEmail;