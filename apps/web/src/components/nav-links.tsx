"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/listings", label: "Browse" },
  { href: "/chats", label: "Chats" },
];

/** Browse and Chats, with the current section marked (aria-current, an ink underline). */
export function NavLinks() {
  const path = usePathname();
  return LINKS.map(({ href, label }) => {
    const here = path === href || (path.startsWith(`${href}/`) && path !== "/listings/new");
    return (
      <Link key={href} href={href} aria-current={here ? "page" : undefined} className={`btn btn-quiet ${here ? "" : "no-underline hover:underline"}`}>
        {label}
      </Link>
    );
  });
}

/** Same links before the client knows the path (static prerender). */
export function NavLinksStatic() {
  return LINKS.map(({ href, label }) => (
    <Link key={href} href={href} className="btn btn-quiet no-underline hover:underline">
      {label}
    </Link>
  ));
}
