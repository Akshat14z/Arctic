import { test } from "node:test";
import assert from "node:assert/strict";
import { pickVoice } from "./speak.ts";

const v = (lang: string, name: string, localService = true) => ({ lang, name, localService });
const voices = [v("en-US", "Samantha"), v("hi-IN", "Lekha"), v("hi_IN", "Google हिन्दी", false), v("ja-JP", "Kyoko"), v("en-IN", "Rishi")];

test("prefers the exact regional voice for the reader's language", () => {
  assert.equal(pickVoice(voices, "hi")?.name, "Lekha");
  assert.equal(pickVoice(voices, "en")?.name, "Rishi");
  assert.equal(pickVoice(voices, "ja")?.name, "Kyoko");
});

test("no voice for the language means no Listen button", () => {
  assert.equal(pickVoice(voices, "ta"), null);
  assert.equal(pickVoice([], "hi"), null);
});
