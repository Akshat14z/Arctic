import { test } from "node:test";
import assert from "node:assert/strict";
import { amountFix } from "./guard.ts";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

test("rewrites only the amount, so the sentence survives", () => {
  assert.deepEqual(amountFix("pay 17000", inr), { amount: 17000, replacement: "pay ₹17,000" });
  assert.deepEqual(amountFix("take 17000", inr), { amount: 17000, replacement: "take ₹17,000" });
  assert.deepEqual(amountFix("2 lakh", inr), { amount: 200000, replacement: "₹2,00,000" });
  assert.deepEqual(amountFix("1.5 crore", inr), { amount: 15000000, replacement: "₹1,50,00,000" });
});

test("reads k, thousand and हज़ार as thousands", () => {
  assert.equal(amountFix("17k", inr)?.replacement, "₹17,000");
  assert.equal(amountFix("17 thousand", inr)?.replacement, "₹17,000");
  assert.equal(amountFix("17 हज़ार", inr)?.replacement, "₹17,000");
});

test("no amount, no fix", () => {
  assert.equal(amountFix("hurry up", inr), null);
});
