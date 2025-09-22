import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = ({ to, subject, text }) => {
  const msg = {
    from: process.env.EMAIL_USER, // เช่น onboarding@resend.dev
    to,
    subject,
    text,
  };

  // ส่งอีเมลแบบ non-blocking พร้อม retry
  let retries = 3;
  const send = () => {
    resend.emails.send(msg).then(
      () => {
        console.log(`Email sent to ${to}`);
      },
      (error) => {
        console.error(`Failed to send email to ${to}:`, error);
        if (retries > 0 && error.statusCode === 429) { // Retry เฉพาะ rate limit
          console.log(`Retrying email to ${to} (${retries} attempts left)`);
          retries--;
          setTimeout(send, 1000);
        }
      }
    );
  };
  send();
};

export default sendEmail;