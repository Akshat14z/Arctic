import { Suspense } from "react";
import { CaseSkeleton, CaseView } from "./case-view";

export const metadata = { title: "Help request" };

// Cache Components: URL data (useParams) must sit under Suspense so the static shell can prerender.
export default function CasePage() {
  return (
    <Suspense fallback={<CaseSkeleton />}>
      <CaseView />
    </Suspense>
  );
}
