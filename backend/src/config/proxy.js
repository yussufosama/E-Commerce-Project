import { isIP } from 'node:net';

// Trust only explicitly named infrastructure, never all forwarded headers.
export function getTrustedProxies(value = process.env.TRUSTED_PROXY_IPS) {
  if (!value?.trim()) return false;
  const addresses = value.split(',').map(address => address.trim());
  if (addresses.some(address => !isIP(address))) {
    throw new Error('TRUSTED_PROXY_IPS must contain comma-separated proxy IP addresses.');
  }
  return addresses;
}
