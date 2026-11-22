"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { AccountMenu, NavTabs } from "./nav-links";

const ANNOUNCEMENTS = [
  "Seller storefronts are live",
  "Follow trusted sellers and catch their newest listings",
  "Save listings to track price changes",
  "Every chat reads in your language",
];

export function AppHeader() {
  const path = usePathname();
  const [announcementsPaused, setAnnouncementsPaused] = useState(false);
  if (path === "/") return null;

  return (
    <>
      <header data-app-chrome className="sticky top-0 z-[var(--z-sticky-nav)] border-b border-border bg-bg/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4">
          <Link href="/home" className="flex min-h-tap shrink-0 items-center font-display text-2xl leading-none no-underline">
            <span className="max-sm:hidden">CommonGrounds</span><span className="sm:hidden">CG</span>
          </Link>
          <div className="flex flex-1 justify-center">
            <Suspense fallback={<span className="h-11 flex-1" aria-hidden />}><NavTabs /></Suspense>
          </div>
          <Suspense fallback={<span className="size-11" aria-hidden />}><AccountMenu /></Suspense>
        </div>
      </header>
      <div data-app-announcement className={`announcement-rail ${announcementsPaused ? "is-paused" : ""}`} aria-label="Marketplace announcements">
        <div className="announcement-track">
          {[0, 1].map((copy) => (
            <div key={copy} className="announcement-set" aria-hidden={copy === 1}>
              {ANNOUNCEMENTS.map((item) => <span key={item}>{item}<i aria-hidden>●</i></span>)}
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setAnnouncementsPaused((value) => !value)} className="announcement-control" aria-pressed={announcementsPaused}>
          {announcementsPaused ? "Play" : "Pause"}
        </button>
      </div>
    </>
  );
}

