"use client";

/* eslint-disable @next/next/no-img-element -- item photos can be local data: URLs */

import { useState } from "react";
import {
  CARRIERS,
  creatorActions,
  daysLeft,
  fmtDate,
  shipBy,
  useCreatorState,
  type CarrierKey,
  type CreatorOrder,
} from "@/lib/creator-store";
import { trackingUrl } from "@/lib/carriers";
import { money } from "@/lib/format";
import { Icon } from "../icons";
import { Btn, CopyButton, Field, inputCls, PageTitle, StatusPill, Tabs, useToast } from "./ui";

// Orders is about shipping only: what to pack, where it goes, by when.
// Money lives on the Earnings page.

type Tab = "to_ship" | "shipped" | "all";
const isShipped = (o: CreatorOrder) => o.status === "shipped" || o.status === "paid_out";

export function OrdersView() {
  const s = useCreatorState();
  const toShip = s.orders.filter((o) => o.status === "paid");
  const shipped = s.orders.filter(isShipped);
  const [tab, setTab] = useState<Tab>(toShip.length ? "to_ship" : "shipped");

  const list =
    tab === "to_ship"
      ? [...toShip].sort((a, b) => shipBy(a) - shipBy(b))
      : (tab === "shipped" ? shipped : s.orders).slice().sort((a, b) => b.paidAt.localeCompare(a.paidAt));

  return (
    <>
      <PageTitle title="Orders" />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "to_ship", label: "To ship", count: toShip.length },
          { value: "shipped", label: "Shipped", count: shipped.length },
          { value: "all", label: "All" },
        ]}
      />
      {list.length === 0 ? (
        <div className="border border-dashed border-muted bg-white p-8">
          <p className="font-hand text-[28px] leading-none text-accent">{tab === "to_ship" ? "all caught up ✓" : "nothing here yet"}</p>
          <p className="mt-2 max-w-md text-sm text-muted">New orders show up here with where to send them. You&apos;ll also get an email for every sale.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {list.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </ul>
      )}
    </>
  );
}

function OrderCard({ order: o }: { order: CreatorOrder }) {
  const first = o.fan.name.split(" ")[0];
  const left = daysLeft(shipBy(o));
  const units = o.items.reduce((n, it) => n + it.quantity, 0);
  const address = [o.fan.name, o.fan.line1, o.fan.line2, `${o.fan.city}, ${o.fan.region} ${o.fan.postal}`, o.fan.country].filter(Boolean).join("\n");
  const shipped = isShipped(o);

  return (
    <li id={o.id} className="scroll-mt-24 border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 md:px-5">
        <span className="text-sm text-muted">
          <b className="font-semibold text-ink">{o.id}</b> · {fmtDate(o.paidAt)}
        </span>
        {o.status === "paid" && (
          <StatusPill tone={left <= 2 ? "red" : "muted"}>
            Ship by {fmtDate(new Date(shipBy(o)).toISOString())} · {left === 0 ? "today" : `${left} day${left > 1 ? "s" : ""} left`}
          </StatusPill>
        )}
        {shipped && <StatusPill tone="ink">Shipped {fmtDate(o.shippedAt!)}</StatusPill>}
        {o.status === "refunded" && <StatusPill tone="muted">Refunded</StatusPill>}
      </div>

      <div className="grid gap-5 p-4 md:grid-cols-[minmax(0,1fr)_260px] md:p-5">
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.08em] text-muted uppercase">
              {units > 1 ? `Pack · ${units} items, one package` : "Pack"}
            </p>
            <ul className="flex flex-col gap-3">
              {o.items.map((it) => (
                <li key={it.productId} className="flex items-center gap-3">
                  <img src={it.image} alt="" className="aspect-[4/5] w-14 shrink-0 object-cover" />
                  <p className="min-w-0 flex-1 text-[15px] leading-snug font-semibold">
                    {it.title}
                    {it.quantity > 1 && <span className="font-normal text-muted"> × {it.quantity}</span>}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[15px]">
            You earn <b className="font-display text-lg font-extrabold">{money(o.payoutCents)}</b>
          </p>

          {o.status === "paid" && <TrackingForm order={o} />}
          {shipped && <ShippedInfo order={o} />}
          {o.status === "refunded" && (
            <p className="border-t border-line pt-4 text-sm text-muted">
              This order wasn&apos;t shipped in time, so {first} was refunded. You can list the item again from Items.
            </p>
          )}
        </div>

        {o.status !== "refunded" && (
          <div className="flex flex-col gap-2 self-start bg-soft p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold tracking-[0.08em] uppercase">Ship to</p>
              {!shipped && <CopyButton text={address} label="Copy" />}
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-line">{address}</p>
          </div>
        )}
      </div>
    </li>
  );
}

function TrackingForm({ order: o, initial, onDone }: { order: CreatorOrder; initial?: { carrier: CarrierKey; tracking: string }; onDone?: () => void }) {
  const toast = useToast();
  const editing = !!initial;
  const [carrier, setCarrier] = useState<CarrierKey | "">(initial?.carrier ?? "");
  const [tracking, setTracking] = useState(initial?.tracking ?? "");
  const [tried, setTried] = useState(false);
  const first = o.fan.name.split(" ")[0];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!carrier || tracking.trim().length < 4) return;
    if (editing) {
      creatorActions.updateTracking(o.id, carrier, tracking.trim());
      toast(`Tracking updated. ${first} has the new link.`);
      onDone?.();
    } else {
      creatorActions.markShipped(o.id, carrier, tracking.trim());
      toast(`Marked as shipped. ${first} has been emailed the tracking link.`);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 border-t border-line pt-4">
      {!editing && <p className="text-sm font-semibold">Shipped it? Add the tracking number</p>}
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
      <div className="flex items-center gap-3">
        <Btn type="submit" variant="dark" icon={editing ? "check" : "truck"}>{editing ? "Save tracking" : "Mark as shipped"}</Btn>
        {editing && <Btn variant="ghost" onClick={onDone}>Cancel</Btn>}
      </div>
      {!editing && <p className="text-[12.5px] text-muted">We email {first} the tracking link straight away.</p>}
    </form>
  );
}

function ShippedInfo({ order: o }: { order: CreatorOrder }) {
  const [editing, setEditing] = useState(false);
  const c = CARRIERS.find((x) => x.key === o.carrier);
  const url = o.carrier && o.tracking ? trackingUrl(o.carrier, o.tracking) : null;
  const first = o.fan.name.split(" ")[0];

  if (editing && o.carrier && o.tracking) {
    return <TrackingForm order={o} initial={{ carrier: o.carrier, tracking: o.tracking }} onDone={() => setEditing(false)} />;
  }
  return (
    <div className="flex flex-col gap-1.5 border-t border-line pt-4 text-sm">
      <p>
        <b>{c?.label}</b> {o.tracking}
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 underline underline-offset-2">
            Track <Icon name="external" className="size-3.5" />
          </a>
        )}
      </p>
      <p className="flex flex-wrap items-center gap-x-3 text-muted">
        <span className="flex items-center gap-1"><Icon name="check" className="size-4 text-[#1f7a3a]" /> Tracking sent to {first}</span>
        <button type="button" onClick={() => setEditing(true)} className="underline underline-offset-2 hover:text-ink">Edit tracking</button>
      </p>
    </div>
  );
}
