"use client";

import Link from "next/link";
import { creatorStats, isoDaysAgo, needsAttention, orderTotal, payoutState, timeAgo, useAdmin } from "@/lib/admin-store";
import { money } from "@/lib/format";
import { Icon } from "../icons";
import { PageTitle } from "../creator/ui";
import { CreatorAvatar, OrderStatusPill, SectionTitle, Stat } from "./bits";

export function AdminOverview() {
  const s = useAdmin();
  const todo = needsAttention(s);
  const weekAgo = isoDaysAgo(7);

  const kept = s.orders.filter((o) => o.status !== "refunded");
  const sum = (os: typeof s.orders, f: (o: (typeof s.orders)[number]) => number) => os.reduce((n, o) => n + f(o), 0);
  const withLive = s.creators.filter((c) => creatorStats(s, c.id).liveItems > 0).length;
  const withSale = new Set(kept.map((o) => o.creatorId)).size;
  const newCreators = s.creators.filter((c) => c.joinedAt > weekAgo).length;
  const ordersWeek = s.orders.filter((o) => o.paidAt > weekAgo).length;
  const owed = kept.filter((o) => o.status !== "paid_out");
  const held = s.orders.filter((o) => payoutState(o, s) === "no_bank");

  const recentOrders = [...s.orders].sort((a, b) => b.paidAt.localeCompare(a.paidAt)).slice(0, 5);
  const newest = [...s.creators].sort((a, b) => b.joinedAt.localeCompare(a.joinedAt)).slice(0, 5);

  return (
    <>
      <PageTitle title="Overview" />

      <section className="mb-8">
        <SectionTitle aside={<span className="text-sm text-muted">{todo.length ? `${todo.length} to look at` : ""}</span>}>Needs attention</SectionTitle>
        {todo.length === 0 ? (
          <div className="border border-dashed border-muted bg-white p-5">
            <p className="font-hand text-[26px] leading-none text-accent">all clear ✓</p>
          </div>
        ) : (
          <ul className="flex flex-col border border-line bg-white">
            {todo.map((t) => (
              <li key={t.key} className="border-t border-line first:border-t-0">
                <Link href={t.href} className="flex items-center gap-3 px-4 py-3 hover:bg-soft">
                  <span className={`size-2 shrink-0 rounded-full ${t.tone === "red" ? "bg-accent" : "bg-ink"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">{t.title}</span>
                    <span className="block text-[13px] text-muted">{t.detail}</span>
                  </span>
                  <Icon name="chevronRight" className="size-4 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <SectionTitle>Growth</SectionTitle>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Creators" value={String(s.creators.length)} sub={`${newCreators} joined this week`} />
          <Stat label="With a live item" value={String(withLive)} sub={`${s.creators.length - withLive} ${s.creators.length - withLive === 1 ? "hasn't" : "haven't"} listed yet`} />
          <Stat label="Made a sale" value={String(withSale)} sub={`of ${s.creators.length} creators`} />
          <Stat label="Orders" value={String(s.orders.length)} sub={`${ordersWeek} this week`} />
        </div>
      </section>

      <section className="mb-8">
        <SectionTitle aside={<Link href="/admin/money" className="text-sm font-semibold underline underline-offset-4">Money</Link>}>Money</SectionTitle>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Sales" value={money(sum(kept, orderTotal))} sub="Paid by fans, minus refunds" />
          <Stat label="Our revenue" value={money(sum(kept, (o) => o.feeCents))} sub="Fees on those sales" />
          <Stat label="Owed to creators" value={money(sum(owed, (o) => o.payoutCents))} sub={`${owed.length} orders not paid out yet`} />
          <Stat label="Held: no bank" value={money(sum(held, (o) => o.payoutCents))} sub="Ready, waiting on a bank" tone={held.length ? "red" : undefined} />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <SectionTitle aside={<Link href="/admin/orders" className="text-sm font-semibold underline underline-offset-4">All orders</Link>}>Latest orders</SectionTitle>
          <ul className="border border-line bg-white">
            {recentOrders.map((o) => (
              <li key={o.id} className="border-t border-line first:border-t-0">
                <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-soft">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{o.items[0].title}</span>
                    <span className="block text-muted">{o.id} · {timeAgo(o.paidAt)}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{money(orderTotal(o))}</span>
                  <OrderStatusPill status={o.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <SectionTitle aside={<Link href="/admin/creators" className="text-sm font-semibold underline underline-offset-4">All creators</Link>}>Newest creators</SectionTitle>
          <ul className="border border-line bg-white">
            {newest.map((c) => {
              const st = creatorStats(s, c.id);
              return (
                <li key={c.id} className="border-t border-line first:border-t-0">
                  <Link href={`/admin/creators/${c.id}`} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-soft">
                    <CreatorAvatar c={c} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{c.displayName}</span>
                      <span className="block text-muted">@{c.handle} · joined {timeAgo(c.joinedAt)}</span>
                    </span>
                    <span className="text-muted">{st.liveItems} live · {st.sales} sold</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
