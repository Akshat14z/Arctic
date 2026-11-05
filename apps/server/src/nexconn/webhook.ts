import { createHash, timingSafeEqual } from 'crypto';

export interface WebhookHeaders {
  signature?: string;
  nonce?: string;
  timestamp?: string;
}

/**
 * Validates Nexconn webhook signatures and anti-replay timestamps.
 * Official Nexconn Signature algorithm:
 *   Signature = SHA1(AppSecret + Nonce + Timestamp)
 *
 * Requirements (ARCHITECTURE §7 & PRIMER §5):
 * 1. Signature must match SHA1 hex.
 * 2. Timestamp must be within a ±5 minute time window to prevent delayed replay.
 */
export function verifyNexconnWebhookSignature(
  headers: WebhookHeaders,
  appSecret: string,
  now = Date.now(),
  maxDriftMs = 5 * 60 * 1000 // 5 minutes
): boolean {
  const { signature, nonce, timestamp } = headers;

  if (!signature || !nonce || !timestamp || !appSecret) {
    return false;
  }

  // 1. Validate timestamp window
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(now - ts) > maxDriftMs) {
    return false;
  }

  // 2. Compute expected SHA-1 signature
  const payload = `${appSecret}${nonce}${timestamp}`;
  const expectedSignature = createHash('sha1').update(payload, 'utf8').digest('hex');

  // 3. Constant-time comparison
  const sigBuf = Buffer.from(signature.toLowerCase());
  const expectedBuf = Buffer.from(expectedSignature.toLowerCase());

  if (sigBuf.length !== expectedBuf.length) {
    return false;
  }

  return timingSafeEqual(sigBuf, expectedBuf);
}

