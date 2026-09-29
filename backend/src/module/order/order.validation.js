import { fail, objectBody } from '../../utils/http-error.js';

export function checkoutInput(body, key) {
  if (typeof key !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(key)) fail(400, 'Send an Idempotency-Key header of 16–100 letters, numbers, underscores or hyphens.');
  if (!objectBody(body, ['address', 'paymentMethod', 'expectedSubtotalPiastres', 'expectedTotalPiastres']) || body.paymentMethod !== 'cash_on_delivery'
    || !Number.isSafeInteger(body.expectedSubtotalPiastres) || body.expectedSubtotalPiastres < 0
    || !Number.isSafeInteger(body.expectedTotalPiastres) || body.expectedTotalPiastres < 0) fail(400, 'Provide address, cash_on_delivery paymentMethod, expectedSubtotalPiastres and expectedTotalPiastres.');
  const a = body.address;
  if (!objectBody(a, ['name', 'phone', 'governorate', 'city', 'street', 'postalCode', 'country']) || a.country !== 'EG') fail(400, 'Provide an Egyptian shipping address.');
  const address = {};
  for (const field of ['name', 'phone', 'governorate', 'city', 'street']) {
    if (typeof a[field] !== 'string' || !a[field].trim() || a[field].length > (field === 'street' ? 300 : 100)) fail(400, `Invalid address ${field}.`);
    address[field] = a[field].trim();
  }
  if (!/^(?:\+20|0)1[0125]\d{8}$/.test(address.phone)) fail(400, 'Use a valid Egyptian mobile phone number.');
  if (a.postalCode !== undefined && (typeof a.postalCode !== 'string' || !/^\d{5}$/.test(a.postalCode))) fail(400, 'Postal code must have five digits.');
  address.postalCode = a.postalCode;
  address.country = 'EG';
  return { address, paymentMethod: body.paymentMethod, expectedSubtotalPiastres: body.expectedSubtotalPiastres, expectedTotalPiastres: body.expectedTotalPiastres };
}
