import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

const msg = {
  from: process.env.EMAIL_USER, // เช่น onboarding@resend.dev
  to: "beamsaenpong@gmail.com",
  subject: "Test Email",
  text: "This is a test email from Resend.",
};

resend.emails.send(msg).then(
  () => {
    console.log("Test email sent");
  },
  (error) => {
    console.error("Test email failed:", error);
  }
);