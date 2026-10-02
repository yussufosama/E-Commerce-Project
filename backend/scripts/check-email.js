import nodemailer from 'nodemailer';

// Verify SMTP authentication without sending an email or printing credentials.
const required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM', 'APP_ORIGIN'];
const missing = required.filter(key => !process.env[key]?.trim());
if (missing.length) {
  console.error(`Email setup incomplete. Fill these settings in backend/.env: ${missing.join(', ')}`);
  process.exitCode = 1;
} else {
  let transport;
  try {
    const origin = new URL(process.env.APP_ORIGIN);
    if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password) throw new Error('invalid-origin');
    const port = Number(process.env.SMTP_PORT || 587);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('invalid-port');
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port, secure: port === 465, requireTLS: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
      disableFileAccess: true, disableUrlAccess: true,
    });
    await transport.verify();
    console.log('SMTP connection and authentication succeeded. No email was sent. Sender authorization and inbox delivery still need verification through the account flow. Restart the server after changing .env.');
  } catch (error) {
    const messages = {
      EAUTH: 'SMTP authentication was rejected. Use the Brevo SMTP login and an active SMTP key (not an API key or account password).',
      EDNS: 'SMTP hostname could not be resolved. Check SMTP_HOST and your internet connection.',
      ECONNECTION: 'Could not connect to the SMTP server. Check host, port and network access.',
      ETIMEDOUT: 'The SMTP connection timed out. Check network access and the SMTP port.',
      ESOCKET: 'The SMTP network or TLS connection failed. Check network access and certificate configuration.',
    };
    console.error(messages[error.code] || 'Email check failed. Check APP_ORIGIN, SMTP host/port, provider credentials, and network access.');
    console.error('Credentials and raw provider responses are intentionally hidden.');
    process.exitCode = 1;
  } finally { transport?.close(); }
}
