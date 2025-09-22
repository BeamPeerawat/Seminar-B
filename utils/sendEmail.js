import nodemailer from "nodemailer";

const sendEmail = ({ to, subject, text }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"บริษัทของคุณ" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
  };

  // ส่งอีเมลแบบ non-blocking
  transporter.sendMail(mailOptions, (error) => {
    if (error) {
      console.error(`Failed to send email to ${to}:`, error);
    } else {
      console.log(`Email sent to ${to}`);
    }
  });
};

export default sendEmail;