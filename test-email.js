import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.GMAIL_HOST,
  port: process.env.GMAIL_PORT || 587,
  secure: process.env.GMAIL_PORT === "465",
  auth: {
    user: process.env.GMAIL_USERNAME,
    pass: process.env.GMAIL_PASSWORD,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

const testEmail = async () => {
  const mailOptions = {
    from: `"Auto Solar" <${process.env.EMAIL_USER}>`,
    to: "beamsaenpong@gmail.com,warissara.yu@gmail.com,peerawat.sa@rmuti.ac.th",
    subject: "Test Email from Gmail SMTP",
    text: "This is a test email from Gmail SMTP for Auto Solar.",
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Test email failed:", error);
    } else {
      console.log("Test email sent:", info.messageId);
    }
  });
};

testEmail();