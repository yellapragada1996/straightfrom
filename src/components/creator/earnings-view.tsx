"use client";

/* eslint-disable @next/next/no-img-element -- item photos can be local data: URLs */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { balances, creatorActions, fmtDate, payoutDue, payoutPending, useCreatorState, type CreatorOrder } from "@/lib/creator-store";
import { feePercent } from "@/lib/fees";
import { money } from "@/lib/format";
import { Icon } from "../icons";
import { Btn, Card, PageTitle, StatusPill, useToast } from "./ui";

// Earnings answers three questions: how much have I made, when do I get it,
// and is there anything I need to do?

export function EarningsView() {
  const s = useCreatorState();
  const toast = useToast();
  const [stripeOpen, setStripeOpen] = useState(false);
  const b = balances(s);
  const connected = s.bank.connected;

  const earned = s.orders.filter((o) => o.status !== "refunded");
  const totalEarned = earned.reduce((n, o) => n + o.payoutCents, 0);
  const comingCents = b.toShipCents + b.onTheWayCents + b.readyCents;
  const nextPayout = [...b.onTheWay].sort((a, z) => payoutDue(a) - payoutDue(z))[0];
  const lastPayout = [...b.paidOut].sort((a, z) => (z.paidOutAt ?? "").localeCompare(a.paidOutAt ?? ""))[0];

  // One list, soonest money first: ready now, dated payouts, then after-you-ship, then paid.
  const rank = (o: CreatorOrder) =>
    o.status === "shipped" && !payoutPending(o) ? 0 : o.status === "shipped" ? 1 : o.status === "paid" ? 2 : 3;
  const rows = [...earned].sort((a, z) => rank(a) - rank(z) || payoutDue(a) - payoutDue(z) || z.paidAt.localeCompare(a.paidAt));

  return (
    <>
      <PageTitle title="Earnings" />

      <div className="flex flex-col gap-5">
        {/* Needs you: only when something does */}
        {!connected && b.readyCents > 0 && (
          <section className="flex flex-col gap-3 border-[1.5px] border-accent bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[15px]">
              <b className="font-display text-xl font-extrabold">{money(b.readyCents)} is ready for you.</b>
              <br />
              <span className="text-ink-2">Connect your bank to receive it. It takes about 5 minutes with Stripe.</span>
            </p>
            <Btn size="lg" icon="bank" className="shrink-0 whitespace-nowrap" onClick={() => setStripeOpen(true)}>Connect your bank</Btn>
          </section>
        )}
        {b.toShip.length > 0 && (
          <Link href="/dashboard/orders" className="flex items-center justify-between gap-3 border border-line bg-white px-5 py-4 text-[15px] hover:border-ink">
            <span>
              Ship {b.toShip.length} order{b.toShip.length > 1 ? "s" : ""} to get <b>{money(b.toShipCents)}</b> on its way to you.
            </span>
            <span className="flex items-center gap-1 font-semibold whitespace-nowrap">Orders <Icon name="arrow" className="size-4" /></span>
          </Link>
        )}

        {/* The big number + two balances */}
        <Card className="p-0">
          <div className="border-b border-line p-5 md:p-6">
            <p className="text-[13px] text-muted">Total earned</p>
            <p className="font-display text-[52px] leading-none font-extrabold tracking-[-0.04em] md:text-[64px]">{money(totalEarned)}</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-line">
            <div className="p-5 md:p-6">
              <p className="text-[13px] text-muted">Coming to you</p>
              <p className="font-display text-[30px] leading-none font-extrabold tracking-tight">{money(comingCents)}</p>
              <p className="mt-1.5 text-[12.5px] text-muted">
                {nextPayout ? <>Next: <b className="text-ink">{money(nextPayout.payoutCents)}</b> on {fmtDate(new Date(payoutDue(nextPayout)).toISOString())}</> : comingCents ? "Paid once you ship" : "Nothing pending"}
              </p>
            </div>
            <div className="p-5 md:p-6">
              <p className="text-[13px] text-muted">Paid out</p>
              <p className="font-display text-[30px] leading-none font-extrabold tracking-tight">{money(b.paidOutCents)}</p>
              <p className="mt-1.5 text-[12.5px] text-muted">{lastPayout?.paidOutAt ? `Last payout ${fmtDate(lastPayout.paidOutAt)}` : "No payouts yet"}</p>
            </div>
          </div>
        </Card>

        {/* Payouts by order */}
        <Card className="p-0">
          <h2 className="px-5 pt-5 pb-3 font-display text-lg font-extrabold uppercase">Payouts</h2>
          {rows.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted">Your first sale will show up here.</p>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {rows.map((o) => (
                <li key={o.id} className="flex items-center gap-3 px-5 py-3">
                  <img src={o.items[0].image} alt="" className="aspect-[4/5] w-10 shrink-0 object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{o.items[0].title}{o.items.length > 1 ? ` + ${o.items.length - 1} more` : ""}</p>
                    <PayoutWhen o={o} connected={connected} />
                  </div>
                  <span className="font-display font-extrabold tabular-nums">{money(o.payoutCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Bank status + the fee, stated once, quietly */}
        <div className="flex flex-col gap-2 text-[13px] text-muted">
          {connected ? (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex items-center gap-1.5"><Icon name="check" className="size-4 text-[#1f7a3a]" /> Paid to your bank account ending {s.bank.last4} via Stripe</span>
              <button type="button" onClick={() => toast("Opens your Stripe Express dashboard")} className="underline underline-offset-2 hover:text-ink">Manage</button>
            </p>
          ) : (
            b.readyCents === 0 && (
              <p>
                Payouts go to your bank through Stripe.{" "}
                <button type="button" onClick={() => setStripeOpen(true)} className="underline underline-offset-2 hover:text-ink">Connect your bank</button>
              </p>
            )
          )}
          <p>You&apos;re paid 7 days after you ship. StraightFrom keeps {feePercent} of the item price; the shipping you charge is all yours.</p>
        </div>
      </div>

      <StripeDialog
        open={stripeOpen}
        onClose={() => setStripeOpen(false)}
        onDone={() => {
          const held = b.readyCents;
          creatorActions.connectBank();
          setStripeOpen(false);
          toast(held > 0 ? `Connected! ${money(held)} is on its way to your bank.` : "Connected! You're all set to get paid.");
        }}
      />
    </>
  );
}

function PayoutWhen({ o, connected }: { o: CreatorOrder; connected: boolean }) {
  if (o.status === "paid") return <p className="text-[12.5px] text-muted">After you ship</p>;
  if (o.status === "paid_out") return <p className="text-[12.5px] text-[#1f7a3a]">Paid {fmtDate(o.paidOutAt!)}</p>;
  if (payoutPending(o)) return <p className="text-[12.5px] text-muted">{fmtDate(new Date(payoutDue(o)).toISOString())}</p>;
  return connected ? (
    <p className="text-[12.5px] text-muted">Sending now</p>
  ) : (
    <p className="text-[12.5px]"><StatusPill tone="red">Ready now · needs bank</StatusPill></p>
  );
}

/** Stand-in for Stripe's hosted Connect onboarding (Express). */
function StripeDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} className="m-auto w-[min(92vw,440px)] p-0 backdrop:bg-black/50" aria-labelledby="stripe-h">
      <div className="bg-[#635bff] px-6 py-4 text-white">
        <p className="text-sm font-semibold tracking-wide">stripe</p>
      </div>
      <div className="flex flex-col gap-3 p-6">
        <h2 id="stripe-h" className="text-xl font-semibold">Set up payouts for StraightFrom</h2>
        <p className="text-sm leading-relaxed text-ink-2">
          In the real app, Stripe&apos;s secure page opens here: your name, date of birth, address, the last digits of your ID number, and your bank
          account. It takes about 5 minutes, then you come straight back to StraightFrom.
        </p>
        <p className="border border-dashed border-muted p-3 text-xs text-muted">Prototype: nothing is entered or sent.</p>
        <div className="mt-2 flex flex-col gap-2">
          <button type="button" onClick={onDone} className="h-12 rounded-md bg-[#635bff] text-sm font-semibold text-white hover:bg-[#5249e8]">
            Finish setup (simulate)
          </button>
          <button type="button" onClick={onClose} className="h-11 text-sm text-muted underline underline-offset-4">
            Not now
          </button>
        </div>
      </div>
    </dialog>
  );
}
