// Run: pnpm --filter @convocart/web test
import assert from "node:assert/strict";
import { test } from "node:test";
import { indianAmount } from "./guard.ts";

test("lakh and crore become exact rupee amounts", () => {
  assert.equal(indianAmount("2 lakh"), 200000);
  assert.equal(indianAmount("I can pay 2.5 lakhs"), 250000);
  assert.equal(indianAmount("1 crore final"), 10000000);
  assert.equal(indianAmount("3cr"), 30000000);
  assert.equal(indianAmount("12 lac"), 1200000);
});

test("no lakh/crore amount: null", () => {
  assert.equal(indianAmount("12000"), null);
  assert.equal(indianAmount("lakh"), null);
  assert.equal(indianAmount(""), null);
});
