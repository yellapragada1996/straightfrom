"use client";

/* eslint-disable @next/next/no-img-element -- item photos can be local data: URLs */

import { useState } from "react";
import {
  CARRIERS,
  creatorActions,
  daysLeft,
  fmtDate,
  payoutDue,
  payoutPending,
  shipBy,
  useCreatorState,
  type CarrierKey,
  type CreatorOrder,
  type OrderStatus,
} from "@/lib/creator-store";
import { feePercent } from "@/lib/fees";
import { money } from "@/lib/format";
import { Icon } from "../icons";
import { Btn, CopyButton, Field, inputCls, PageTitle, StatusPill, Tabs, useToast } from "./ui";

type Tab = "to_ship" | "shipped" | "paid_out" | "refunded";
const TAB_STATUS: Record<Tab, OrderStatus> = { to_ship: "paid", shipped: "shipped", paid_out: "paid_out", refunded: "refunded" };

export function OrdersView() {
  const s = useCreatorState();
  const count = (st: OrderStatus) => s.orders.filter((o) => o.status === st).length;
  const [tab, setTab] = useState<Tab>(count("paid") > 0 ? "to_ship" : "shipped");
  const list = s.orders
    .filter((o) => o.status === TAB_STATUS[tab])
    .sort((a, b) => (tab === "to_ship" ? shipBy(a) - shipBy(b) : b.paidAt.localeCompare(a.paidAt)));

  return (
    <>
      <PageTitle title="Orders" />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "to_ship", label: "To ship", count: count("paid") },
          { value: "shipped", label: "Shipped", count: count("shipped") },
          { value: "paid_out", label: "Paid out", count: count("paid_out") },
          { value: "refunded", label: "Refunded", count: count("refunded") },
        ]}
      />
      {list.length === 0 ? (
        <div className="border border-dashed border-muted bg-white p-8">
          <p className="font-hand text-[28px] leading-none text-accent">
            {tab === "to_ship" ? "all caught up ✓" : tab === "shipped" ? "nothing in transit" : tab === "paid_out" ? "no payouts yet" : "no refunds, nice"}
          </p>
          <p className="mt-2 max-w-md text-sm text-muted">
            {tab === "to_ship"
              ? "New orders show up here with the fan's address. You'll also get an email for every sale."
              : tab === "paid_out"
                ? `Orders move here once the money is sent to your bank, 7 days after you add tracking.`
                : "Nothing here right now."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {list.map((o) => (
            <OrderCard key={o.id} order={o} bankConnected={s.bank.connected} />
          ))}
        </ul>
      )}
    </>
  );
}

