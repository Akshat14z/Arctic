import { Suspense } from "react";
import { ChatsShell } from "./chats-shell";

/** The shell reads the path (which pane to show), so it sits under Suspense; the fallback renders the page alone. */
export default function ChatsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div data-wide>{children}</div>}>
      <ChatsShell>{children}</ChatsShell>
    </Suspense>
  );
}
