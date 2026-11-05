import { Suspense } from "react";
import { AgentCase } from "./agent-case";

export const metadata = { title: "Case" };

// Cache Components: URL data (useParams) must sit under Suspense so the static shell can prerender.
export default function AgentCasePage() {
  return (
    <Suspense fallback={<div aria-busy className="h-72 animate-pulse rounded-xl bg-surface" />}>
      <AgentCase />
    </Suspense>
  );
}
