"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { isCreatorSignedIn, useCreatorState } from "@/lib/creator-store";
import { useFanState } from "@/lib/fan-store";
import { Icon } from "../icons";

// The homepage is for creators, but anyone can land on it (the logo links here).
// Signed-in creators get their dashboard; fans keep their cart and orders.

export function HomeHeaderActions() {
  const creatorIn = isCreatorSignedIn(useCreatorState());
  const fanIn = !!useFanState().signedInEmail;
  const { count, ready } = useCart();

  return (
    <div className="flex items-center gap-1 md:gap-2">
      {ready && count > 0 && (
        <Link href="/cart" aria-label={`Cart, ${count} item${count > 1 ? "s" : ""}`} className="relative grid size-10 place-items-center hover:bg-tile">
          <Icon name="bag" />
          <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">{count}</span>
        </Link>
      )}
      {fanIn && !creatorIn && (
        <Link href="/account" className="inline-flex h-10 items-center px-2 text-[14px] font-semibold whitespace-nowrap hover:underline md:px-3 md:text-[15px]">
          Your orders
        </Link>
      )}
      {creatorIn ? (
        <Link href="/dashboard" className="inline-flex h-10 items-center gap-2 bg-ink px-4 text-[14px] font-semibold whitespace-nowrap text-white hover:bg-ink-2">
          Your dashboard <Icon name="arrow" className="size-4" />
        </Link>
      ) : (
        <>
          {!fanIn && (
            <Link href="/login" className="inline-flex h-10 items-center px-2 text-[14px] font-semibold whitespace-nowrap hover:underline md:px-3 md:text-[15px]">
              Sign in
            </Link>
          )}
          <Link href="/signup" className="inline-flex h-10 items-center bg-accent px-4 text-[14px] font-semibold whitespace-nowrap text-white hover:bg-accent-hover">
            Sign up
          </Link>
        </>
      )}
    </div>
  );
}

/** Big hero / closing button: sign up, or straight to the dashboard if already a creator. */
export function HeroCta() {
  const creatorIn = isCreatorSignedIn(useCreatorState());
  return (
    <Link
      href={creatorIn ? "/dashboard" : "/signup"}
      className="inline-flex h-[60px] items-center gap-3 bg-accent px-7 font-display text-xl font-extrabold text-white uppercase hover:bg-accent-hover"
    >
      {creatorIn ? "Go to your dashboard" : <>Sign up, it&apos;s free</>} <Icon name="arrow" />
    </Link>
  );
}

/** Small "Sign in" next to the closing button; hidden for signed-in creators. */
export function ClosingSignIn() {
  const creatorIn = isCreatorSignedIn(useCreatorState());
  if (creatorIn) return null;
  return (
    <Link href="/login" className="text-[15px] font-semibold text-white underline underline-offset-4 hover:text-accent">
      Sign in
    </Link>
  );
}
