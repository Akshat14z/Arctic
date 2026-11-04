import { notFound } from "next/navigation";
import { SpikeChat } from "./spike-chat";

export const metadata = { title: "SDK spike" };

// DHRUMIL-T02 throwaway test page. Never served in production.
export default function SpikePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <SpikeChat />;
}
