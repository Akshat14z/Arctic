import { Suspense } from "react";
import { SealSkeleton, SealView } from "./seal-view";

export const metadata = { title: "Handshake Seal" };

// Public (D-023): anyone with the link or the QR can check the deal, no sign-in.
export default function SealPage() {
  return (
    <Suspense fallback={<SealSkeleton />}>
      <SealView />
    </Suspense>
  );
}
