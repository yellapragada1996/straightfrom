"use client";

import Link from "next/link";
import {
  adminActions,
  creatorNextStep,
  isoDaysAgo,
  keptCents,
  needsAttention,
  orderTotal,
  reportTargetName,
  timeAgo,
  useAdmin,
  type Report,
} from "@/lib/admin-store";
import { money } from "@/lib/format";
import { Icon } from "../icons";
import { Btn, useToast } from "../creator/ui";
import { AdminTitle, CreatorAvatar, SectionTitle, Stat } from "./bits";

const signed = (cents: number) => (cents < 0 ? `−${money(-cents)}` : money(cents));

export function AdminOverview() {
  const s = useAdmin();
  const todo = needsAttention(s);
  const reports = s.reports.filter((r) => r.status === "open").sort((a, b) => b.at.localeCompare(a.at));
  const weekAgo = isoDaysAgo(7);

  const kept = s.orders.filter((o) => o.status !== "refunded");
  const sales = kept.reduce((n, o) => n + orderTotal(o), 0);
  const fees = kept.reduce((n, o) => n + o.feeCents, 0);
  const keep = keptCents(s.orders);
  const newCreators = s.creators.filter((c) => c.joinedAt > weekAgo).length;
  const ordersWeek = s.orders.filter((o) => o.paidAt > weekAgo).length;

  const rank = { list: 0, sell: 1, bank: 2 };
  const nudge = s.creators
    .filter((c) => c.status === "active")
    .map((c) => ({ c, next: creatorNextStep(s, c) }))
    .filter((x): x is { c: typeof x.c; next: NonNullable<typeof x.next> } => x.next !== null)
    .sort((a, b) => rank[a.next.step] - rank[b.next.step] || a.c.joinedAt.localeCompare(b.c.joinedAt));

  return (
    <>
      <AdminTitle title="Home" />

      <section className="mb-8">
        <SectionTitle>To do</SectionTitle>
        {todo.length + reports.length === 0 ? (
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
            {reports.map((r) => (
              <ReportRow key={r.id} report={r} />
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Creators" value={String(s.creators.length)} sub={`${newCreators} joined this week`} />
          <Stat label="Orders" value={String(s.orders.length)} sub={`${ordersWeek} this week`} />
          <Stat label="Sales" value={money(sales)} sub="Paid by fans, minus refunds" />
          <Stat label="We keep" value={signed(keep)} sub={`${money(fees)} in fees, minus Stripe's card fees (est.)`} tone={keep < 0 ? "red" : undefined} />
        </div>
      </section>

      <section>
        <SectionTitle aside={<Link href="/admin/creators" className="text-sm font-semibold underline underline-offset-4">All creators</Link>}>
          Creators to nudge
        </SectionTitle>
        <p className="-mt-1 mb-3 text-sm text-muted">Everyone who hasn&apos;t finished setting up, and their next step.</p>
        {nudge.length === 0 ? (
          <div className="border border-dashed border-muted bg-white p-5 text-sm text-muted">Every creator is live, has made a sale, and has a bank connected.</div>
        ) : (
          <ul className="border border-line bg-white">
            {nudge.map(({ c, next }) => (
              <li key={c.id} className="flex items-center gap-3 border-t border-line px-4 py-3 first:border-t-0">
                <CreatorAvatar c={c} />
                <Link href={`/admin/creators/${c.id}`} className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold hover:underline">{c.displayName}</span>
                  <span className="block text-[13px] text-muted">
                    {next.text} · joined {timeAgo(c.joinedAt)}
                  </span>
                </Link>
                <Btn size="sm" variant="outline" icon="mail" href={`mailto:${c.email}`}>Email</Btn>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href="/admin/activity" className="mt-8 inline-flex items-center gap-2 text-sm text-muted underline underline-offset-4 hover:text-ink md:hidden">
        <Icon name="list" className="size-4" /> Activity log
      </Link>
    </>
  );
}

/** A fan report, handled right in the to-do list. */
function ReportRow({ report: r }: { report: Report }) {
  const s = useAdmin();
  const toast = useToast();
  const item = r.target.kind === "item" ? s.items.find((p) => p.id === r.target.id) : undefined;
  const creatorId = r.target.kind === "creator" ? r.target.id : item?.creatorId;
  const isItem = r.target.kind === "item";

  return (
    <li className="flex gap-3 border-t border-line px-4 py-3 first:border-t-0">
      <span className="mt-2 size-2 shrink-0 rounded-full bg-ink" />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold">
          Report: {r.reason} <span className="font-normal text-muted">· {timeAgo(r.at)}</span>
        </p>
        <p className="text-[13px] text-muted">
          {isItem ? "Item " : "Page "}
          {creatorId ? (
            <Link href={`/admin/creators/${creatorId}`} className="underline underline-offset-2 hover:text-ink">{reportTargetName(s, r)}</Link>
          ) : (
            reportTargetName(s, r)
          )}
        </p>
        <p className="mt-1.5 border-l-2 border-line pl-3 text-sm text-ink-2">{r.message}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn
            size="sm"
            variant="dark"
            onClick={() => {
              adminActions.resolveReport(r.id, "hide");
              toast(isItem ? "Item hidden, report closed" : "Page hidden, report closed");
            }}
          >
            {isItem ? "Hide item" : "Hide page"}
          </Btn>
          <Btn
            size="sm"
            variant="outline"
            onClick={() => {
              adminActions.resolveReport(r.id, "no_action");
              toast("Report closed");
            }}
          >
            Nothing wrong, close
          </Btn>
          <Btn size="sm" variant="ghost" icon="mail" href={`mailto:${r.reporterEmail}`}>
            Reply
          </Btn>
        </div>
      </div>
    </li>
  );
}
