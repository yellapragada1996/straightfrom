import type { Metadata } from "next";
import { OrderConfirmation } from "@/components/order-confirmation";
import { SiteFooter } from "@/components/site-footer";
import { TopBar } from "@/components/top-bar";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };

export default function SuccessPage() {
  return (
    <>
      <TopBar share={false} />
      <main className="flex-1">
        <OrderConfirmation />
      </main>
      <SiteFooter />
    </>
  );
}
