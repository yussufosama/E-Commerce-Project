import nodemailer from 'nodemailer';

export function mailConfigured() {
  return ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM', 'APP_ORIGIN'].every(key => Boolean(process.env[key]));
}

export async function sendAccountEmail({ to, subject, text }) {
  if (!mailConfigured()) throw new Error('Mail is not configured.');
  const port = Number(process.env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port,
    secure: port === 465, requireTLS: true, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    disableFileAccess: true, disableUrlAccess: true });
  try { await transport.sendMail({ from: process.env.MAIL_FROM, to, subject, text }); }
  finally { transport.close(); }
}
