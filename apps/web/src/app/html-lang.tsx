"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/session";

/** Keeps <html lang> in step with the signed-in user's language (screen readers, font selection). */
export function HtmlLang() {
  const lang = useSession()?.user.language ?? "en";
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}
