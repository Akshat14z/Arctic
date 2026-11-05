import { Suspense } from "react";
import { Conversation } from "./conversation";

export const metadata = { title: "Chat" };

// Cache Components: URL data (useParams) must sit under Suspense so the static shell can prerender.
export default function ChatPage() {
  return (
    <Suspense fallback={<div aria-busy className="h-72 animate-pulse rounded-xl bg-surface" />}>
      <Conversation />
    </Suspense>
  );
}
