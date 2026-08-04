import { createHmac, randomBytes } from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

function hotp(secret: Buffer, counter: number, digits = 6): string {
  const counterBuffer = Buffer.alloc(8);
  // Counter is a 64-bit big-endian integer; JS numbers are safe up to 2^53, plenty for this use.
  counterBuffer.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  counterBuffer.writeUInt32BE(counter % 2 ** 32, 4);

  const hmac = createHmac('sha1', secret).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 10 ** digits).padStart(digits, '0');
}

/** RFC 6238 TOTP — 30-second step, 6 digits, matches Google Authenticator / Authy defaults. */
export function generateTotpToken(base32Secret: string, forTimeMs = Date.now(), stepSeconds = 30): string {
  const counter = Math.floor(forTimeMs / 1000 / stepSeconds);
  return hotp(base32Decode(base32Secret), counter);
}

/** Verifies a token allowing +/- `window` steps of clock drift (default: ~30s each way). */
export function verifyTotpToken(base32Secret: string, token: string, window = 1, stepSeconds = 30): boolean {
  const cleanToken = String(token || '').trim();
  if (!/^\d{6}$/.test(cleanToken)) return false;

  const counter = Math.floor(Date.now() / 1000 / stepSeconds);
  const secretBuffer = base32Decode(base32Secret);
  for (let offset = -window; offset <= window; offset++) {
    if (hotp(secretBuffer, counter + offset) === cleanToken) return true;
  }
  return false;
}

export function generateOtpAuthUrl(base32Secret: string, accountLabel: string, issuer = 'Trimurti TMS'): string {
  const label = encodeURIComponent(`${issuer}:${accountLabel}`);
  const params = new URLSearchParams({
    secret: base32Secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
