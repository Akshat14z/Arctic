"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { NotificationListResponseSchema, SocialActionResponseSchema, type NotificationListResponse } from "@convocart/contracts";
import { api, friendlyMessage } from "@/lib/api/client";
import { useRequireSession } from "@/lib/use-require-session";

export function NotificationsView() {
  const session = useRequireSession();
  const [data, setData] = useState<NotificationListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!session) return;
    try { setData(await api("/api/notifications?limit=30", { token: session.sessionToken, schema: NotificationListResponseSchema })); }
    catch (err) { setError(friendlyMessage(err)); }
  }, [session]);
  useEffect(() => { void load(); }, [load]);
  if (!session) return <div aria-busy className="skeleton h-64"/>;
  const token = session.sessionToken;

  async function mark(id: string) {
    setData((current) => current ? { ...current, unreadCount: Math.max(0, current.unreadCount - 1), items: current.items.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item) } : current);
    try { await api(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH", token, schema: SocialActionResponseSchema }); } catch { void load(); }
  }
  return <div className="mx-auto flex w-full max-w-3xl flex-col gap-7"><header className="border-b border-border pb-5"><p className="eyebrow">Updates</p><h1 className="page-title">Notifications</h1><p className="mt-2 text-muted">{data ? `${data.unreadCount} unread` : "Seller activity in one place."}</p></header>{error && <p className="note note-error">{error}</p>}{!data && !error && <div className="skeleton h-64"/>}{data?.items.length === 0 && <div className="empty-state"><h2>All quiet for now</h2><p>Follow sellers to hear about new listings and price changes.</p><Link href="/following" className="btn btn-primary">Open following</Link></div>}{data && data.items.length > 0 && <ul className="flex flex-col rounded-[var(--radius-card)] border border-border bg-surface px-4">{data.items.map((item) => <li key={item.id} className="flex gap-3 border-b border-border py-4 last:border-0"><span aria-hidden className={`mt-2 size-2 shrink-0 rounded-full ${item.readAt ? "bg-border" : "bg-accent"}`}/><div className="min-w-0 flex-1"><p className="font-semibold">{item.title}</p><p className="break-words text-ink-2">{item.body}</p><div className="mt-2 flex flex-wrap items-center gap-3"><Link href={`/listings/${item.listingId}`} className="link text-sm">View listing</Link><Link href={`/sellers/${item.sellerId}`} className="link text-sm">Seller</Link>{!item.readAt && <button type="button" onClick={() => void mark(item.id)} className="hit text-sm font-medium underline">Mark read</button>}<time className="meta ml-auto" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString()}</time></div></div></li>)}</ul>}</div>;
}
