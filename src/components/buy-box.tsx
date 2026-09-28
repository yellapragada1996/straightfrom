"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart";
import { money } from "@/lib/format";
import type { Product } from "@/lib/types";
import { CartConflictDialog } from "./cart-conflict-dialog";
import { Icon } from "./icons";
import { Circled } from "./scribbles";

type Props = { product: Product; handle: string; first: string; shipsTo: string };

/** Price, shipping, cart/buy actions, and the protected-purchase promise. */
export function BuyBox({ product, handle, first, shipsTo }: Props) {
  const router = useRouter();
  const { cart, has, add, startNewCart, ready } = useCart();
  const [conflict, setConflict] = useState<null | "add" | "buy">(null);
  const [showBar, setShowBar] = useState(false);
  const actions = useRef<HTMLDivElement>(null);

  const state = product.status === "sold_out" ? "sold" : product.status === "reserved" ? "reserved" : "available";
  const inCart = ready && has(product.id);
  const total = product.priceCents + product.shippingCents;

  // Pinned buy bar on phones once the main buttons scroll out of view.
  useEffect(() => {
    const el = actions.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function addToCart(then?: "checkout") {
    const r = add(product, handle);
    if (r === "conflict") return setConflict(then === "checkout" ? "buy" : "add");
    if (then === "checkout") router.push("/checkout");
  }

  const priceRow = (
    <>
      <div className="flex flex-wrap items-center gap-3.5">
        <span className={`font-display text-[56px] leading-[0.85] font-extrabold tracking-[-0.05em] ${state === "sold" ? "text-muted" : ""}`}>
          {money(product.priceCents)}
        </span>
        {state !== "sold" && <Circled>{product.quantity > 1 ? `${product.quantity} left!` : "one of one"}</Circled>}
      </div>
      <p className="-mt-2 text-[15px] text-ink-2">
        + {money(product.shippingCents)} shipping · Ships to {shipsTo}
      </p>
    </>
  );

  if (state === "sold") {
    return (
      <>
        {priceRow}
        <div className="flex flex-col gap-1.5 bg-ink p-5 text-white">
          <p className="font-display text-[34px] leading-[0.9] font-extrabold tracking-[-0.04em] uppercase">
            Sold<em className="not-italic text-accent">.</em>
          </p>
          <p className="text-[15px] text-[#cfcfcf]">A fan owns this one now.</p>
          <Link
            href={`/${handle}`}
            className="mt-3 flex h-[50px] items-center justify-between bg-white px-4 font-display text-[15px] font-extrabold text-ink uppercase"
          >
            See what else {first} has <Icon name="arrow" />
          </Link>
        </div>
      </>
    );
  }

  const primary =
    state === "reserved" ? (
      <button type="button" disabled className="flex h-[62px] w-full items-center justify-center gap-2.5 bg-tile font-display text-lg font-extrabold text-muted uppercase">
        <Icon name="clock" /> Someone&apos;s checking out
      </button>
    ) : inCart ? (
      <Link href="/cart" className="flex h-[62px] w-full items-center justify-between bg-ink px-5 font-display text-xl font-extrabold tracking-[-0.01em] text-white uppercase hover:bg-ink-2">
        <span className="flex items-center gap-2">
          <Icon name="check" /> In your cart
        </span>
        <span className="flex items-center gap-2 text-base">View cart <Icon name="arrow" /></span>
      </Link>
    ) : (
      <button
        type="button"
        onClick={() => addToCart()}
        className="flex h-[62px] w-full items-center justify-between bg-accent px-5 font-display text-[21px] font-extrabold tracking-[-0.01em] text-white uppercase hover:bg-accent-hover"
      >
        <span>Add to cart</span>
        <span>{money(product.priceCents)}</span>
      </button>
    );

  return (
    <>
      {priceRow}

      <div ref={actions} className="flex flex-col gap-2">
        {primary}
        {state === "available" && (
          <button
            type="button"
            onClick={() => (inCart ? router.push("/checkout") : addToCart("checkout"))}
            className="flex h-[52px] w-full items-center justify-center gap-2 border-[1.5px] border-ink font-display text-base font-extrabold uppercase hover:bg-ink hover:text-white"
          >
            {inCart ? "Go to checkout" : "Buy now"} <Icon name="arrow" className="size-4" />
          </button>
        )}
        {state === "reserved" ? (
          <p className="bg-[#fff4f3] px-3.5 py-3 text-sm leading-relaxed text-ink-2">
            Someone is paying for this right now. If they don&apos;t finish, it&apos;s back on sale within 30 minutes.
          </p>
        ) : (
          <p className="text-[13px] text-muted">
            {money(product.priceCents)} + {money(product.shippingCents)} shipping = <b className="text-ink">{money(total)}</b>. Buying
            more from {first}? You only pay shipping once.
          </p>
        )}
      </div>

      <div className="grid grid-cols-[26px_1fr] gap-3 border border-line bg-soft px-4 py-3.5">
        <Icon name="shield" className="size-6" />
        <div>
          <b className="block text-[15px] font-bold">Protected purchase</b>
          <span className="text-[13.5px] leading-relaxed text-ink-2">
            {first} has 7 days to ship it, or you&apos;re refunded automatically. Secure checkout by Stripe, no account needed.
          </span>
        </div>
      </div>

      {/* Pinned bar (phones only) */}
      {state === "available" && (
        <div
          aria-hidden={!showBar}
          className={`fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t-[1.5px] border-ink bg-white py-2.5 pr-3 pl-4 pb-[calc(10px+env(safe-area-inset-bottom))] transition-transform duration-300 md:hidden ${
            showBar ? "translate-y-0" : "translate-y-[110%]"
          }`}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px]">{product.title}</p>
            <p className="font-display text-xl leading-tight font-extrabold tracking-[-0.03em]">
              {money(total)} <span className="font-sans text-xs font-normal text-muted">incl. shipping</span>
            </p>
          </div>
          {inCart ? (
            <Link href="/cart" tabIndex={showBar ? 0 : -1} className="grid h-12 place-items-center bg-ink px-5 font-display text-lg font-extrabold text-white uppercase">
              View cart
            </Link>
          ) : (
            <button type="button" tabIndex={showBar ? 0 : -1} onClick={() => addToCart()} className="h-12 bg-accent px-5 font-display text-lg font-extrabold text-white uppercase">
              Add to cart
            </button>
          )}
        </div>
      )}

      <CartConflictDialog
        open={conflict !== null}
        currentHandle={cart.creatorHandle ?? ""}
        newHandle={handle}
        onClose={() => setConflict(null)}
        onStartNew={() => {
          const goCheckout = conflict === "buy";
          startNewCart(product, handle);
          setConflict(null);
          if (goCheckout) router.push("/checkout");
        }}
      />
    </>
  );
}
