import nodemailer from "nodemailer";
import fetch from "node-fetch";

/**
 * ส่งอีเมลแบบมืออาชีพ รองรับทั้ง text และ html
 * @param {Object} param0
 * @param {string} param0.to - อีเมลผู้รับ
 * @param {string} param0.subject - หัวข้อ
 * @param {string} param0.text - ข้อความธรรมดา (fallback)
 * @param {string} [param0.html] - ข้อความ HTML (ถ้ามี)
 */
async function sendEmail({ to, subject, text, html }) {
  try {
    if (!to) {
      throw new Error("Recipient email is missing");
    }

    // ถ้าไม่มี html ให้สร้าง html พื้นฐานแบบมืออาชีพ
    const htmlContent =
      html ||
      `
      <div style="font-family:'Kanit',Arial,sans-serif;max-width:600px;margin:auto;background:#f9f9f9;padding:32px 24px;border-radius:12px;border:1px solid #e5e5e5;">
        <div style="text-align:center;margin-bottom:24px;">
<img src="https://res.cloudinary.com/debhfdjki/image/upload/yzrhcagdpfab1ndgquhz" />          <h2 style="color:#007bff;margin:0;">Auto Solar</h2>
        </div>
        <div style="background:#fff;padding:24px 20px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
          <h3 style="color:#333;margin-top:0;">${subject}</h3>
          <p style="color:#444;font-size:1.05em;line-height:1.7;">
            ${text ? text.replace(/\n/g, "<br/>") : ""}
          </p>
        </div>
        <div style="margin-top:32px;text-align:center;color:#888;font-size:0.95em;">
          <hr style="margin:24px 0 16px 0;border:none;border-top:1px solid #eee;">
          <div>Auto Solar<br/>โทร. 080-0495522</div>
          <div style="margin-top:8px;">
            <a href="https://yourcompany.com" style="color:#007bff;text-decoration:none;">เยี่ยมชมเว็บไซต์</a>
          </div>
        </div>
      </div>
      `;

    if (process.env.EMAIL_PROVIDER === "gmail") {
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
        from: `"Auto Solar" <${process.env.GMAIL_USERNAME}>`,
        to,
        subject,
        text,
        html: htmlContent,
      });
      console.log(`✅ Email sent via Gmail SMTP to ${to}`);
    } else if (process.env.EMAIL_PROVIDER === "brevo") {
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
          htmlContent: htmlContent,
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
    console.error(`❌ Failed to send email to ${to || "unknown"}:`, error.message);
    throw error;
  }
}

export default sendEmail;