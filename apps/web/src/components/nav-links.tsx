"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { LANGUAGES } from "@/lib/languages";
import { clearSession, useSession } from "@/lib/session";
import { Icon, type IconName } from "./icons";

type Tab = { href: string; label: string; icon: IconName };
const PEOPLE: Tab[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/listings", label: "Browse", icon: "browse" },
  { href: "/chats", label: "Chats", icon: "chats" },
  { href: "/listings/new", label: "Sell", icon: "sell" },
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
  return (
    <nav aria-label="Main" className="seg max-md:hidden">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={isHere(path, t.href) ? "page" : undefined} className="gap-2">
          <Icon name={t.icon} className="size-4" />
          {t.label}
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
  if (!session || /^\/(chats|cases|agent\/cases)\/./.test(path)) return null;
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-[var(--z-sticky-nav)] border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
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
                {t.label}
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
        <Link href="/signin" className="btn btn-quiet px-3">
          Sign in
        </Link>
        <Link href="/signup" className="btn btn-primary px-4">
          Get started
        </Link>
      </div>
    );

  const { user, email } = session;
  const lang = LANGUAGES.find((l) => l.code === user.language);
  const isAgent = user.role === "agent";
  const isGuest = !isAgent && !user.isDemo && !email;
  const links = isAgent
    ? [{ href: "/agent", label: "Dispatch" }]
    : [
        { href: "/home", label: "Home" },
        { href: "/chats", label: "My chats" },
        { href: "/listings?mine=1", label: "My listings" },
      ];

  return (
    <details ref={box} className="relative shrink-0">
      <summary
        aria-label={`Account: ${user.displayName}`}
        className="grid size-11 cursor-pointer list-none place-items-center rounded-full bg-surface-2 font-semibold text-text transition-colors hover:bg-[var(--color-rule)] [&::-webkit-details-marker]:hidden"
      >
        {user.displayName.trim().charAt(0).toUpperCase()}
      </summary>
      <div className="absolute right-0 z-[var(--z-dropdown)] mt-2 flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-[20px] border border-border bg-surface p-4 shadow-[0_18px_40px_-18px_var(--color-shadow)]">
        <div className="flex flex-col gap-0.5">
          <p className="font-medium break-words">{user.displayName}</p>
          <p className="meta break-all">{email ?? (user.isDemo ? "Demo account" : isAgent ? "Support agent" : "Guest account, on this device only")}</p>
          <p className="meta">
            Reads <span lang={user.language}>{lang?.native}</span>
          </p>
        </div>
        {isGuest && (
          <Link href="/signup" className="btn btn-primary w-full">
            Save your account
          </Link>
        )}
        <ul className="-mx-2 flex flex-col">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="flex min-h-tap items-center rounded-[var(--radius-field)] px-2 text-sm font-medium no-underline hover:bg-surface-2">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        {user.isDemo && (
          <Link href="/try" className="btn btn-secondary w-full">
            Switch demo account
          </Link>
        )}
        <button type="button" onClick={clearSession} className="btn btn-quiet self-start px-0">
          Sign out
        </button>
      </div>
    </details>
  );
}
