import nodemailer from "nodemailer";
import fetch from "node-fetch";

async function sendEmail({ to, subject, text }) {
  try {
    if (process.env.EMAIL_PROVIDER === "gmail") {
      // --- Gmail SMTP (ใช้ได้ถ้าไม่ host บน Render) ---
      const transporter = nodemailer.createTransport({
        host: process.env.GMAIL_HOST,
        port: process.env.GMAIL_PORT,
        secure: process.env.GMAIL_PORT == 465,
        auth: {
          user: process.env.GMAIL_USERNAME,
          pass: process.env.GMAIL_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: `"My Shop" <${process.env.GMAIL_USERNAME}>`,
        to,
        subject,
        text,
      });
      console.log(`✅ Email sent via Gmail SMTP to ${to}`);
    } else if (process.env.EMAIL_PROVIDER === "brevo") {
      // --- Brevo API ---
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { email: process.env.EMAIL_FROM, name: "My Shop" },
          to: [{ email: to }],
          subject,
          textContent: text,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Brevo API error: ${err}`);
      }

      console.log(`✅ Email sent via Brevo API to ${to}`);
    } else {
      throw new Error("No valid EMAIL_PROVIDER configured.");
    }
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error);
  }
}

export default sendEmail;
