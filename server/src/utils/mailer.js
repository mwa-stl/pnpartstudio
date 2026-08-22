// server/src/utils/mailer.js
import nodemailer from 'nodemailer';

export function transporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export async function sendMail(to, subject, html) {
  const from = process.env.FROM_EMAIL || 'PnP Art Studio <no-reply@pnpartstudio.com>';
  await transporter().sendMail({ from, to, subject, html });
}
