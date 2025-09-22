import nodemailer from "nodemailer";
   import dotenv from "dotenv";

   dotenv.config();

   const transporter = nodemailer.createTransport({
     host: process.env.GMAIL_HOST,
     port: process.env.GMAIL_PORT,
     secure: false, // ใช้ STARTTLS
     auth: {
       user: process.env.GMAIL_USERNAME,
       pass: process.env.GMAIL_PASSWORD,
     },
   });

   const sendEmail = ({ to, subject, text }) => {
     const mailOptions = {
       from: `"Auto Solar" <${process.env.EMAIL_USER}>`,
       to,
       subject,
       text,
     };

     transporter.sendMail(mailOptions, (error, info) => {
       if (error) {
         console.error(`Failed to send email to ${to}:`, error);
       } else {
         console.log(`Email sent to ${to}:`, info.messageId);
       }
     });
   };

   export default sendEmail;