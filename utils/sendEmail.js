import nodemailer from "nodemailer";
   import dotenv from "dotenv";

   dotenv.config();

   const transporter = nodemailer.createTransport({
     host: process.env.GMAIL_HOST,
     port: process.env.GMAIL_PORT || 465,
     secure: process.env.GMAIL_PORT === "465",
     auth: {
       user: process.env.GMAIL_USERNAME,
       pass: process.env.GMAIL_PASSWORD,
     },
     connectionTimeout: 20000,
     greetingTimeout: 20000,
     socketTimeout: 20000,
     tls: {
       rejectUnauthorized: false,
     },
   });

   const sendEmail = async ({ to, subject, text }, retries = 3, delay = 1000) => {
     const mailOptions = {
       from: `"Auto Solar" <${process.env.EMAIL_USER}>`,
       to,
       subject,
       text,
     };

     for (let attempt = 1; attempt <= retries; attempt++) {
       try {
         const info = await transporter.sendMail(mailOptions);
         console.log(`Email sent to ${to}:`, info.messageId);
         return info;
       } catch (error) {
         console.error(`Attempt ${attempt} failed to send email to ${to}:`, error);
         if (attempt === retries) {
           throw error;
         }
         await new Promise(resolve => setTimeout(resolve, delay));
       }
     }
   };

   export default sendEmail;