"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WatchlistStatusResponseSchema } from "@convocart/contracts";
import { api } from "@/lib/api/client";
import { useSession } from "@/lib/session";

export function WatchlistButton({ listingId, mine = false, compact = false }: { listingId: string; mine?: boolean; compact?: boolean }) {
  const session = useSession();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!session || mine) return;
    api(`/api/watchlist/${encodeURIComponent(listingId)}/status`, { token: session.sessionToken, schema: WatchlistStatusResponseSchema }).then((value) => setSaved(value.saved), () => {});
  }, [session, listingId, mine]);
  if (mine) return null;
  async function toggle() {
    if (!session) return router.push(`/signup?next=${encodeURIComponent(`/listings/${listingId}`)}`);
    const before = saved; setSaved(!before); setBusy(true);
    try {
      const next = await api(`/api/watchlist/${encodeURIComponent(listingId)}`, { method: before ? "DELETE" : "POST", token: session.sessionToken, schema: WatchlistStatusResponseSchema });
      setSaved(next.saved);
    } catch { setSaved(before); } finally { setBusy(false); }
  }
  return <button type="button" onClick={toggle} disabled={busy} aria-pressed={saved} className={`${saved ? "btn btn-secondary" : "btn btn-quiet"} ${compact ? "flex-1 px-3 text-sm" : ""}`}><svg aria-hidden viewBox="0 0 24 24" className="size-4" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8"><path d="M6 4h12v17l-6-4-6 4z"/></svg>{saved ? "Saved" : "Save"}</button>;
}
