import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { CheckoutView } from "@/components/checkout-view";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <>
      {/* Calm, focused header: no share/cart buttons at checkout */}
      <header className="border-b border-line">
        <div className="mx-auto flex h-[58px] max-w-[1100px] items-center justify-between px-4 md:px-10">
          <Link href="/cart" className="flex min-h-11 items-center gap-1.5 text-sm font-semibold">
            <Icon name="back" className="size-[18px]" /> Cart
          </Link>
          <Wordmark className="text-xl" />
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <Icon name="lock" className="size-3.5" /> Secure
          </span>
        </div>
      </header>
      <main className="flex-1">
        <CheckoutView />
      </main>
    </>
  );
}
