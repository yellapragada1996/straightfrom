"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { money } from "@/lib/format";
import { isSignedInAs, useFanState } from "@/lib/fan-store";
import { loadOrder, type PlacedOrder } from "@/lib/last-order";
import { FanSignIn } from "./fan/fan-account";
import { Icon } from "./icons";
import { RingAvatar } from "./ring-avatar";
import { Underline } from "./scribbles";

export function OrderConfirmation() {
  // undefined while server-rendering / hydrating, then the stored order (or null).
  const order = useSyncExternalStore<PlacedOrder | null | undefined>(
    () => () => {},
    loadOrder,
    () => undefined,
  );

  if (order === undefined) return <div className="h-[60vh]" aria-busy="true" />;
  if (!order) {
    return (
      <div className="mx-auto flex max-w-[1240px] flex-col items-start gap-4 px-4 py-16 md:px-10">
        <h1 className="font-display text-[46px] leading-[0.86] font-extrabold tracking-[-0.045em] uppercase">No recent order</h1>
        <p className="text-ink-2">Your order confirmation is also in your email.</p>
      </div>
    );
  }

  const first = order.creatorName.split(" ")[0];
  const steps = [
    { icon: "box" as const, t: `${first} packs and ships it`, d: "Personally, within 7 days." },
    { icon: "mail" as const, t: "You get a tracking link", d: `Emailed to ${order.email} as soon as it ships.` },
    { icon: "refund" as const, t: "Protected", d: "If it doesn't ship within 7 days, you're refunded automatically." },
  ];

  return (
    <div className="mx-auto grid max-w-[1100px] gap-10 px-4 pt-8 pb-16 md:grid-cols-[minmax(0,1fr)_380px] md:gap-14 md:px-10 md:pt-14 md:pb-24">
      <section>
        <p className="font-hand text-[28px] font-semibold text-accent -rotate-2 inline-block">it&apos;s yours!</p>
        <h1 className="mt-1 font-display text-[46px] leading-[0.86] font-extrabold tracking-[-0.045em] uppercase md:text-[76px]">
          Order{" "}
          <span className="relative inline-block">
            confirmed
            <Underline draw className="absolute -bottom-[0.1em] left-0 h-[0.16em] w-full [stroke-width:4]" />
          </span>
        </h1>
        <p className="mt-5 flex flex-wrap items-center gap-2 text-lg">
          It&apos;s coming <i className="font-serif text-[1.15em] text-accent">straight from</i>
          <RingAvatar src={order.creatorAvatar} size={30} />
          <b className="font-display font-extrabold">@{order.creatorHandle}</b>
        </p>
        <p className="mt-2 text-sm text-muted">
          Order {order.id} · A receipt is on its way to {order.email}
        </p>

        <h2 className="mt-10 border-t-[1.5px] border-ink pt-4 font-display text-xl font-extrabold uppercase">What happens next</h2>
        <ol className="mt-4 flex flex-col gap-4">
          {steps.map((s, i) => (
            <li key={s.t} className="grid grid-cols-[34px_1fr] gap-3">
              <span className="grid size-[34px] place-items-center rounded-full bg-ink font-display font-extrabold text-white">{i + 1}</span>
              <div className="text-sm leading-snug text-muted">
                <b className="block text-[15px] font-semibold text-ink">{s.t}</b>
                {s.d}
              </div>
            </li>
          ))}
        </ol>

        <SaveToAccount email={order.email} />

        <Link
          href={`/${order.creatorHandle}`}
          className="mt-8 inline-flex h-[54px] items-center gap-2.5 border-[1.5px] border-ink px-5 font-display font-extrabold uppercase hover:bg-ink hover:text-white"
        >
          Back to @{order.creatorHandle} <Icon name="arrow" />
        </Link>
      </section>

      <aside className="flex flex-col gap-5 self-start border-[1.5px] border-ink p-5" aria-label="Order details">
        <ul className="flex flex-col gap-3">
          {order.items.map((it) => (
            <li key={it.title} className="grid grid-cols-[56px_1fr_auto] items-center gap-3">
              <span className="relative aspect-[4/5] overflow-hidden bg-tile">
                <Image src={it.image} alt="" fill sizes="60px" className="object-cover" />
              </span>
              <span className="text-sm leading-snug">
                {it.title}
                {it.quantity > 1 && <span className="text-muted"> × {it.quantity}</span>}
              </span>
              <span className="text-sm font-semibold tabular-nums">{money(it.priceCents * it.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-2 border-t border-line pt-3 text-[15px]">
          <div className="flex justify-between"><dt className="text-ink-2">Subtotal</dt><dd className="tabular-nums">{money(order.subtotalCents)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-2">Shipping</dt><dd className="tabular-nums">{money(order.shippingCents)}</dd></div>
          <div className="flex justify-between border-t border-line pt-3"><dt className="font-bold">Paid</dt><dd className="font-display text-xl font-extrabold tabular-nums">{money(order.totalCents)}</dd></div>
        </dl>
        <div className="border-t border-line pt-3 text-sm leading-relaxed">
          <p className="mb-1 text-xs font-bold tracking-[0.08em] uppercase">Shipping to</p>
          {order.shipTo.name}
          <br />
          {order.shipTo.line1}
          {order.shipTo.line2 ? `, ${order.shipTo.line2}` : ""}
          <br />
          {order.shipTo.city}, {order.shipTo.region} {order.shipTo.postal}
          <br />
          {order.shipTo.country}
        </div>
      </aside>
    </div>
  );
}

/** Optional sign-up: never required, but offered right after the purchase. */
function SaveToAccount({ email }: { email: string }) {
  const fan = useFanState();
  if (isSignedInAs(fan, email)) {
    return (
      <Link href="/account" className="mt-10 flex items-center justify-between gap-3 border border-line bg-soft px-4 py-3.5 text-sm">
        <span className="flex items-center gap-2"><Icon name="check" className="size-[18px] text-accent" /> Saved to your account</span>
        <span className="flex items-center gap-1 font-semibold">Your orders <Icon name="arrow" className="size-4" /></span>
      </Link>
    );
  }
  return (
    <div className="mt-10 border-[1.5px] border-ink p-5">
      <p className="inline-block -rotate-2 font-hand text-2xl leading-none font-semibold text-accent">keep track</p>
      <h2 className="mt-1 font-display text-2xl leading-none font-extrabold uppercase">Save it to your account</h2>
      <p className="mt-2 mb-4 text-sm leading-relaxed text-ink-2">
        Optional. See this order and every future one in one place, with tracking. No password: we&apos;ll email you a link.
      </p>
      <FanSignIn presetEmail={email} compact />
    </div>
  );
}
