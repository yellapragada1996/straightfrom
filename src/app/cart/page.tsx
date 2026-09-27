import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";
import { TopBar } from "@/components/top-bar";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default function CartPage() {
  return (
    <>
      <TopBar share={false} />
      <main className="flex-1">
        <CartView />
      </main>
    </>
  );
}
