"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  return session?.user.role === "agent" ? AGENT : PEOPLE;
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
                <span className={`grid h-7 w-12 place-items-center rounded-full ${here ? "bg-text text-bg" : ""}`}>
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

/** Who you are, what you read, and the way out, behind your initial (a native disclosure: no script menu to break). */
export function AccountMenu() {
  const session = useSession();
  if (session === undefined) return <span className="size-11" aria-hidden />;
  if (!session)
    return (
      <Link href="/try" className="btn btn-primary">
        Try the demo
      </Link>
    );
  const { user } = session;
  const lang = LANGUAGES.find((l) => l.code === user.language);
  const isDemo = user.id.startsWith("demo_");
  return (
    <details className="relative">
      <summary
        aria-label={`Account: ${user.displayName}`}
        className="grid size-11 cursor-pointer list-none place-items-center rounded-full bg-surface-2 font-semibold text-text [&::-webkit-details-marker]:hidden"
      >
        {user.displayName.trim().charAt(0).toUpperCase()}
      </summary>
      <div className="absolute right-0 z-[var(--z-dropdown)] mt-2 flex w-64 flex-col gap-3 rounded-[20px] border border-border bg-surface p-4">
        <div>
          <p className="font-medium">{user.displayName}</p>
          <p className="meta">
            Reads <span lang={user.language}>{lang?.native}</span>
          </p>
        </div>
        {isDemo && (
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
