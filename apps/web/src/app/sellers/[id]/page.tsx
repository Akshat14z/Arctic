import type { Metadata } from "next";
import { Suspense } from "react";
import { SellerStorefront } from "./seller-storefront";

export const metadata: Metadata = { title: "Seller storefront" };

export default function SellerPage() {
  return <Suspense fallback={<div aria-busy className="skeleton h-72" />}><SellerStorefront /></Suspense>;
}
