// `?next=` values are attacker-controlled. Browsers read "\" as "/", so "/\evil.com" (which passes a naive
// "starts with / but not //" check) navigates off-site. Resolve against a fixed origin and keep only same-site paths.
const BASE = "https://handshake.invalid";

/** The value as a same-site path (`/a/b?c#d`), or null if it could leave the site. */
export function safeLocalPath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/") || /[\\\u0000-\u001f\u007f]/.test(raw)) return null;
  try {
    const u = new URL(raw, BASE);
    return u.origin === BASE ? u.pathname + u.search + u.hash : null;
  } catch {
    return null;
  }
}
