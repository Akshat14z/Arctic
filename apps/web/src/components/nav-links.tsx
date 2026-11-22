"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { signOut, useSession } from "@/lib/session";
import { Icon, type IconName } from "./icons";
import { useT } from "@/lib/use-t";
import type { Key } from "@/lib/i18n";
import { ThemeToggle } from "./theme-toggle";

// Tab and menu labels in the reader's language (lib/i18n). Labels without a key stay as written.
const LABEL_KEYS: Record<string, Key> = { Home: "nav.home", Browse: "nav.browse", Chats: "nav.chats", Selling: "nav.selling", Following: "nav.following", "My chats": "nav.chats", "My Profile & Settings": "nav.profile" };
function useLabel() {
  const t = useT();
  return (label: string) => (LABEL_KEYS[label] ? t(LABEL_KEYS[label]) : label);
}

type Tab = { href: string; label: string; icon: IconName };
const PEOPLE: Tab[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/listings", label: "Browse", icon: "browse" },
  { href: "/following", label: "Following", icon: "follow" },
  { href: "/chats", label: "Chats", icon: "chats" },
  { href: "/selling", label: "Selling", icon: "sell" },
];
const VISITOR: Tab[] = [
  { href: "/listings", label: "Browse", icon: "browse" },
  { href: "/listings/new", label: "Sell", icon: "sell" },
];
const AGENT: Tab[] = [
  { href: "/agent", label: "Dispatch", icon: "dispatch" },
  { href: "/listings", label: "Browse", icon: "browse" },
];

function isHere(path: string, href: string) {
  if (href === "/listings") return path === "/listings" || (path.startsWith("/listings/") && path !== "/listings/new");
  if (href === "/selling") return path === "/selling" || path === "/listings/new";
  return path === href || path.startsWith(`${href}/`);
}

function useTabs() {
  const session = useSession();
  if (!session) return VISITOR;
  return session.user.role === "agent" ? AGENT : PEOPLE;
}

/** Desktop: the reference's pill tab bar, the current tab filled white. */
export function NavTabs() {
  const path = usePathname();
  const tabs = useTabs();
  const label = useLabel();
  return (
    <nav aria-label="Main" className="seg max-md:hidden">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={isHere(path, t.href) ? "page" : undefined} className="gap-2">
          <Icon name={t.icon} className="size-4" />
          {label(t.label)}
        </Link>
      ))}
    </nav>
  );
}

/** Phone: the same tabs as a bottom bar in thumb reach. Hidden inside a conversation, where the composer owns the bottom. */
export function BottomTabs() {
  const path = usePathname();
  const tabs = useTabs();
  const session = useSession();
  const label = useLabel();
  if (!session || /^\/(chats|cases|agent\/cases)\/./.test(path)) return null;
  return (
    <nav data-bottom-tabs aria-label="Main" className="fixed inset-x-0 bottom-0 z-[var(--z-sticky-nav)] border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-md">
        {tabs.map((t) => {
          const here = isHere(path, t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={here ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium no-underline ${here ? "text-text" : "text-muted"}`}
              >
                <span className={`grid h-7 w-12 place-items-center rounded-full ${here ? "bg-accent text-[var(--color-accent-ink)]" : ""}`}>
                  <Icon name={t.icon} className="size-[18px]" />
                </span>
                {label(t.label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Signed out: Sign in and Get started. Signed in: your initial opens who you are, where to go, and the way out. */
export function AccountMenu() {
  const session = useSession();
  const box = useRef<HTMLDetailsElement>(null);
  const path = usePathname();
  const t = useT();
  const label = useLabel();

  // A native disclosure (no script menu to break), closed on navigation and on a click or Escape outside it.
  useEffect(() => {
    if (box.current) box.current.open = false;
  }, [path]);
  useEffect(() => {
    const close = (e: Event) => {
      const d = box.current;
      if (!d?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !d.contains(e.target as Node)) d.open = false;
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  if (session === undefined) return <span className="h-11 w-24" aria-hidden />;
  if (!session)
    return (
      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle compact />
        <Link href="/signin" className="btn btn-quiet px-3">
          Sign in
        </Link>
        <Link href="/signup" className="btn btn-primary px-4 max-sm:hidden">
          Get started
        </Link>
      </div>
    );

  const { user, email } = session;
  const isAgent = user.role === "agent";
  const isGuest = !isAgent && !user.isDemo && !email;
  const links = isAgent
    ? [
        { href: "/agent", label: "Dispatch" },
      ]
    : [
        { href: "/watchlist", label: "Saved listings" },
        { href: "/notifications", label: "Notifications" },
      ];

  return (
    <details ref={box} className="relative shrink-0">
      <summary
        aria-label={`Account: ${user.displayName}`}
        className="grid size-11 cursor-pointer list-none place-items-center rounded-full bg-surface-2 font-semibold text-text transition-colors hover:bg-[var(--color-rule)] [&::-webkit-details-marker]:hidden"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-managed public avatar URL
          <img src={user.avatarUrl} alt="" className="size-full rounded-full object-cover" />
        ) : user.displayName.trim().charAt(0).toUpperCase()}
      </summary>
      <div className="account-popover absolute right-0 z-[var(--z-dropdown)] mt-2 flex w-80 max-w-[calc(100vw-1rem)] max-h-[min(30rem,80dvh)] overflow-y-auto flex-col gap-3 rounded-[22px] border border-border bg-surface p-4 shadow-[0_24px_70px_-28px_var(--color-shadow)]">
        <Link href="/profile" aria-label="Open profile and account settings" className="account-card flex gap-3 rounded-[16px] border border-border bg-surface-2 p-3 text-text no-underline">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-accent font-semibold text-[var(--color-accent-ink)]">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- user-managed public avatar URL
              <img src={user.avatarUrl} alt="" className="size-full rounded-full object-cover" />
            ) : user.displayName.trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex flex-col gap-0.5">
            <p className="font-medium break-words">{user.displayName}</p>
            <p className="meta break-all">{email ?? (user.isDemo ? "Demo account" : isAgent ? "Support agent" : "Guest account, on this device only")}</p>
          </div>
        </Link>
        {isGuest && (
          <Link href="/signup" className="btn btn-primary w-full">
            {t("nav.saveAccount")}
          </Link>
        )}
        <ul className="-mx-2 flex flex-col">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="flex min-h-tap items-center rounded-[var(--radius-field)] px-2 text-sm font-medium no-underline hover:bg-surface-2">
                {label(l.label)}
              </Link>
            </li>
          ))}
        </ul>
        <ThemeToggle />
        {user.isDemo && (
          <Link href="/try" className="btn btn-secondary w-full">
            {t("nav.switchDemo")}
          </Link>
        )}
        <button type="button" onClick={signOut} className="btn btn-quiet self-start px-0">
          {t("nav.signOut")}
        </button>
      </div>
    </details>
  );
}
