import { createHash, createPrivateKey, createPublicKey, sign, type KeyObject } from 'crypto';
import type { Deal } from '@convocart/contracts';
import { getConfig } from '../config.js';

/**
 * Self-proving Handshake Seal (DHRUMIL-T22). The server signs a compact summary of the agreed deal with Ed25519;
 * the token rides in the seal link's #fragment, so anyone can check it in the browser against Handshake's
 * public key, even offline and even if this server is gone.
 *
 * Token: base64url(JSON payload) + "." + base64url(signature over those exact JSON bytes).
 */

export interface SealPayload {
  v: 1;
  c: string; // seal code
  i: string; // item title (English if known, else the listing's own language)
  p: number; // price amount
  cur: string; // currency
  q: number; // quantity
  d?: 'pickup' | 'shipping';
  b: string; // buyer display name
  s: string; // seller display name
  ba?: string; // buyer agreed at (ISO)
  sa?: string; // seller agreed at (ISO)
  t: string; // sealed at (ISO)
}

// Development only: a published seed, so local builds can sign and the web app can check with the matching
// public key. Production must set SEAL_SIGNING_SEED (64 hex chars); without it the server signs nothing.
const DEV_SEED = createHash('sha256').update('handshake-dev-seal-key-v1').digest();
const PKCS8_ED25519_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');

let cached: { key: KeyObject; publicKey: string } | null | undefined;

function signingKey(): { key: KeyObject; publicKey: string } | null {
  if (cached !== undefined) return cached;
  const config = getConfig();
  const hex = process.env.SEAL_SIGNING_SEED?.trim();
  let seed: Buffer | null = null;
  if (hex && /^[0-9a-f]{64}$/i.test(hex)) seed = Buffer.from(hex, 'hex');
  else if (config.NODE_ENV !== 'production') seed = DEV_SEED;
  if (!seed) {
    console.warn('[seal] SEAL_SIGNING_SEED is not set: seals are not signed in production.');
    cached = null;
    return cached;
  }
  const key = createPrivateKey({ key: Buffer.concat([PKCS8_ED25519_PREFIX, seed]), format: 'der', type: 'pkcs8' });
  const jwk = createPublicKey(key).export({ format: 'jwk' }) as { x: string };
  cached = { key, publicKey: jwk.x };
  return cached;
}

/** For tests: forget the cached key after changing SEAL_SIGNING_SEED or NODE_ENV. */
export function resetSealKeyForTesting() {
  cached = undefined;
}

/** Handshake's public key (raw Ed25519, base64url), or null when signing is off. */
export function sealPublicKey(): string | null {
  return signingKey()?.publicKey ?? null;
}

export function sealPayload(
  deal: Deal,
  names: { buyer: string; seller: string },
  sealedAt: string
): SealPayload {
  const titles = Object.values(deal.item);
  return {
    v: 1,
    c: deal.sealCode ?? '',
    i: deal.item.en ?? titles[0] ?? '',
    p: deal.price.amount,
    cur: deal.price.currency,
    q: deal.quantity ?? 1,
    ...(deal.delivery?.method ? { d: deal.delivery.method } : {}),
    b: names.buyer,
    s: names.seller,
    ...(deal.agreedBy.buyer ? { ba: deal.agreedBy.buyer } : {}),
    ...(deal.agreedBy.seller ? { sa: deal.agreedBy.seller } : {}),
    t: sealedAt,
  };
}

/** The signed token for a seal, or null when no signing key is configured. */
export function signSeal(payload: SealPayload): string | null {
  const k = signingKey();
  if (!k) return null;
  const json = Buffer.from(JSON.stringify(payload), 'utf8');
  const sig = sign(null, json, k.key);
  return `${json.toString('base64url')}.${sig.toString('base64url')}`;
}
