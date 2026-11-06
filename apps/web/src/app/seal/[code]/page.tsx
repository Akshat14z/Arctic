import { Suspense } from "react";
import { SealView } from "./seal-view";

export const metadata = { title: "Handshake Seal" };

// Public (D-023): anyone with the link or the QR can check the deal, no sign-in.
export default function SealPage() {
  return (
    <Suspense fallback={<div aria-busy className="h-96 animate-pulse rounded-xl bg-surface" />}>
      <SealView />
    </Suspense>
  );
}
