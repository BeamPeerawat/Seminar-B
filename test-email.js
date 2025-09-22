import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.GMAIL_HOST,
  port: process.env.GMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USERNAME,
    pass: process.env.GMAIL_PASSWORD,
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 15000,
  tls: {
    rejectUnauthorized: false,
  },
});

const testEmail = async () => {
  const mailOptions = {
    from: `"Auto Solar" <${process.env.EMAIL_USER}>`,
    to: "beamsaenpong@gmail.com,warissara.yu@gmail.com,peerawat.sa@rmuti.ac.th",
    subject: "Test Email from Gmail SMTP",
    text: "This is a test email from Gmail SMTP for Auto Solar.",
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Test email sent:", info.messageId);
  } catch (error) {
    console.error("Test email failed:", error);
  }
};

testEmail();