// Self-proving Handshake Seal (DHRUMIL-T22): check the signature that rides in the seal link's #p= fragment
// against Handshake's public key, in the browser, with no server call. See apps/server/src/services/seal-proof.ts.

/** The published development key (its seed is in the server source), so anyone can sign with it. */
export const DEV_SEAL_PUBLIC_KEY = "BtVCZzP9TKZye9KsDrTGFQzvisEaAUjNP7MheiPoLok";
/**
 * Production must set NEXT_PUBLIC_SEAL_PUBLIC_KEY. Fails closed: a production build never trusts the dev key, and
 * with no key every proof is "unsupported", so the page relies on the server lookup alone (D-023).
 */
export const SEAL_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_SEAL_PUBLIC_KEY || (process.env.NODE_ENV === "production" ? "" : DEV_SEAL_PUBLIC_KEY);

export interface SealPayload {
  v: 1;
  c: string;
  i: string;
  p: number;
  cur: string;
  q: number;
  d?: "pickup" | "shipping";
  b: string;
  s: string;
  ba?: string;
  sa?: string;
  t: string;
}

export type SealCheck =
  | { status: "valid"; payload: SealPayload }
  | { status: "invalid"; payload?: SealPayload }
  | { status: "unsupported"; payload?: SealPayload };

function fromBase64url(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Reads and checks a seal token. "unsupported" means this browser has no Ed25519 (the page then relies on the server). */
export async function checkSealToken(token: string, publicKey = SEAL_PUBLIC_KEY): Promise<SealCheck> {
  const [body, sig] = token.split(".");
  if (!body || !sig) return { status: "invalid" };
  let bytes: Uint8Array<ArrayBuffer>;
  let payload: SealPayload;
  try {
    bytes = fromBase64url(body);
    payload = JSON.parse(new TextDecoder().decode(bytes)) as SealPayload;
    if (payload.v !== 1 || typeof payload.c !== "string" || typeof payload.p !== "number") return { status: "invalid" };
  } catch {
    return { status: "invalid" };
  }
  if (!publicKey) return { status: "unsupported", payload };
  try {
    const key = await crypto.subtle.importKey("raw", fromBase64url(publicKey), { name: "Ed25519" }, false, ["verify"]);
    const ok = await crypto.subtle.verify({ name: "Ed25519" }, key, fromBase64url(sig), bytes);
    return ok ? { status: "valid", payload } : { status: "invalid", payload };
  } catch {
    return { status: "unsupported", payload };
  }
}

/** The proof from a seal page URL's fragment (#p=…), if any. */
export function proofFromHash(hash: string): string | null {
  const p = new URLSearchParams(hash.replace(/^#/, "")).get("p");
  return p && /^[\w-]+\.[\w-]+$/.test(p) ? p : null;
}
