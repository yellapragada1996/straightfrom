"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useHydrated } from "@/lib/cart";
import { fmtDate } from "@/lib/creator-store";
import { fanActions, ordersFor, useFanState, type FanOrder } from "@/lib/fan-store";
import { money } from "@/lib/format";
import { EmailPasswordAuth } from "../auth/email-password";
import { GoogleButton, OrDivider } from "../google-button";
import { Icon } from "../icons";
import { RingAvatar } from "../ring-avatar";
import { Underline } from "../scribbles";
import { SHIP_DEADLINE_DAYS } from "@/config";

const DAY = 86_400_000;

export function FanAccount() {
  const hydrated = useHydrated();
  const s = useFanState();
  if (!hydrated) return <div className="h-[60vh]" aria-busy="true" />;
  return s.signedInEmail ? <OrdersList email={s.signedInEmail} /> : <FanSignIn />;
}

/**
 * Fan sign-in / sign-up: Google, or email + password (sign-up confirms the email with a 6-digit code).
 * Orders are matched on the verified email, so orders placed before the account existed show up too.
 */
export function FanSignIn({
  presetEmail = "",
  compact = false,
  defaultMode = "signin",
}: {
  presetEmail?: string;
  compact?: boolean;
  defaultMode?: "signin" | "signup";
}) {
  const [mode, setMode] = useState(defaultMode);
  const signup = mode === "signup";

  return (
    <div className={compact ? "" : "mx-auto max-w-md px-4 py-12 md:py-20"}>
      <EmailPasswordAuth
        key={mode}
        mode={mode}
        presetEmail={presetEmail}
        onDone={(email) => fanActions.signIn(email)}
        submitLabel={compact && signup ? "Save to my account" : undefined}
        prototypeNote={signup ? undefined : "Prototype: any password works. Try sam.fan@example.com to see orders placed before the account existed."}
        intro={
          !compact && (
            <>
              <div>
                <p className="inline-block -rotate-2 font-hand text-[26px] font-semibold text-accent">your pieces</p>
                <h1 className="font-display text-[44px] leading-[0.86] font-extrabold tracking-[-0.045em] uppercase">Your orders</h1>
                <p className="mt-3 text-[15px] text-ink-2">
                  {signup
                    ? "Use the email you checked out with. Every order you've placed with it shows up, even ones from before you had an account."
                    : "Sign in with the email you used at checkout."}
                </p>
              </div>
              <GoogleButton onSuccess={() => fanActions.signIn("sam.fan@example.com")} />
              <OrDivider />
            </>
          )
        }
        footer={
          <p className="text-sm">
            {signup ? "Already have an account? " : "New here? "}
            <button type="button" onClick={() => setMode(signup ? "signin" : "signup")} className="font-semibold underline underline-offset-4">
              {signup ? "Sign in" : "Create an account"}
            </button>
          </p>
        }
      />
    </div>
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
  const shipBy = new Date(new Date(o.placedAt).getTime() + SHIP_DEADLINE_DAYS * DAY).toISOString();
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
