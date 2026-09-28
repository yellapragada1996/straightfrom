"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { buildCart } from "@/lib/cart-view-model";
import { firstName, money } from "@/lib/format";
import { fanActions } from "@/lib/fan-store";
import { newOrderId, saveOrder, type PlacedOrder } from "@/lib/last-order";
import { Icon } from "./icons";
import { RingAvatar } from "./ring-avatar";
import { days, SHIP_COUNTRIES_TEXT, SHIP_DEADLINE_DAYS } from "@/config";

// Prototype checkout: our own page. In the real app the "Payment" block is
// Stripe's embedded Payment Element; here it's a stand-in with no real charge.

const DECLINE_CARD = "4000000000000002";

type Form = {
  email: string;
  name: string;
  country: "US" | "CA";
  line1: string;
  line2: string;
  city: string;
  region: string;
  postal: string;
  card: string;
  exp: string;
  cvc: string;
};

const EMPTY: Form = { email: "", name: "", country: "US", line1: "", line2: "", city: "", region: "", postal: "", card: "", exp: "", cvc: "" };
const DEMO: Form = {
  email: "sam.fan@example.com",
  name: "Sam Rivera",
  country: "US",
  line1: "120 Hudson St",
  line2: "Apt 4B",
  city: "New York",
  region: "NY",
  postal: "10013",
  card: "4242 4242 4242 4242",
  exp: "12 / 29",
  cvc: "123",
};

const input =
  "h-12 w-full border-[1.5px] border-line bg-white px-3.5 text-[16px] outline-none transition-colors placeholder:text-[#9a9a9a] focus:border-ink aria-invalid:border-accent";
const label = "mb-1.5 block text-[13px] font-semibold";

