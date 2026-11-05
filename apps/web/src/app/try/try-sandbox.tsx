"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthResponseSchema } from "@convocart/contracts";
import { api, friendlyMessage } from "@/lib/api/client";
import { saveSession } from "@/lib/session";

type Role = "buyer" | "seller" | "agent";

// The fixed demo_ accounts the server seeds (D-015): signing in never creates a new user.
const ROLES: { as: Role; name: string; reads: string; does: string; next: string }[] = [
  { as: "buyer", name: "Priya", reads: "हिन्दी", does: "Asks about a 1978 Seiko watch and makes an offer.", next: "/chats" },
  { as: "seller", name: "Kenji", reads: "日本語", does: "Sells the watch and reads Priya in Japanese.", next: "/chats" },
  { as: "agent", name: "Sarah", reads: "English", does: "Answers help requests from the dispatch console.", next: "/agent" },
];

/** Only same-site paths, so ?next= can't be used as an open redirect. */
function safeNext(next: string | null, fallback: string) {
  return next?.startsWith("/") && !next.startsWith("//") ? next : fallback;
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
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl">Try Handshake</h1>
        <p className="text-muted">
          Pick a side of a real chat. These are demo accounts, marked Demo everywhere, with no sign-up.
        </p>
      </div>

      <ul className="flex flex-col border-y border-border">
        {ROLES.map((r) => (
          <li key={r.as} className="border-b border-border last:border-b-0">
            <button
              type="button"
              onClick={() => enter(r.as, r.next)}
              disabled={busy !== null}
              className="flex w-full items-center justify-between gap-4 py-4 text-left hover:bg-surface disabled:opacity-55"
            >
              <span className="flex flex-col">
                <span className="font-display text-xl">
                  {r.name}, the {r.as}
                </span>
                <span className="text-sm text-muted">{r.does}</span>
              </span>
              <span className="shrink-0 text-sm">
                {busy === r.as ? (
                  "Opening…"
                ) : (
                  <>
                    reads <span lang={r.as === "buyer" ? "hi" : r.as === "seller" ? "ja" : "en"}>{r.reads}</span>
                  </>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="bg-danger-bg px-3 py-2 text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
