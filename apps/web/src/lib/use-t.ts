"use client";

import { translator } from "./i18n";
import { useSession } from "./session";

/** The signed-in reader's translator (English while signed out). */
export function useT() {
  const session = useSession();
  return translator(session?.user.language ?? "en");
}
