import { Suspense } from "react";
import { CaseView } from "./case-view";

export const metadata = { title: "Help request" };

// Cache Components: URL data (useParams) must sit under Suspense so the static shell can prerender.
export default function CasePage() {
  return (
    <Suspense fallback={<div aria-busy className="h-72 animate-pulse rounded-xl bg-surface" />}>
      <CaseView />
    </Suspense>
  );
}
