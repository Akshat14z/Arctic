import { Suspense } from "react";
import { ListingDetail } from "./listing-detail";

export const metadata = { title: "Listing" };

// Cache Components: URL data (useParams) must sit under Suspense so the static shell can prerender.
export default function ListingPage() {
  return (
    <Suspense fallback={<div aria-busy className="h-72 animate-pulse rounded-xl bg-surface" />}>
      <ListingDetail />
    </Suspense>
  );
}
