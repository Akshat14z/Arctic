// Run: pnpm --filter @convocart/web test
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseExtra, pickDisplay } from "./render.ts";

const extra = JSON.stringify({ v: 1, kind: "text", orig: { lang: "hi", text: "दो लाख" }, tr: { ja: "20万ルピー" } });

test("shows the reader's translation, and the original on toggle", () => {
  const e = parseExtra(extra);
  assert.deepEqual(pickDisplay(e, "दो लाख", "ja", false), { text: "20万ルピー", lang: "ja", translated: true, canToggle: true });
  assert.deepEqual(pickDisplay(e, "दो लाख", "ja", true), { text: "दो लाख", lang: "hi", translated: false, canToggle: true });
});

test("sender's own language or no translation: original, no toggle", () => {
  const e = parseExtra(extra);
  assert.equal(pickDisplay(e, "दो लाख", "hi", false).canToggle, false);
  assert.deepEqual(pickDisplay(e, "दो लाख", "ta", false), { text: "दो लाख", lang: "hi", translated: false, canToggle: false });
});

test("foreign, malformed or future messages never crash: plain body", () => {
  for (const raw of [undefined, "", "{not json", JSON.stringify({ v: 2, kind: "text" }), JSON.stringify({ hello: 1 })]) {
    assert.equal(parseExtra(raw), null);
    assert.deepEqual(pickDisplay(parseExtra(raw), "plain body", "en", false), { text: "plain body", lang: undefined, translated: false, canToggle: false });
  }
});
