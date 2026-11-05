import { HandshakeExtraV1Schema, type HandshakeExtraV1, type LangCode } from "@convocart/contracts";

/** C4: unknown, missing or malformed `extra` → null, and the caller renders the plain text body. */
export function parseExtra(raw?: string): HandshakeExtraV1 | null {
  if (!raw) return null;
  try {
    const parsed = HandshakeExtraV1Schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** C4 render rule: the reader's translation if there is one, else the original; "See original" flips it. */
export function pickDisplay(extra: HandshakeExtraV1 | null, body: string, lang: LangCode, showOriginal: boolean) {
  const translation = extra && extra.orig.lang !== lang ? extra.tr[lang] : undefined;
  if (translation && !showOriginal) return { text: translation, lang, translated: true, canToggle: true };
  return { text: extra?.orig.text ?? body, lang: extra?.orig.lang, translated: false, canToggle: !!translation };
}
