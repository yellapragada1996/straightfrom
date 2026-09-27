"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { Icon } from "./icons";

const btn = "grid size-11 place-items-center border-[1.5px] border-ink transition-colors hover:bg-ink hover:text-white";

export function ShareButton({ label = "Share this page" }: { label?: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* dismissed */
    }
  }
  return (
    <button type="button" onClick={share} aria-label={label} className={`${btn} relative`}>
      <Icon name={copied ? "check" : "share"} />
      {copied && (
        <span className="absolute top-full right-0 mt-2 whitespace-nowrap bg-ink px-2.5 py-1.5 text-xs text-white">Link copied</span>
      )}
    </button>
  );
}

export function CartButton() {
  const { count, ready } = useCart();
  return (
    <Link href="/cart" aria-label={count ? `Cart, ${count} item${count > 1 ? "s" : ""}` : "Cart"} className={`${btn} relative`}>
      <Icon name="bag" />
      {ready && count > 0 && (
        <span className="absolute -top-2 -right-2 grid min-w-5 h-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
