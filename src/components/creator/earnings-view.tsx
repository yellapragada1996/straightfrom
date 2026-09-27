"use client";

import { useEffect, useRef, useState } from "react";
import { balances, creatorActions, fmtDate, payoutDue, payoutPending, useCreatorState, type CreatorOrder } from "@/lib/creator-store";
import { feePercent, PAYOUT_DELAY_DAYS } from "@/lib/fees";
import { money } from "@/lib/format";
import { Icon } from "../icons";
import { Btn, Card, PageTitle, StatusPill, useToast } from "./ui";

export function EarningsView() {
  const s = useCreatorState();
  const toast = useToast();
  const [stripeOpen, setStripeOpen] = useState(false);
  const b = balances(s);
  const connected = s.bank.connected;

  const history = [...s.orders].filter((o) => o.status !== "refunded").sort((a, z) => z.paidAt.localeCompare(a.paidAt));

  return (
    <>
      <PageTitle title="Earnings" />

      <div className="flex flex-col gap-5">
        {/* Bank connection */}
        {connected ? (
          <Card className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-[#eaf6ec] text-[#1f7a3a]"><Icon name="check" /></span>
              <div>
                <p className="font-semibold">Payouts on · Bank account ending {s.bank.last4}</p>
                <p className="text-[13px] text-muted">Verified by Stripe. Payouts land in 2–3 business days.</p>
              </div>
            </div>
            <Btn variant="outline" size="sm" icon="external" onClick={() => toast("Opens your Stripe Express dashboard")}>Manage in Stripe</Btn>
          </Card>
        ) : (
          <section className="border-[1.5px] border-accent bg-white p-5 md:p-6">
            <p className="inline-block -rotate-2 font-hand text-[26px] leading-none font-semibold text-accent">
              {b.pendingCents > 0 ? `${money(b.pendingCents)} is waiting!` : "one quick step"}
            </p>
            <h2 className="mt-1 font-display text-[30px] leading-[0.92] font-extrabold tracking-[-0.03em] uppercase md:text-[40px]">Connect your bank to get paid</h2>
            <ul className="mt-4 flex flex-col gap-2 text-[15px] text-ink-2">
              <li className="flex gap-2.5"><Icon name="clock" className="mt-0.5 size-[18px]" /> Takes about 5 minutes</li>
              <li className="flex gap-2.5"><Icon name="lock" className="mt-0.5 size-[18px]" /> Handled by Stripe, who verify your identity. We never see your bank details.</li>
              <li className="flex gap-2.5"><Icon name="bank" className="mt-0.5 size-[18px]" /> Everything you&apos;ve earned so far is paid out as soon as you&apos;re connected</li>
            </ul>
            <Btn size="lg" className="mt-5" icon="bank" onClick={() => setStripeOpen(true)}>Connect with Stripe</Btn>
          </section>
        )}

        {/* Balances */}
        <div className="grid grid-cols-2 gap-px border border-line bg-line lg:grid-cols-4">
          <Balance label="Waiting to ship" value={b.toShipCents} note={`${b.toShip.length} order${b.toShip.length === 1 ? "" : "s"} to ship`} />
          <Balance label="On the way" value={b.onTheWayCents} note={`Paid ${PAYOUT_DELAY_DAYS} days after shipping`} />
          <Balance
            label={connected ? "Being paid out" : "Held for you"}
            value={b.readyCents}
            note={connected ? "Arriving soon" : "Ready: connect your bank"}
            hot={!connected && b.readyCents > 0}
          />
          <Balance label="Paid out" value={b.paidOutCents} note="All time" />
        </div>

        {/* How it works */}
        <Card>
          <h2 className="mb-4 font-display text-lg font-extrabold uppercase">How you get paid</h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {[
              { t: "A fan buys", d: "They pay upfront. You get an email with their address." },
              { t: "You ship & add tracking", d: "Within 7 days, or the fan is refunded automatically." },
              { t: `${PAYOUT_DELAY_DAYS} days later, you're paid`, d: "Straight to your bank via Stripe." },
            ].map((x, i) => (
              <li key={x.t} className="grid grid-cols-[34px_1fr] gap-3 text-sm leading-snug text-muted">
                <span className="grid size-[34px] place-items-center rounded-full bg-ink font-display font-extrabold text-white">{i + 1}</span>
                <div><b className="block text-[15px] font-semibold text-ink">{x.t}</b>{x.d}</div>
              </li>
            ))}
          </ol>
          <p className="mt-5 border-t border-line pt-4 text-[13px] leading-relaxed text-muted">
            <b className="text-ink">Our fee:</b> {feePercent} of the item price. You keep 100% of the shipping you charge. Card processing is included, with no
            other fees.
          </p>
        </Card>

        {/* History */}
        <Card className="p-0">
          <h2 className="px-5 pt-5 pb-3 font-display text-lg font-extrabold uppercase">Payouts by order</h2>
          {history.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted">Your first sale will show up here.</p>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {history.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3">
                  <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                    <p className="truncate text-sm font-semibold">{o.items[0].title}</p>
                    <p className="text-[12.5px] text-muted">{o.id} · sold {fmtDate(o.paidAt)}</p>
                  </div>
                  <PayoutStatus o={o} connected={connected} />
                  <span className="ml-auto text-right font-display font-extrabold tabular-nums sm:ml-0 sm:w-16">{money(o.payoutCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
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

function Balance({ label, value, note, hot }: { label: string; value: number; note: string; hot?: boolean }) {
  return (
    <div className="flex flex-col gap-1 bg-white p-4">
      <span className="text-[13px] text-muted">{label}</span>
      <span className={`font-display text-[26px] leading-none font-extrabold tracking-tight md:text-[30px] ${hot ? "text-accent" : ""}`}>{money(value)}</span>
      <span className={`text-[12px] ${hot ? "font-semibold text-accent" : "text-muted"}`}>{note}</span>
    </div>
  );
}

function PayoutStatus({ o, connected }: { o: CreatorOrder; connected: boolean }) {
  if (o.status === "paid") return <StatusPill tone="red">Ship it first</StatusPill>;
  if (o.status === "paid_out") return <StatusPill tone="green">Paid {fmtDate(o.paidOutAt!)}</StatusPill>;
  if (payoutPending(o)) return <StatusPill tone="muted">{fmtDate(new Date(payoutDue(o)).toISOString())}</StatusPill>;
  return connected ? <StatusPill tone="ink">Sending</StatusPill> : <StatusPill tone="red">Needs bank</StatusPill>;
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
