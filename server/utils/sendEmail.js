import nodemailer from 'nodemailer';

export const emailConfigured = () => Boolean(process.env.SMTP_HOST);

let transporter;
const getTransporter = () => {
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
};

// Sends via SMTP when configured; otherwise prints the email to the console (development).
export async function sendEmail({ to, subject, text, html }) {
  if (!emailConfigured()) {
    console.log(`\n--- Email (SMTP not configured, not sent) ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n---\n`);
    return;
  }
  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || `MediCare Connect <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });
}
