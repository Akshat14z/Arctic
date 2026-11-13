"use client";

import { usePathname } from "next/navigation";
import { Inbox } from "./inbox";

/**
 * Chats as two panes on wide screens (the list stays, the open chat on the right), one at a time on phones:
 * /chats shows the list, /chats/[id] the conversation with a back button. One Inbox instance, so one fetch.
 */
export function ChatsShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const inThread = path !== "/chats";
  return (
    <div data-wide className="grid grid-cols-1 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-6">
      <aside className={`${inThread ? "max-lg:hidden" : ""} lg:sticky lg:top-4 lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto`}>
        <Inbox />
      </aside>
      <div className={inThread ? "min-w-0" : "max-lg:hidden"}>{children}</div>
    </div>
  );
}
