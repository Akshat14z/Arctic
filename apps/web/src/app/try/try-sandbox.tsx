"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { safeLocalPath } from "@/lib/safe-path";
import { AuthResponseSchema } from "@convocart/contracts";
import { api, friendlyMessage } from "@/lib/api/client";
import { saveSession } from "@/lib/session";

type Role = "buyer" | "seller" | "agent";

// The fixed demo_ accounts the server seeds (D-015): signing in never creates a new user.
const ROLES: { as: Role; name: string; reads: string; does: string; next: string }[] = [
  { as: "buyer", name: "Priya", reads: "हिन्दी", does: "Asks about a 1978 Seiko watch and makes an offer.", next: "/home" },
  { as: "seller", name: "Kenji", reads: "日本語", does: "Sells the watch and reads Priya in Japanese.", next: "/home" },
  { as: "agent", name: "Sarah", reads: "English", does: "Answers help requests from the dispatch console.", next: "/agent" },
];

/** Only same-site paths, so ?next= can't be used as an open redirect. */
function safeNext(next: string | null, fallback: string) {
  return safeLocalPath(next) ?? fallback;
}

/** DHRUMIL-T11 judge sandbox: one click into the product as a demo buyer, seller or agent. */
export function TrySandbox() {
  const router = useRouter();
  const [busy, setBusy] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enter(role: Role, next: string) {
    setBusy(role);
    setError(null);
    try {
      const session = await api("/api/demo/session", { method: "POST", body: { as: role }, schema: AuthResponseSchema });
      saveSession(session);
      router.replace(next);
    } catch (e) {
      setError(friendlyMessage(e));
      setBusy(null);
    }
  }

  // ?as=buyer&next=/chats/… goes straight in (links from the landing page, screenshots).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const role = ROLES.find((r) => r.as === q.get("as"));
    if (role) enter(role.as, safeNext(q.get("next"), role.next));
    // Runs once on arrival; `enter` is stable enough for that.
  }, []);

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="page-title">Try Handshake</h1>
        <p className="text-muted">
          Pick a side of a real chat. These are demo accounts, marked Demo everywhere, with no sign-up.
        </p>
      </div>
      <hr className="rule-double" />

      <ul className="flex flex-col border-y border-border">
        {ROLES.map((r) => (
          <li key={r.as} className="border-b border-border last:border-b-0">
            <button
              type="button"
              onClick={() => enter(r.as, r.next)}
              disabled={busy !== null}
              aria-busy={busy === r.as}
              className="group flex min-h-tap w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:bg-surface disabled:opacity-55"
            >
              <span className="flex flex-col gap-1">
                <span className="text-lg font-medium">
                  {r.name}, the {r.as}
                </span>
                <span className="meta">{r.does}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-sm">
                {busy === r.as ? (
                  "Opening…"
                ) : (
                  <>
                    <span>
                      reads <span lang={r.as === "buyer" ? "hi" : r.as === "seller" ? "ja" : "en"}>{r.reads}</span>
                    </span>
                    <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5">
                      <path d="M6 3l5 5-5 5" />
                    </svg>
                  </>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="note note-error">
          {error}
        </p>
      )}
    </section>
  );
}
