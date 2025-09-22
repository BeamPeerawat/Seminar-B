import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.GMAIL_HOST,
  port: process.env.GMAIL_PORT,
  secure: process.env.GMAIL_PORT == 465, // true ถ้าใช้ 465
  auth: {
    user: process.env.GMAIL_USERNAME,
    pass: process.env.GMAIL_PASSWORD,
  },
});

export default async function sendEmail({ to, subject, text }) {
  try {
    await transporter.sendMail({
      from: `"My Shop" <${process.env.GMAIL_USERNAME}>`,
      to,
      subject,
      text,
    });
    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error);
  }
}
