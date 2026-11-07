import { Suspense } from "react";
import { AgentCase } from "./agent-case";

export const metadata = { title: "Case" };

// Cache Components: URL data (useParams) must sit under Suspense so the static shell can prerender.
export default function AgentCasePage() {
  return (
    <Suspense fallback={<div aria-busy className="skeleton h-72" />}>
      <AgentCase />
    </Suspense>
  );
}
