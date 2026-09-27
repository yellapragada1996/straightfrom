"use client";

import Link from "next/link";
import { useState } from "react";
import { adminActions, orderTotal, payoutDueAt, payoutState, useAdmin, type AdminOrder } from "@/lib/admin-store";
import { fmtDate } from "@/lib/creator-store";
import { money } from "@/lib/format";
import { Icon } from "../icons";
import { Btn, PageTitle, StatusPill, useToast } from "../creator/ui";
import { ConfirmDialog, Empty, PayoutPill, SectionTitle, Stat, Table } from "./bits";

export function AdminMoney() {
  const s = useAdmin();
  const toast = useToast();
  const [confirmPause, setConfirmPause] = useState(false);
  const name = (id: string) => s.creators.find((c) => c.id === id)?.displayName ?? id;
  const sum = (os: AdminOrder[], f: (o: AdminOrder) => number) => os.reduce((n, o) => n + f(o), 0);

  const kept = s.orders.filter((o) => o.status !== "refunded");
  const owed = kept.filter((o) => o.status !== "paid_out");
  const paidOut = s.orders.filter((o) => o.status === "paid_out");
  const refunded = s.orders.filter((o) => o.status === "refunded");
  const held = s.orders.filter((o) => payoutState(o, s) === "no_bank");
  const heldBy = [...new Set(held.map((o) => o.creatorId))].map((id) => ({ id, orders: held.filter((o) => o.creatorId === id) }));
  const upcoming = s.orders
    .filter((o) => o.status === "shipped")
    .sort((a, b) => payoutDueAt(a) - payoutDueAt(b));
  const problems = s.orders.filter((o) => o.status === "refunded" || o.dispute).sort((a, b) => (b.refundedAt ?? b.dispute?.openedAt ?? "").localeCompare(a.refundedAt ?? a.dispute?.openedAt ?? ""));

  return (
    <>
      <PageTitle title="Money" />

      <div className={`mb-8 flex flex-wrap items-center gap-4 border-[1.5px] p-4 md:p-5 ${s.payoutsPaused ? "border-accent bg-[#fff0ee]" : "border-line bg-white"}`}>
        <Icon name="pause" className={`size-6 ${s.payoutsPaused ? "text-accent" : "text-muted"}`} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{s.payoutsPaused ? "All payouts are paused" : "Payouts are running"}</p>
          <p className="text-[13px] text-muted">
            {s.payoutsPaused
              ? "Nothing goes out to creators until you resume. Orders and refunds still work."
              : "Payouts go out every day, 7 days after an order ships. Pause them if something looks wrong."}
          </p>
        </div>
        {s.payoutsPaused ? (
          <Btn variant="dark" onClick={() => { adminActions.setPayoutsPaused(false); toast("Payouts resumed"); }}>Resume payouts</Btn>
        ) : (
          <Btn variant="outline" onClick={() => setConfirmPause(true)}>Pause all payouts</Btn>
        )}
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Sales" value={money(sum(kept, orderTotal))} sub={`${kept.length} orders`} />
        <Stat label="Our revenue" value={money(sum(kept, (o) => o.feeCents))} sub="From fees" />
        <Stat label="Owed to creators" value={money(sum(owed, (o) => o.payoutCents))} sub="Not paid out yet" />
        <Stat label="Paid out" value={money(sum(paidOut, (o) => o.payoutCents))} sub={`${paidOut.length} payouts`} />
        <Stat label="Refunded" value={money(sum(refunded, orderTotal))} sub={`${refunded.length} orders`} />
      </div>

      <section className="mb-8">
        <SectionTitle>Held: no bank connected</SectionTitle>
        {heldBy.length === 0 ? (
          <Empty>Nothing held. Every creator who&apos;s owed money has a bank connected.</Empty>
        ) : (
          <ul className="border border-line bg-white">
            {heldBy.map(({ id, orders }) => (
              <li key={id} className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3 first:border-t-0">
                <span className="min-w-0 flex-1">
                  <Link href={`/admin/creators/${id}`} className="block font-semibold hover:underline">{name(id)}</Link>
                  <span className="block text-[13px] text-muted">{orders.length} order{orders.length > 1 ? "s" : ""} ready to pay · {orders.map((o) => o.id).join(", ")}</span>
                </span>
                <span className="font-display text-xl font-extrabold tabular-nums">{money(sum(orders, (o) => o.payoutCents))}</span>
                <Btn size="sm" variant="outline" icon="mail" onClick={() => { adminActions.log(`Emailed ${name(id)} a reminder to connect their bank`); toast(`Reminder sent to ${name(id)}`); }}>
                  Send a reminder
                </Btn>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <SectionTitle>Upcoming payouts</SectionTitle>
        {upcoming.length === 0 ? (
          <Empty>No shipped orders waiting to be paid out.</Empty>
        ) : (
          <Table>
            <thead>
              <tr><th>Order</th><th>Creator</th><th>Due</th><th className="text-right">Amount</th><th>Status</th></tr>
            </thead>
            <tbody>
              {upcoming.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/admin/orders/${o.id}`} className="font-semibold underline underline-offset-2">{o.id}</Link></td>
                  <td>{name(o.creatorId)}</td>
                  <td className="text-muted">{fmtDate(new Date(payoutDueAt(o)).toISOString())}</td>
                  <td className="text-right font-semibold tabular-nums">{money(o.payoutCents)}</td>
                  <td><PayoutPill state={payoutState(o, s)} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <section>
        <SectionTitle>Refunds and chargebacks</SectionTitle>
        {problems.length === 0 ? (
          <Empty>None yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr><th>Order</th><th>Creator</th><th>What happened</th><th>Date</th><th className="text-right">Amount</th></tr>
            </thead>
            <tbody>
              {problems.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/admin/orders/${o.id}`} className="font-semibold underline underline-offset-2">{o.id}</Link></td>
                  <td>{name(o.creatorId)}</td>
                  <td>
                    {o.status === "refunded" ? (
                      <span className="flex flex-col items-start gap-1"><StatusPill tone="muted">Refund</StatusPill><span className="text-xs text-muted">{o.refundReason}</span></span>
                    ) : (
                      <span className="flex flex-col items-start gap-1"><StatusPill tone="red">Chargeback</StatusPill><span className="text-xs text-muted">{o.dispute?.reason}</span></span>
                    )}
                  </td>
                  <td className="text-muted">{fmtDate(o.refundedAt ?? o.dispute!.openedAt)}</td>
                  <td className="text-right tabular-nums">{money(orderTotal(o))}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <ConfirmDialog
        open={confirmPause}
        onClose={() => setConfirmPause(false)}
        title="Pause all payouts?"
        danger
        confirmLabel="Pause payouts"
        reasonLabel="Reason"
        body={<>No creator gets paid until you resume. Use this if something looks wrong, like a wave of chargebacks. Fans can still buy, and refunds still work.</>}
        onConfirm={(r) => { adminActions.setPayoutsPaused(true, r); toast("All payouts paused"); }}
      />
    </>
  );
}
