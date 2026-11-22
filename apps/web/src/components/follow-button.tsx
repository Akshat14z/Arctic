"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FollowStatusResponseSchema, type FollowStatusResponse } from "@convocart/contracts";
import { api, friendlyMessage } from "@/lib/api/client";
import { useSession } from "@/lib/session";
import { useT } from "@/lib/use-t";

export function FollowButton({ sellerId, compact = false, onStatus }: { sellerId: string; compact?: boolean; onStatus?: (status: FollowStatusResponse) => void }) {
  const t = useT();
  const session = useSession();
  const router = useRouter();
  const [status, setStatus] = useState<FollowStatusResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mine = session?.user.id === sellerId;

  useEffect(() => {
    if (!session || mine) return;
    let live = true;
    api(`/api/sellers/${encodeURIComponent(sellerId)}/follow-status`, { token: session.sessionToken, schema: FollowStatusResponseSchema }).then(
      (next) => {
        if (!live) return;
        setStatus(next);
        onStatus?.(next);
      },
      () => {},
    );
    return () => { live = false; };
  }, [session, sellerId, mine, onStatus]);

  if (mine) return null;
  const following = status?.isFollowing ?? false;

  async function toggle() {
    if (!session) {
      router.push(`/signup?next=${encodeURIComponent(`/sellers/${sellerId}`)}`);
      return;
    }
    if (busy) return;
    const before = status;
    const optimistic: FollowStatusResponse = {
      sellerId,
      isFollowing: !following,
      followerCount: Math.max(0, (status?.followerCount ?? 0) + (following ? -1 : 1)),
      followingCount: status?.followingCount ?? 0,
      ...(!following && status?.preferences ? { preferences: status.preferences } : {}),
    };
    setStatus(optimistic);
    onStatus?.(optimistic);
    setBusy(true);
    setError(null);
    try {
      const next = await api(`/api/sellers/${encodeURIComponent(sellerId)}/follow`, {
        method: following ? "DELETE" : "POST",
        token: session.sessionToken,
        schema: FollowStatusResponseSchema,
      });
      setStatus(next);
      onStatus?.(next);
      window.dispatchEvent(new CustomEvent("cg:follow-status", { detail: next }));
    } catch (err) {
      setStatus(before);
      if (before) onStatus?.(before);
      setError(friendlyMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <button type="button" onClick={toggle} disabled={busy} aria-busy={busy} aria-pressed={following} className={`${following ? "btn btn-secondary" : "btn btn-primary"} ${compact ? "px-4 text-sm" : ""}`}>
        {following ? t("follow.following") : t("follow.follow")}
      </button>
      {error && <span role="alert" className="max-w-48 text-sm text-danger">{error}</span>}
    </div>
  );
}

export function FollowNotificationControls({ sellerId }: { sellerId: string }) {
  const session = useSession();
  const [status, setStatus] = useState<FollowStatusResponse | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session || session.user.id === sellerId) return;
    api(`/api/sellers/${encodeURIComponent(sellerId)}/follow-status`, { token: session.sessionToken, schema: FollowStatusResponseSchema }).then(setStatus, () => {});
  }, [session, sellerId]);
  useEffect(() => {
    const sync = (event: Event) => {
      const next = (event as CustomEvent<FollowStatusResponse>).detail;
      if (next?.sellerId === sellerId) setStatus(next);
    };
    window.addEventListener("cg:follow-status", sync);
    return () => window.removeEventListener("cg:follow-status", sync);
  }, [sellerId]);

  if (!session || !status?.isFollowing || !status.preferences) return null;
  async function update(body: Record<string, unknown>) {
    if (!session || busy) return;
    const before = status;
    setStatus({ ...status!, preferences: { ...status!.preferences!, ...body } });
    setBusy(true);
    try {
      setStatus(await api(`/api/sellers/${encodeURIComponent(sellerId)}/follow-preferences`, { method: "PATCH", body, token: session.sessionToken, schema: FollowStatusResponseSchema }));
    } catch {
      setStatus(before);
    } finally {
      setBusy(false);
    }
  }
  const prefs = status.preferences;
  return (
    <fieldset disabled={busy} className="flex flex-wrap gap-3 rounded-[var(--radius-field)] border border-border bg-surface px-3 py-2 text-sm">
      <legend className="sr-only">Notifications from this seller</legend>
      <label className="flex min-h-tap cursor-pointer items-center gap-2">
        <input type="checkbox" checked={prefs.notifyNewListings} onChange={(e) => update({ notifyNewListings: e.target.checked })} /> New listings
      </label>
      <label className="flex min-h-tap cursor-pointer items-center gap-2">
        <input type="checkbox" checked={prefs.notifyPriceChanges} onChange={(e) => update({ notifyPriceChanges: e.target.checked })} /> Price changes
      </label>
      <label className="flex min-h-tap items-center gap-2">
        <span className="text-muted">Frequency</span>
        <select value={prefs.notificationFrequency} onChange={(e) => update({ notificationFrequency: e.target.value })} className="field min-h-10 w-auto py-1">
          <option value="instant">Instant</option>
          <option value="daily">Daily</option>
          <option value="off">Off</option>
        </select>
      </label>
    </fieldset>
  );
}
