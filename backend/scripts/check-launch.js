const required = ['MONGODB_URI', 'APP_ORIGIN', 'SHIPPING_FEE_PIASTRES', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM'];
const missing = required.filter(key => !process.env[key]?.trim());
for (const key of required) console.log(`${missing.includes(key) ? 'MISSING' : 'SET'}: ${key}`);
let validOrigin = false;
try { const url = new URL(process.env.APP_ORIGIN); validOrigin = url.protocol === 'https:' && url.origin === process.env.APP_ORIGIN; } catch { /* Report missing configuration without printing it. */ }
console.log(`HTTPS origin: ${validOrigin ? 'ready' : 'required for public launch'}`);
console.log(`Production mode: ${process.env.NODE_ENV === 'production' ? 'ready' : 'not enabled'}`);
const fee = Number(process.env.SHIPPING_FEE_PIASTRES);
const validFee = Boolean(process.env.SHIPPING_FEE_PIASTRES?.trim()) && Number.isSafeInteger(fee) && fee >= 0 && fee <= 1000000;
console.log(`Shipping fee: ${validFee ? 'valid' : 'needs an integer from 0 to 1000000 piastres'}`);
console.log('Payments: cash on delivery only. A live payment provider is not configured.');
if (missing.length || !validOrigin || !validFee || process.env.NODE_ENV !== 'production') process.exitCode = 1;