export function CheckoutView() {
  const router = useRouter();
  const { cart, ready, clear } = useCart();
  const [f, setF] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  if (!ready) return <div className="h-[60vh]" aria-busy="true" />;
  const { buyable, subtotal, shipping, total, creator } = buildCart(cart);

  if (!buyable.length || !creator) {
    return (
      <div className="mx-auto flex max-w-[1240px] flex-col items-start gap-4 px-4 py-16 md:px-10">
        <h1 className="font-display text-[46px] leading-[0.86] font-extrabold tracking-[-0.045em] uppercase">Nothing to check out</h1>
        <Link href="/cart" className="text-sm font-semibold underline underline-offset-4">Back to your cart</Link>
      </div>
    );
  }

  const first = firstName(creator);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const isCA = f.country === "CA";

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    await new Promise((r) => setTimeout(r, 1400));
    if (f.card.replace(/\s/g, "") === DECLINE_CARD) {
      setBusy(false);
      setError("Your card was declined. Nothing was charged. Try another card.");
      return;
    }
    const placed: PlacedOrder = {
      id: newOrderId(),
      creatorHandle: creator!.handle,
      creatorName: creator!.displayName,
      creatorAvatar: creator!.avatarUrl,
      email: f.email,
      shipTo: { name: f.name, line1: f.line1, line2: f.line2 || undefined, city: f.city, region: f.region, postal: f.postal, country: isCA ? "Canada" : "United States" },
      items: buyable.map((r) => ({ title: r.product.title, image: r.product.images[0], priceCents: r.product.priceCents, quantity: r.quantity })),
      subtotalCents: subtotal,
      shippingCents: shipping,
      totalCents: total,
    };
    saveOrder(placed);
    fanActions.recordOrder(placed);
    clear();
    router.push("/checkout/success");
  }

  const summary = (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {buyable.map((r) => (
          <li key={r.product.id} className="grid grid-cols-[56px_1fr_auto] items-center gap-3">
            <span className="relative aspect-[4/5] overflow-hidden bg-tile">
              <Image src={r.product.images[0]} alt="" fill sizes="60px" className="object-cover" />
              {r.quantity > 1 && (
                <span className="absolute top-0.5 right-0.5 grid size-5 place-items-center rounded-full bg-ink text-[11px] font-bold text-white">{r.quantity}</span>
              )}
            </span>
            <span className="text-sm leading-snug">{r.product.title}</span>
            <span className="text-sm font-semibold tabular-nums">{money(r.product.priceCents * r.quantity)}</span>
          </li>
        ))}
      </ul>
      <dl className="flex flex-col gap-2 border-t border-line pt-3 text-[15px]">
        <div className="flex justify-between"><dt className="text-ink-2">Subtotal</dt><dd className="tabular-nums">{money(subtotal)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-2">Shipping from {first}</dt><dd className="tabular-nums">{money(shipping)}</dd></div>
        <div className="mt-1 flex items-baseline justify-between border-t border-line pt-3">
          <dt className="font-bold">Total</dt>
          <dd className="font-display text-2xl font-extrabold tabular-nums">{money(total)} <span className="font-sans text-xs font-normal text-muted">USD</span></dd>
        </div>
      </dl>
    </div>
  );

  return (
    <div className="mx-auto grid max-w-[1100px] md:grid-cols-[minmax(0,1fr)_400px] md:items-start md:gap-14 md:px-10 md:py-12">
      {/* Mobile: collapsible order summary at the top */}
      <div className="border-b border-line bg-soft md:hidden">
        <button type="button" onClick={() => setSummaryOpen((o) => !o)} aria-expanded={summaryOpen} className="flex w-full items-center justify-between px-4 py-4 text-sm">
          <span className="flex items-center gap-2 font-semibold">
            <Icon name="bag" className="size-[18px]" /> {summaryOpen ? "Hide" : "Show"} order summary
          </span>
          <span className="font-display text-xl font-extrabold tabular-nums">{money(total)}</span>
        </button>
        {summaryOpen && <div className="px-4 pb-5">{summary}</div>}
      </div>

      <form onSubmit={pay} className="flex flex-col gap-8 px-4 pt-6 pb-14 md:px-0 md:pt-0" noValidate={false}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-[44px] leading-[0.86] font-extrabold tracking-[-0.045em] uppercase md:text-[64px]">Checkout</h1>
          <button type="button" onClick={() => setF(DEMO)} className="border border-dashed border-muted px-2.5 py-1.5 text-xs text-muted hover:text-ink">
            Prototype: fill test details
          </button>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 font-display text-xl font-extrabold uppercase">1 · Contact</legend>
          <div>
            <label htmlFor="email" className={label}>Email</label>
            <input id="email" type="email" autoComplete="email" required value={f.email} onChange={set("email")} className={input} placeholder="you@example.com" />
            <p className="mt-1.5 text-[13px] text-muted">Your receipt and tracking link go here. Use the same email every time and all your orders show up if you create an account.</p>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 font-display text-xl font-extrabold uppercase">2 · Shipping address</legend>
          <div>
            <label htmlFor="name" className={label}>Full name</label>
            <input id="name" autoComplete="name" required value={f.name} onChange={set("name")} className={input} />
          </div>
          <div>
            <label htmlFor="country" className={label}>Country</label>
            <select id="country" autoComplete="country" value={f.country} onChange={set("country")} className={input}>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
            </select>
            <p className="mt-1.5 text-[13px] text-muted">{first} ships to {SHIP_COUNTRIES_TEXT}.</p>
          </div>
          <div>
            <label htmlFor="line1" className={label}>Address</label>
            <input id="line1" autoComplete="address-line1" required value={f.line1} onChange={set("line1")} className={input} />
          </div>
          <div>
            <label htmlFor="line2" className={label}>Apartment, suite, etc. <span className="font-normal text-muted">(optional)</span></label>
            <input id="line2" autoComplete="address-line2" value={f.line2} onChange={set("line2")} className={input} />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <div className="col-span-2 md:col-span-1">
              <label htmlFor="city" className={label}>City</label>
              <input id="city" autoComplete="address-level2" required value={f.city} onChange={set("city")} className={input} />
            </div>
            <div>
              <label htmlFor="region" className={label}>{isCA ? "Province" : "State"}</label>
              <input id="region" autoComplete="address-level1" required value={f.region} onChange={set("region")} className={input} />
            </div>
            <div>
              <label htmlFor="postal" className={label}>{isCA ? "Postal code" : "ZIP code"}</label>
              <input id="postal" autoComplete="postal-code" required value={f.postal} onChange={set("postal")} className={input} />
            </div>
          </div>
          <p className="text-[13px] text-muted">Only {first} sees your address, to ship your order. It&apos;s never shown publicly.</p>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 flex w-full items-center justify-between font-display text-xl font-extrabold uppercase">
            3 · Payment
            <span className="flex items-center gap-1.5 font-sans text-xs font-normal tracking-normal text-muted normal-case">
              <Icon name="lock" className="size-3.5" /> Secured by Stripe
            </span>
          </legend>
          <div className="flex flex-col gap-3 border-[1.5px] border-line p-4">
            <div>
              <label htmlFor="card" className={label}>Card number</label>
              <input id="card" inputMode="numeric" autoComplete="cc-number" required value={f.card} onChange={set("card")} className={input} placeholder="1234 1234 1234 1234" aria-invalid={!!error} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="exp" className={label}>Expiry</label>
                <input id="exp" inputMode="numeric" autoComplete="cc-exp" required value={f.exp} onChange={set("exp")} className={input} placeholder="MM / YY" />
              </div>
              <div>
                <label htmlFor="cvc" className={label}>CVC</label>
                <input id="cvc" inputMode="numeric" autoComplete="cc-csc" required value={f.cvc} onChange={set("cvc")} className={input} placeholder="123" />
              </div>
            </div>
            <p className="text-xs text-muted">Stand-in for Stripe&apos;s card form. Try 4000 0000 0000 0002 to see a declined card.</p>
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="-mt-4 flex gap-2.5 bg-[#fff4f3] px-4 py-3 text-sm text-ink">
            <Icon name="alert" className="mt-0.5 size-[18px] text-accent" /> {error}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="submit"
            disabled={busy}
            className="flex h-[62px] items-center justify-between bg-accent px-5 font-display text-[21px] font-extrabold text-white uppercase hover:bg-accent-hover disabled:opacity-70"
          >
            {busy ? <span className="mx-auto">Processing…</span> : <><span>Pay {money(total)}</span><Icon name="lock" /></>}
          </button>
          <p className="text-[13px] leading-relaxed text-muted">
            By paying you agree to the <Link href="/terms" className="underline">Terms</Link>. {first} has {days(SHIP_DEADLINE_DAYS)} to ship, or you&apos;re refunded
            automatically.
          </p>
        </div>
      </form>

      {/* Desktop: order summary on the right */}
      <aside className="hidden flex-col gap-4 md:sticky md:top-6 md:flex" aria-label="Order summary">
        <div className="border-[1.5px] border-ink p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <RingAvatar src={creator.avatarUrl} size={36} />
            <span className="text-[15px]">
              <i className="font-serif text-[1.15em] text-accent">straight from </i>
              <b className="font-display font-extrabold">@{creator.handle}</b>
            </span>
          </div>
          {summary}
        </div>
        <Link href="/cart" className="self-start text-sm underline underline-offset-4">Edit cart</Link>
      </aside>
    </div>
  );
}
