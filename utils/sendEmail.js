import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = ({ to, subject, text }) => {
  const msg = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  };

  // ส่งอีเมลแบบ non-blocking พร้อม retry
  let retries = 3;
  const send = () => {
    resend.emails.send(msg).then(
      (response) => {
        console.log(`Email sent to ${to}:`, response);
        if (response.id) {
          console.log(`Email ID: ${response.id}`);
        } else {
          console.error(`Email to ${to} may not have been sent properly`);
        }
      },
      (error) => {
        console.error(`Failed to send email to ${to}:`, error);
        if (retries > 0 && error.statusCode === 429) {
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