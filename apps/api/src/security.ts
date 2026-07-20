import { isIP } from 'node:net';

const blockedHostnames = new Set(['localhost', 'localhost.localdomain']);

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 0
  );
}

export function assertSafePublicUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only public HTTP and HTTPS URLs are accepted.');
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (
    blockedHostnames.has(hostname) ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    isPrivateIpv4(hostname) ||
    (isIP(hostname) === 6 && (hostname === '::1' || hostname.startsWith('fc') || hostname.startsWith('fd') || hostname.startsWith('fe80')))
  ) {
    throw new Error('Private-network URLs are not accepted.');
  }
  return url;
}
