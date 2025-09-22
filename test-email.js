import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

const msg = {
  from: process.env.EMAIL_USER,
  to: "peerawat.sa@rmuti.ac.th",
  subject: "Test Email",
  text: "This is a test email from Resend.",
};

resend.emails.send(msg).then(
  (response) => {
    console.log("Test email sent:", response);
  },
  (error) => {
    console.error("Test email failed:", error);
  }
);