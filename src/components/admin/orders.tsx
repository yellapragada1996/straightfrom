"use client";

import Link from "next/link";
import { useState } from "react";
import {
  adminActions,
  daysUntil,
  fmtDateTime,
  orderLabel,
  orderTotal,
  payoutDueAt,
  payoutState,
  shipByAt,
  useAdmin,
  type AdminOrder,
} from "@/lib/admin-store";
import { CARRIERS, trackingUrl, type CarrierKey } from "@/lib/carriers";
import { fmtDate } from "@/lib/creator-store";
import { fmtFee } from "@/lib/fees";
import { money } from "@/lib/format";
import { Icon } from "../icons";
import { Btn, Card, Field, inputCls, Tabs, useToast } from "../creator/ui";
import { AdminTitle, ConfirmDialog, Empty, SearchBox, StatusText, Table, Thumb } from "./bits";
import { days, PAYOUT_DELAY_DAYS, SHIP_EXTENSION_OPTIONS } from "@/config";

type Filter = "all" | "to_ship" | "shipped" | "paid_out" | "refunded";

export function AdminOrders() {
  const s = useAdmin();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const creator = (id: string) => s.creators.find((c) => c.id === id);

  const match = (o: AdminOrder) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    const c = creator(o.creatorId);
    return [o.id, o.fan.name, o.fan.email, c?.displayName, c?.handle, ...o.items.map((i) => i.title)].some((v) => v?.toLowerCase().includes(t));
  };
  const inFilter = (o: AdminOrder) => filter === "all" || (filter === "to_ship" ? o.status === "paid" : o.status === filter);
  const list = s.orders.filter((o) => inFilter(o) && match(o)).sort((a, b) => b.paidAt.localeCompare(a.paidAt));

  return (
    <>
      <AdminTitle title="Orders" />
      <SearchBox value={q} onChange={setQ} placeholder="Order number, fan name or email, creator, item" />
      <Tabs
        value={filter}
        onChange={setFilter}
        tabs={[
          { value: "all", label: "All" },
          { value: "to_ship", label: "To ship", count: s.orders.filter((o) => o.status === "paid").length },
          { value: "shipped", label: "Shipped" },
          { value: "paid_out", label: "Paid out" },
          { value: "refunded", label: "Refunded" },
        ]}
      />
      {list.length === 0 ? (
        <Empty>No orders match.</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Item</th>
              <th>Creator</th>
              <th>Fan</th>
              <th className="text-right">Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((o) => (
              <tr key={o.id} className="hover:bg-soft">
                <td>
                  <Link href={`/admin/orders/${o.id}`} className="font-semibold underline underline-offset-2">{o.id}</Link>
                  <span className="block text-xs text-muted">{fmtDate(o.paidAt)}</span>
                </td>
                <td className="max-w-[220px]">
                  <span className="flex items-center gap-2">
                    <Thumb src={o.items[0].image} className="w-8" />
                    <span className="line-clamp-2">{o.items[0].title}</span>
                  </span>
                </td>
                <td><Link href={`/admin/creators/${o.creatorId}`} className="hover:underline">{creator(o.creatorId)?.displayName}</Link></td>
                <td>{o.fan.name}<span className="block text-xs text-muted">{o.fan.email}</span></td>
                <td className="text-right font-semibold tabular-nums">{money(orderTotal(o))}</td>
                <td><StatusText {...orderLabel(o, s)} /></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}

const REFUND_REASONS = ["Creator can't ship it", "Fan cancelled before it shipped", "Not as described", "Didn't arrive", "Other"];

export function AdminOrderDetail({ id }: { id: string }) {
  const s = useAdmin();
  const toast = useToast();
  const [refundOpen, setRefundOpen] = useState(false);
  const o = s.orders.find((x) => x.id === id);
  if (!o) {
    return (
      <div className="flex flex-col items-start gap-3">
        <h1 className="font-display text-4xl font-extrabold uppercase">Order not found</h1>
        <Btn href="/admin/orders" variant="outline">Back to orders</Btn>
      </div>
    );
  }
  const c = s.creators.find((x) => x.id === o.creatorId);
  const ps = payoutState(o, s);
  const left = daysUntil(shipByAt(o));
  const address = [o.fan.name, o.fan.line1, o.fan.line2, `${o.fan.city}, ${o.fan.region} ${o.fan.postal}`, o.fan.country].filter(Boolean).join("\n");
  const carrier = CARRIERS.find((x) => x.key === o.carrier);
  const trackUrl = o.carrier && o.tracking ? trackingUrl(o.carrier, o.tracking) : null;

  return (
    <>
      <Link href="/admin/orders" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <Icon name="back" className="size-4" /> Orders
      </Link>
      <AdminTitle title={o.id} actions={<StatusText {...orderLabel(o, s)} />} />

      {o.dispute && o.status !== "refunded" && (
        <div className="mb-5 flex flex-wrap items-center gap-3 border-[1.5px] border-accent bg-[#fff0ee] p-4">
          <Icon name="alert" className="size-5 text-accent" />
          <p className="min-w-0 flex-1 text-sm">
            <b>Chargeback opened {fmtDate(o.dispute.openedAt)}.</b> {o.dispute.reason}. Send the tracking as evidence in Stripe.
          </p>
          <Btn size="sm" variant="dark" iconRight="external" onClick={() => toast("Opens this dispute in Stripe")}>Open in Stripe</Btn>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-5">
          <Card>
            <ul className="flex flex-col gap-3">
              {o.items.map((it) => (
                <li key={it.productId} className="flex items-center gap-3">
                  <Thumb src={it.image} className="w-14" />
                  <span className="min-w-0 flex-1 text-[15px] font-semibold">
                    {it.title}
                    {it.quantity > 1 && <span className="font-normal text-muted"> × {it.quantity}</span>}
                  </span>
                  <span className="tabular-nums">{money(it.priceCents * it.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 flex flex-col gap-1.5 border-t border-line pt-4 text-sm">
              <Row label="Items" value={money(o.itemCents)} />
              <Row label="Shipping" value={money(o.shippingCents)} />
              <Row label="Fan paid" value={money(orderTotal(o))} strong />
              <Row label={`Our fee (${fmtFee(o.feeBps)} of items)`} value={`−${money(o.feeCents)}`} />
              <Row label="Creator gets" value={money(o.payoutCents)} strong />
            </dl>
          </Card>

          <Card>
            <p className="mb-3 text-xs font-bold tracking-[0.08em] text-muted uppercase">Timeline</p>
            <ol className="flex flex-col">
              {o.events.map((e, i) => (
                <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                  <span className={`relative z-10 mt-1.5 size-2.5 shrink-0 rounded-full ${e.by === "admin" ? "bg-accent" : "bg-ink"}`} />
                  {i < o.events.length - 1 && <span className="absolute top-3 left-[4.5px] h-full w-px bg-line" />}
                  <div className="min-w-0">
                    <p className="text-sm">{e.text}</p>
                    <p className="text-xs text-muted">{fmtDateTime(e.at)} · {e.by === "admin" ? "you" : e.by}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <div className="grid gap-5 sm:grid-cols-2">
            <Card>
              <p className="mb-2 text-xs font-bold tracking-[0.08em] text-muted uppercase">Fan</p>
              <p className="text-sm leading-relaxed whitespace-pre-line">{address}</p>
              <a href={`mailto:${o.fan.email}`} className="mt-2 block text-sm underline underline-offset-2">{o.fan.email}</a>
            </Card>
            <Card>
              <p className="mb-2 text-xs font-bold tracking-[0.08em] text-muted uppercase">Creator</p>
              <Link href={`/admin/creators/${o.creatorId}`} className="text-sm font-semibold underline underline-offset-2">{c?.displayName}</Link>
              <p className="text-sm text-muted">@{c?.handle}</p>
              <a href={`mailto:${c?.email}`} className="mt-2 block text-sm underline underline-offset-2">{c?.email}</a>
            </Card>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-5">
          {o.status === "paid" && (
            <Card>
              <p className="text-xs font-bold tracking-[0.08em] text-muted uppercase">Ship by</p>
              <p className="mt-1 font-display text-2xl font-extrabold">
                {fmtDate(new Date(shipByAt(o)).toISOString())}{" "}
                <span className={`text-base ${left <= 2 ? "text-accent" : "text-muted"}`}>
                  {left <= 0 ? "· today" : `· ${left} day${left > 1 ? "s" : ""} left`}
                </span>
              </p>
              <p className="mt-1 text-[13px] text-muted">If it isn&apos;t shipped by then, the fan is refunded automatically.</p>
              <div className="flex flex-wrap gap-2">
                {SHIP_EXTENSION_OPTIONS.map((n) => (
                  <Btn key={n} size="sm" variant="outline" onClick={() => { adminActions.extendShipBy(o.id, n); toast(`${days(n)} more to ship. Let the creator know.`); }}>+{days(n)}</Btn>
                ))}
              </div>
            </Card>
          )}

          {o.status !== "refunded" && (
            <Card>
              <p className="mb-2 text-xs font-bold tracking-[0.08em] text-muted uppercase">Tracking</p>
              {o.tracking && (
                <p className="mb-3 text-sm">
                  <b>{carrier?.label}</b> {o.tracking}
                  {trackUrl && (
                    <a href={trackUrl} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 underline underline-offset-2">
                      Track <Icon name="external" className="size-3.5" />
                    </a>
                  )}
                </p>
              )}
              <TrackingEditor key={o.tracking ?? "none"} order={o} />
            </Card>
          )}

          <Card>
            <p className="mb-2 text-xs font-bold tracking-[0.08em] text-muted uppercase">Creator payout</p>
            <p className={`font-display text-2xl font-extrabold ${ps === "refunded" ? "text-muted line-through" : ""}`}>{money(o.payoutCents)}</p>
            <p className="mt-1 text-[13px] text-muted">
              {{
                after_ship: `Paid ${days(PAYOUT_DELAY_DAYS)} after it ships.`,
                waiting: `Due ${o.shippedAt ? fmtDate(new Date(payoutDueAt(o)).toISOString()) : ""}.`,
                paying: "Goes out with today's payouts.",
                no_bank: `Ready, but ${c?.displayName.split(" ")[0]} hasn't connected a bank yet.`,
                paid_out: `Sent ${o.paidOutAt ? fmtDate(o.paidOutAt) : ""}.`,
                refunded: "Nothing to pay. The order was refunded.",
              }[ps]}
            </p>
          </Card>

          <Card>
            <p className="mb-1 text-xs font-bold tracking-[0.08em] text-muted uppercase">Fan says they got no email?</p>
            <p className="mb-3 text-[13px] text-muted">Sends {o.fan.email} the {o.tracking ? "tracking email" : "order confirmation"} again.</p>
            <Btn size="sm" variant="outline" icon="mail" onClick={() => { adminActions.resendEmail(o.id); toast(`Sent to ${o.fan.email}`); }}>
              Resend {o.tracking ? "tracking email" : "order confirmation"}
            </Btn>
          </Card>

          {o.status !== "refunded" ? (
            <Card>
              <p className="mb-1 text-xs font-bold tracking-[0.08em] text-muted uppercase">Refund</p>
              <p className="mb-3 text-[13px] text-muted">Full refund of {money(orderTotal(o))} to the fan&apos;s card.</p>
              <Btn variant="outline" icon="refund" full onClick={() => setRefundOpen(true)}>Refund in full</Btn>
            </Card>
          ) : (
            <Card>
              <p className="text-xs font-bold tracking-[0.08em] text-muted uppercase">Refunded</p>
              <p className="mt-1 text-sm">{o.refundedAt && fmtDate(o.refundedAt)} · {o.refundReason}</p>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        title="Refund in full?"
        danger
        confirmLabel={`Refund ${money(orderTotal(o))}`}
        reasonLabel="Reason"
        reasonOptions={REFUND_REASONS}
        body={
          <>
            {o.fan.name} gets {money(orderTotal(o))} back on their card, and both they and {c?.displayName} get an email.
            {o.status === "paid_out" && <> {c?.displayName.split(" ")[0]} was already paid, so {money(o.payoutCents)} is taken back from their Stripe balance.</>}
            {" "}This can&apos;t be undone.
          </>
        }
        onConfirm={(reason) => {
          adminActions.refund(o.id, reason);
          toast("Refunded. Fan and creator emailed.");
        }}
      />
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "font-semibold" : ""}`}>
      <dt className={strong ? "" : "text-muted"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function TrackingEditor({ order: o }: { order: AdminOrder }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [carrier, setCarrier] = useState<CarrierKey | "">(o.carrier ?? "");
  const [tracking, setTracking] = useState(o.tracking ?? "");
  const valid = !!carrier && tracking.trim().length >= 4;

  if (!open) {
    return (
      <Btn size="sm" variant="outline" onClick={() => setOpen(true)}>
        {o.tracking ? "Fix tracking" : "Add tracking for the creator"}
      </Btn>
    );
  }
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid || !carrier) return;
        adminActions.setTracking(o.id, carrier, tracking.trim());
        toast("Tracking saved and emailed to the fan");
        setOpen(false);
      }}
    >
      <Field label="Carrier" htmlFor="adm-carrier">
        <select id="adm-carrier" value={carrier} onChange={(e) => setCarrier(e.target.value as CarrierKey)} className={inputCls}>
          <option value="">Choose…</option>
          {CARRIERS.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
      </Field>
      <Field label="Tracking number" htmlFor="adm-tracking">
        <input id="adm-tracking" value={tracking} onChange={(e) => setTracking(e.target.value)} className={inputCls} size={1} autoCapitalize="characters" spellCheck={false} />
      </Field>
      <div className="flex gap-2">
        <Btn type="submit" size="sm" variant="dark" disabled={!valid}>Save</Btn>
        <Btn size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
      </div>
    </form>
  );
}
