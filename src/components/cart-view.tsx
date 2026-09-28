"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { buildCart, type CartRow } from "@/lib/cart-view-model";
import { firstName, money } from "@/lib/format";
import { Icon } from "./icons";
import { RingAvatar } from "./ring-avatar";
import { days, RESERVATION_MINUTES, SHIP_DEADLINE_DAYS } from "@/config";

export function CartView() {
  const { cart, ready, setQuantity, remove } = useCart();

  if (!ready) return <div className="mx-auto h-[60vh] w-full max-w-[1240px]" aria-busy="true" />;

  const { rows, buyable, subtotal, shipping, total, creator } = buildCart(cart);

  if (!rows.length || !creator) {
    return (
      <div className="mx-auto flex max-w-[1240px] flex-col items-start gap-4 px-4 py-16 md:px-10 md:py-24">
        <h1 className="font-display text-[46px] leading-[0.86] font-extrabold tracking-[-0.045em] uppercase md:text-[80px]">Your cart is empty</h1>
        <p className="max-w-md font-serif text-2xl italic text-ink-2">
          Head back to a creator&apos;s page and find something that was really theirs.
        </p>
      </div>
    );
  }

  const first = firstName(creator);
  const problems = rows.filter((r) => r.state !== "ok");

  return (
    <div className="mx-auto grid max-w-[1240px] gap-8 px-4 pt-6 pb-16 md:grid-cols-[minmax(0,1fr)_380px] md:items-start md:gap-14 md:px-10 md:pt-12 md:pb-24">
      <section aria-labelledby="cart-h">
        <h1 id="cart-h" className="font-display text-[46px] leading-[0.86] font-extrabold tracking-[-0.045em] uppercase md:text-[72px]">
          Your cart
        </h1>
        <Link href={`/${creator.handle}`} className="mt-4 flex items-center gap-2.5">
          <RingAvatar src={creator.avatarUrl} size={36} />
          <span className="text-[15px]">
            <i className="font-serif text-[1.15em] text-accent">straight from </i>
            <b className="font-display font-extrabold">@{creator.handle}</b>
          </span>
        </Link>

        {problems.length > 0 && (
          <p className="mt-5 flex gap-2.5 bg-[#fff4f3] px-4 py-3 text-sm leading-relaxed text-ink-2" role="status">
            <Icon name="alert" className="mt-0.5 size-[18px] text-accent" />
            {problems.length === 1 ? "One piece in your cart" : `${problems.length} pieces in your cart`} can&apos;t be bought right now. They&apos;re not
            included in your total.
          </p>
        )}

        <ul className="mt-6 border-t-[1.5px] border-ink">
          {rows.map((r) => (
            <CartLine key={r.product.id} row={r} handle={creator.handle} onQty={(q) => setQuantity(r.product.id, q)} onRemove={() => remove(r.product.id)} />
          ))}
        </ul>

        <Link href={`/${creator.handle}`} className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4">
          Keep browsing {first}&apos;s pieces
        </Link>
      </section>

      <aside className="flex flex-col gap-4 md:sticky md:top-6" aria-label="Order summary">
        <div className="border-[1.5px] border-ink p-5">
          <h2 className="font-display text-xl font-extrabold tracking-tight uppercase">Summary</h2>
          <dl className="mt-4 flex flex-col gap-2.5 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-ink-2">Subtotal · {buyable.reduce((n, r) => n + r.quantity, 0)} {buyable.length === 1 && buyable[0].quantity === 1 ? "piece" : "pieces"}</dt>
              <dd className="font-semibold tabular-nums">{money(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-2">Shipping from {first}</dt>
              <dd className="font-semibold tabular-nums">{money(shipping)}</dd>
            </div>
            {buyable.length > 1 && <p className="-mt-1 text-[13px] text-muted">One shipment, so you only pay shipping once.</p>}
            <div className="mt-2 flex justify-between border-t border-line pt-3 text-lg">
              <dt className="font-bold">Total</dt>
              <dd className="font-display text-2xl font-extrabold tabular-nums">{money(total)}</dd>
            </div>
          </dl>
          {buyable.length ? (
            <Link
              href="/checkout"
              className="mt-5 flex h-[58px] items-center justify-between bg-accent px-5 font-display text-xl font-extrabold text-white uppercase hover:bg-accent-hover"
            >
              Checkout <span className="flex items-center gap-2">{money(total)} <Icon name="arrow" /></span>
            </Link>
          ) : (
            <p className="mt-5 bg-tile px-4 py-3 text-center text-sm text-muted">Nothing in your cart can be bought right now.</p>
          )}
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[13px] text-muted">
            <Icon name="lock" className="size-3.5" /> Secure checkout by Stripe · No account needed
          </p>
        </div>
        <div className="grid grid-cols-[26px_1fr] gap-3 border border-line bg-soft px-4 py-3.5">
          <Icon name="shield" className="size-6" />
          <p className="text-[13.5px] leading-relaxed text-ink-2">
            <b className="block text-[15px] text-ink">Protected purchase</b>
            {first} has {days(SHIP_DEADLINE_DAYS)} to ship, or you&apos;re refunded automatically.
          </p>
        </div>
      </aside>
    </div>
  );
}

function CartLine({ row, handle, onQty, onRemove }: { row: CartRow; handle: string; onQty: (q: number) => void; onRemove: () => void }) {
  const { product: p, quantity, state } = row;
  const blocked = state !== "ok";
  return (
    <li className="grid grid-cols-[88px_1fr] gap-4 border-b border-line py-4 md:grid-cols-[112px_1fr]">
      <Link href={`/${handle}/${p.slug}`} className="relative aspect-[4/5] overflow-hidden bg-tile">
        <Image src={p.images[0]} alt={p.title} fill sizes="120px" className={`object-cover ${blocked ? "opacity-40 grayscale" : ""}`} />
      </Link>
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/${handle}/${p.slug}`} className={`text-[15px] leading-snug font-semibold ${blocked ? "text-muted" : ""}`}>
            {p.title}
          </Link>
          <span className={`font-display text-lg font-extrabold tabular-nums ${blocked ? "text-muted line-through" : ""}`}>
            {money(p.priceCents * quantity)}
          </span>
        </div>
        {state === "sold" && <p className="font-hand text-[22px] leading-none font-semibold text-accent">just sold! a fan got this one first</p>}
        {state === "on_hold" && (
          <p className="text-[13px] leading-snug text-ink-2">
            <b>On hold.</b> Someone is checking out with this right now. If they don&apos;t finish, it&apos;s back within {RESERVATION_MINUTES} minutes.
          </p>
        )}
        {state === "ok" && p.quantity > 1 && (
          <div className="mt-1 flex items-center gap-3">
            <div className="inline-flex items-center border-[1.5px] border-ink" role="group" aria-label="Quantity">
              <button type="button" className="grid size-9 place-items-center disabled:opacity-30" disabled={quantity <= 1} onClick={() => onQty(quantity - 1)} aria-label="One fewer">
                <Icon name="minus" className="size-4" />
              </button>
              <span className="w-8 text-center text-sm font-semibold tabular-nums">{quantity}</span>
              <button type="button" className="grid size-9 place-items-center disabled:opacity-30" disabled={quantity >= p.quantity} onClick={() => onQty(quantity + 1)} aria-label="One more">
                <Icon name="plus" className="size-4" />
              </button>
            </div>
            <span className="text-[13px] text-muted">{p.quantity} available</span>
          </div>
        )}
        {state === "ok" && p.quantity <= 1 && <p className="text-[13px] text-muted">One of one</p>}
        <button type="button" onClick={onRemove} className="mt-auto inline-flex min-h-9 items-center self-start text-[13px] text-muted underline underline-offset-4 hover:text-ink">
          Remove
        </button>
      </div>
    </li>
  );
}
