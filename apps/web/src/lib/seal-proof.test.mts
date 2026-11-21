import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";
import { checkSealToken, DEV_SEAL_PUBLIC_KEY, proofFromHash } from "./seal-proof.ts";

// The same published development key the server uses (apps/server/src/services/seal-proof.ts).
const seed = createHash("sha256").update("handshake-dev-seal-key-v1").digest();
const priv = createPrivateKey({ key: Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), seed]), format: "der", type: "pkcs8" });
const token = (payload: object) => {
  const json = Buffer.from(JSON.stringify(payload));
  return `${json.toString("base64url")}.${sign(null, json, priv).toString("base64url")}`;
};
const payload = { v: 1, c: "s_abc", i: "Vintage Seiko", p: 15000, cur: "INR", q: 1, d: "pickup", b: "Priya", s: "Kenji", t: "2026-11-07T16:04:30.000Z" };

test("the built-in dev key matches the server's dev seed", () => {
  assert.equal((createPublicKey(priv).export({ format: "jwk" }) as { x: string }).x, DEV_SEAL_PUBLIC_KEY);
});

test("a genuine seal checks out on this device", async () => {
  const r = await checkSealToken(token(payload));
  assert.equal(r.status, "valid");
  assert.equal(r.payload?.p, 15000);
});

test("a changed price or a broken token fails", async () => {
  const [, sig] = token(payload).split(".");
  const forged = `${Buffer.from(JSON.stringify({ ...payload, p: 1500 })).toString("base64url")}.${sig}`;
  assert.equal((await checkSealToken(forged)).status, "invalid");
  assert.equal((await checkSealToken("nonsense")).status, "invalid");
  assert.equal((await checkSealToken("e30.e30")).status, "invalid");
});

test("with no public key (production without the env var) nothing is trusted", async () => {
  assert.equal((await checkSealToken(token(payload), "")).status, "unsupported");
});

test("reads the proof from the URL fragment only when it looks like a token", () => {
  assert.equal(proofFromHash("#p=abc.def"), "abc.def");
  assert.equal(proofFromHash("#p=<script>"), null);
  assert.equal(proofFromHash(""), null);
});
