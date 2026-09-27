"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useHydrated } from "@/lib/cart";
import { fmtDate } from "@/lib/creator-store";
import { fanActions, ordersFor, useFanState, type FanOrder } from "@/lib/fan-store";
import { money } from "@/lib/format";
import { Icon } from "../icons";
import { RingAvatar } from "../ring-avatar";
import { Underline } from "../scribbles";

const DAY = 86_400_000;

export function FanAccount() {
  const hydrated = useHydrated();
  const s = useFanState();
  if (!hydrated) return <div className="h-[60vh]" aria-busy="true" />;
  return s.signedInEmail ? <OrdersList email={s.signedInEmail} /> : <FanSignIn />;
}

/** Magic-link sign-in. Signing in the first time creates the account. */
export function FanSignIn({ presetEmail = "", compact = false }: { presetEmail?: string; compact?: boolean }) {
  const [email, setEmail] = useState(presetEmail);
  const [sent, setSent] = useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  if (sent) {
    return (
      <div className={`flex flex-col gap-3 ${compact ? "" : "mx-auto max-w-md px-4 py-16"}`}>
        <span className="grid size-11 place-items-center rounded-full bg-ink text-white"><Icon name="mail" /></span>
        <h2 className="font-display text-2xl font-extrabold uppercase">Check your email</h2>
        <p className="text-[15px] text-ink-2">
          We sent a sign-in link to <b className="text-ink">{email}</b>. Open it and every order you&apos;ve placed with this email will be waiting.
        </p>
        <div className="mt-1 flex flex-col gap-2 border border-dashed border-muted p-3">
          <p className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">Prototype: pretend you clicked the link</p>
          <Link
            href="/account"
            onClick={() => fanActions.signIn(email)}
            className="grid h-11 place-items-center bg-ink text-sm font-semibold text-white hover:bg-ink-2"
          >
            Open the sign-in link
          </Link>
        </div>
        <button type="button" onClick={() => setSent(false)} className="self-start text-sm underline underline-offset-4">Use a different email</button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) setSent(true);
      }}
      className={`flex flex-col gap-4 ${compact ? "" : "mx-auto max-w-md px-4 py-12 md:py-20"}`}
    >
      {!compact && (
        <div>
          <p className="inline-block -rotate-2 font-hand text-[26px] font-semibold text-accent">your pieces</p>
          <h1 className="font-display text-[44px] leading-[0.86] font-extrabold tracking-[-0.045em] uppercase">Your orders</h1>
          <p className="mt-3 text-[15px] text-ink-2">
            Sign in with the email you used at checkout. No password: we&apos;ll email you a link. First time? This creates your account, and all your past
            orders show up.
          </p>
        </div>
      )}
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold">Email</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-12 w-full border-[1.5px] border-line bg-white px-3.5 text-[16px] outline-none focus:border-ink"
        />
      </label>
      <button type="submit" disabled={!valid} className="flex h-[52px] items-center justify-center gap-2 bg-accent font-semibold text-white hover:bg-accent-hover disabled:opacity-45">
        Email me a sign-in link <Icon name="arrow" className="size-[18px]" />
      </button>
      {!compact && (
        <p className="text-[13px] text-muted">
          Tip: the demo checkout email is <b>sam.fan@example.com</b>. Sign in with it to see orders placed before the account existed.
        </p>
      )}
    </form>
  );
}

function OrdersList({ email }: { email: string }) {
  const s = useFanState();
  const orders = ordersFor(s, email);

  return (
    <div className="mx-auto max-w-[860px] px-4 pt-8 pb-16 md:px-10 md:pt-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="inline-block -rotate-2 font-hand text-[26px] font-semibold text-accent">it&apos;s all here</p>
          <h1 className="font-display text-[44px] leading-[0.86] font-extrabold tracking-[-0.045em] uppercase md:text-[64px]">
            Your{" "}
            <span className="relative inline-block">
              orders
              <Underline draw className="absolute -bottom-[0.1em] left-0 h-[0.16em] w-full [stroke-width:4]" />
            </span>
          </h1>
        </div>
        <div className="text-right text-[13px] text-muted">
          <p>{email}</p>
          <button type="button" onClick={fanActions.signOut} className="underline underline-offset-4 hover:text-ink">Sign out</button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="mt-8 border border-dashed border-muted p-8">
          <p className="font-hand text-[28px] leading-none text-accent">nothing yet</p>
          <p className="mt-2 text-sm text-muted">Orders placed with {email} will show up here, including ones from before you signed up.</p>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {orders.map((o) => (
            <OrderRow key={o.id} o={o} />
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderRow({ o }: { o: FanOrder }) {
  const first = o.creatorName.split(" ")[0];
  const shipBy = new Date(new Date(o.placedAt).getTime() + 7 * DAY).toISOString();
  const steps = ["Paid", "Shipped", "On its way"];
  const reached = o.status === "shipped" ? 2 : 0;

  return (
    <li className="border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <Link href={`/${o.creatorHandle}`} className="flex items-center gap-2">
          <RingAvatar src={o.creatorAvatar} size={30} />
          <span className="text-sm">
            <i className="font-serif text-[1.1em] text-accent">straight from </i>
            <b className="font-display font-extrabold">@{o.creatorHandle}</b>
          </span>
        </Link>
        <span className="text-[13px] text-muted">{o.id} · {fmtDate(o.placedAt)}</span>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <ul className="flex flex-col gap-3">
          {o.items.map((it) => (
            <li key={it.title} className="grid grid-cols-[52px_1fr_auto] items-center gap-3">
              <span className="relative aspect-[4/5] overflow-hidden bg-tile">
                <Image src={it.image} alt="" fill sizes="56px" className="object-cover" />
              </span>
              <span className="text-[15px] leading-snug font-semibold">
                {it.title}
                {it.quantity > 1 && <span className="font-normal text-muted"> × {it.quantity}</span>}
              </span>
              <span className="text-sm tabular-nums">{money(it.priceCents * it.quantity)}</span>
            </li>
          ))}
        </ul>

        {/* Progress */}
        {o.status !== "refunded" && (
          <ol className="grid grid-cols-3 gap-1.5" aria-label="Order progress">
            {steps.map((st, i) => (
              <li key={st} className="flex flex-col gap-1.5">
                <span className={`h-1.5 ${i <= reached ? "bg-accent" : "bg-tile"}`} />
                <span className={`text-[12px] font-semibold ${i <= reached ? "text-ink" : "text-muted"}`}>{st}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm">
          {o.status === "shipped" ? (
            <>
              <span className="text-ink-2">
                Shipped {o.shippedAt ? fmtDate(o.shippedAt) : ""} · <b>{o.carrier}</b> {o.tracking}
              </span>
              {o.trackingUrl && (
                <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 bg-ink px-4 font-semibold text-white hover:bg-ink-2">
                  Track package <Icon name="external" className="size-4" />
                </a>
              )}
            </>
          ) : o.status === "paid" ? (
            <span className="flex items-start gap-2 text-ink-2">
              <Icon name="shield" className="mt-0.5 size-[18px] text-accent" />
              {first} ships by {fmtDate(shipBy)}. If it doesn&apos;t ship by then, you&apos;re refunded automatically.
            </span>
          ) : (
            <span className="text-ink-2">Refunded in full.</span>
          )}
          <span className="ml-auto font-display text-lg font-extrabold tabular-nums">{money(o.totalCents)}</span>
        </div>
      </div>
    </li>
  );
}
