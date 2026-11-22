import { test } from "node:test";
import assert from "node:assert/strict";
import { I18N_TABLES, translator } from "./i18n.ts";

const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

test("every translation is a known key and keeps the English placeholders", () => {
  for (const [lang, table] of Object.entries({ hi: I18N_TABLES.hi, ja: I18N_TABLES.ja })) {
    for (const [key, s] of Object.entries(table)) {
      const base = (I18N_TABLES.en as Record<string, string>)[key];
      assert.ok(base, `${lang}: unknown key ${key}`);
      assert.equal(vars(s as string), vars(base), `${lang}.${key} placeholders`);
    }
  }
});

test("fills placeholders and falls back to English for untranslated languages", () => {
  assert.equal(translator("hi")("deal.sentYou", { name: "Kenji" }), "Kenji ने आपको यह ऑफ़र भेजा");
  assert.equal(translator("ta")("chat.send"), "Send");
  assert.equal(translator("ja")("deal.countAgreed", { n: 2 }), "2人中2人が合意");
});
