"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => setTheme(currentTheme()), []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("cg.theme", next);
    setTheme(next);
  }

  const dark = theme === "dark";
  return (
    <button
      type="button"
      aria-pressed={dark}
      aria-label={`Use ${dark ? "light" : "dark"} theme`}
      onClick={toggle}
      className={`theme-mode ${compact ? "theme-mode-compact" : ""}`}
    >
      <span aria-hidden className="theme-mode-glyph">
        {dark ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20 15.2A8.5 8.5 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>
        )}
      </span>
      {!compact && <span>{dark ? "Use light mode" : "Use dark mode"}</span>}
    </button>
  );
}