function OrderCard({ order: o, bankConnected }: { order: CreatorOrder; bankConnected: boolean }) {
  const toast = useToast();
  const [carrier, setCarrier] = useState<CarrierKey | "">("");
  const [tracking, setTracking] = useState("");
  const [tried, setTried] = useState(false);
  const left = daysLeft(shipBy(o));
  const address = [o.fan.name, o.fan.line1, o.fan.line2, `${o.fan.city}, ${o.fan.region} ${o.fan.postal}`, o.fan.country].filter(Boolean).join("\n");
  const carrierInfo = CARRIERS.find((c) => c.key === o.carrier);
  const trackUrl = carrierInfo?.track && o.tracking ? carrierInfo.track(o.tracking) : null;

  function ship(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!carrier || tracking.trim().length < 4) return;
    creatorActions.markShipped(o.id, carrier, tracking.trim());
    toast(`Marked as shipped. ${o.fan.name.split(" ")[0]} has been emailed the tracking link.`);
  }

  return (
    <li id={o.id} className="scroll-mt-24 border border-line bg-white">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 md:px-5">
        <div className="flex items-center gap-2 text-sm">
          <b className="font-semibold">{o.id}</b>
          <span className="text-muted">· ordered {fmtDate(o.paidAt)}</span>
        </div>
        {o.status === "paid" && (
          <StatusPill tone={left <= 2 ? "red" : "muted"}>
            Ship by {fmtDate(new Date(shipBy(o)).toISOString())} · {left === 0 ? "today" : `${left} day${left > 1 ? "s" : ""} left`}
          </StatusPill>
        )}
        {o.status === "shipped" && <StatusPill tone="ink">Shipped {fmtDate(o.shippedAt!)}</StatusPill>}
        {o.status === "paid_out" && <StatusPill tone="green">Paid out {fmtDate(o.paidOutAt!)}</StatusPill>}
        {o.status === "refunded" && <StatusPill tone="muted">Refunded {fmtDate(o.refundedAt!)}</StatusPill>}
      </div>

      <div className="grid gap-5 p-4 md:grid-cols-[minmax(0,1fr)_260px] md:p-5">
        <div className="flex flex-col gap-4">
          {/* Items */}
          <ul className="flex flex-col gap-3">
            {o.items.map((it) => (
              <li key={it.productId} className="flex items-center gap-3">
                <img src={it.image} alt="" className="aspect-[4/5] w-14 shrink-0 object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] leading-snug font-semibold">{it.title}</p>
                  <p className="text-[13px] text-muted">
                    {money(it.priceCents)}
                    {it.quantity > 1 && ` × ${it.quantity}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {/* Money */}
          <dl className="grid grid-cols-3 gap-px border border-line bg-line text-center">
            <div className="bg-soft p-2.5"><dt className="text-[11px] text-muted uppercase">Fan paid</dt><dd className="font-semibold tabular-nums">{money(o.itemCents + o.shippingCents)}</dd></div>
            <div className="bg-soft p-2.5"><dt className="text-[11px] text-muted uppercase">Fee ({feePercent})</dt><dd className="font-semibold tabular-nums">−{money(o.feeCents)}</dd></div>
            <div className="bg-soft p-2.5"><dt className="text-[11px] text-muted uppercase">You earn</dt><dd className="font-display font-extrabold tabular-nums">{money(o.payoutCents)}</dd></div>
          </dl>

          {/* Action area */}
          {o.status === "paid" && (
            <form onSubmit={ship} className="flex flex-col gap-3 border-t border-line pt-4">
              <p className="text-sm font-semibold">Shipped it? Add the tracking number</p>
              <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                <Field label="Carrier" htmlFor={`c-${o.id}`} error={tried && !carrier ? "Pick a carrier" : null}>
                  <select id={`c-${o.id}`} value={carrier} onChange={(e) => setCarrier(e.target.value as CarrierKey)} className={inputCls}>
                    <option value="">Choose…</option>
                    {CARRIERS.map((c) => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Tracking number" htmlFor={`t-${o.id}`} error={tried && tracking.trim().length < 4 ? "Enter the tracking number" : null}>
                  <input id={`t-${o.id}`} value={tracking} onChange={(e) => setTracking(e.target.value)} className={inputCls} autoCapitalize="characters" autoCorrect="off" spellCheck={false} placeholder="e.g. 9400 1112 0255 …" />
                </Field>
              </div>
              <Btn type="submit" variant="dark" icon="truck" className="self-start">Mark as shipped</Btn>
              <p className="text-[12.5px] text-muted">
                We email {o.fan.name.split(" ")[0]} a tracking link straight away. If this isn&apos;t shipped by{" "}
                {fmtDate(new Date(shipBy(o)).toISOString())}, the fan is refunded automatically.
              </p>
            </form>
          )}
          {(o.status === "shipped" || o.status === "paid_out") && (
            <div className="flex flex-col gap-1 border-t border-line pt-4 text-sm">
              <p>
                <span className="text-muted">Tracking:</span> <b>{carrierInfo?.label}</b> {o.tracking}{" "}
                {trackUrl && (
                  <a href={trackUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2">
                    Track <Icon name="external" className="size-3.5" />
                  </a>
                )}
              </p>
              {o.status === "shipped" && (
                <p className="text-muted">
                  {payoutPending(o)
                    ? `${money(o.payoutCents)} will be paid out on ${fmtDate(new Date(payoutDue(o)).toISOString())}${bankConnected ? "." : ", once your bank is connected."}`
                    : bankConnected
                      ? "Payout is being sent."
                      : `${money(o.payoutCents)} is ready. Connect your bank to get it.`}
                </p>
              )}
            </div>
          )}
          {o.status === "refunded" && (
            <p className="border-t border-line pt-4 text-sm text-muted">
              Not shipped within 7 days, so {o.fan.name.split(" ")[0]} was refunded in full. The piece was hidden from your page; publish it again from Pieces when you&apos;re ready.
            </p>
          )}
        </div>

        {/* Ship to */}
        {o.status !== "refunded" && (
          <div className="flex flex-col gap-2 self-start bg-soft p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold tracking-[0.08em] uppercase">Ship to</p>
              {o.status === "paid" && <CopyButton text={address} label="Copy" />}
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-line">{address}</p>
            <p className="text-[12px] leading-snug text-muted">Only use this address to ship this order.</p>
          </div>
        )}
      </div>
    </li>
  );
}
