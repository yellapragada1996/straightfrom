"use client";

/* eslint-disable @next/next/no-img-element -- item photos can be local data: URLs */

import Link from "next/link";
import { balances, creatorActions, daysLeft, fmtDate, shipBy, useCreatorState } from "@/lib/creator-store";
import { money } from "@/lib/format";
import { Icon } from "../icons";
import { usePublicPageHref } from "./dashboard-shell";
import { Btn, Card, CopyButton, PageTitle, StatusPill } from "./ui";

export function DashboardHome() {
  const s = useCreatorState();
  const pageHref = usePublicPageHref();
  if (!s.profile) return null;
  const p = s.profile;
  const first = p.displayName.split(" ")[0];
  const b = balances(s);
  const live = s.products.filter((x) => x.status === "available" || x.status === "reserved").length;
  const toShip = [...b.toShip].sort((a, z) => shipBy(a) - shipBy(z));
  const url = `straightfrom.co/${p.handle}`;

  return (
    <>
      <PageTitle kicker={`hey ${first.toLowerCase()}!`} title="Your dashboard" />

      <div className="flex flex-col gap-4">
        {/* Money waiting, bank not connected: the most important prompt */}
        {!s.bank.connected && b.pendingCents > 0 && (
          <section className="flex flex-col gap-3 border-[1.5px] border-accent bg-white p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-display text-[28px] leading-none font-extrabold tracking-tight">{money(b.pendingCents)} waiting for you</p>
              <p className="mt-1.5 text-sm text-ink-2">Connect your bank so we can pay you. It takes about 5 minutes with Stripe.</p>
            </div>
            <Btn href="/dashboard/earnings" size="lg" icon="bank">Connect your bank</Btn>
          </section>
        )}
        {!s.bank.connected && b.pendingCents === 0 && !s.bankCardDismissed && (
          <section className="relative flex flex-col gap-2 border border-line bg-white p-5 pr-12">
            <p className="font-semibold">Get paid: connect your bank whenever you&apos;re ready</p>
            <p className="text-sm text-muted">No rush. Most creators do it after their first sale. Money waits safely until you do.</p>
            <Link href="/dashboard/earnings" className="self-start text-sm font-semibold underline underline-offset-4">Set it up</Link>
            <button type="button" onClick={creatorActions.dismissBankCard} aria-label="Dismiss" className="absolute top-3 right-3 grid size-9 place-items-center text-muted hover:text-ink">
              <Icon name="close" className="size-4" />
            </button>
          </section>
        )}

        {/* Your link */}
        <Card className="flex flex-col gap-3">
          <p className="text-xs font-bold tracking-[0.08em] text-muted uppercase">Your page</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-full min-w-0 truncate font-display text-xl font-extrabold tracking-tight sm:w-auto sm:flex-1 md:text-2xl">{url}</span>
            <CopyButton text={`https://${url}`} label="Copy link" />
            {pageHref && <Btn href={pageHref} variant="ghost" size="sm" icon="eye">View</Btn>}
          </div>
          <p className="text-[13px] text-muted">Put it in your Instagram and TikTok bio. Mention it in videos when you list something new.</p>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4">
          {[
            { label: "To ship", value: String(b.toShip.length), href: "/dashboard/orders", hot: b.toShip.length > 0 },
            { label: "Waiting for you", value: money(b.pendingCents), href: "/dashboard/earnings" },
            { label: "Paid out", value: money(b.paidOutCents), href: "/dashboard/earnings" },
            { label: "Live items", value: String(live), href: "/dashboard/items" },
          ].map((x) => (
            <Link key={x.label} href={x.href} className="flex flex-col gap-1 bg-white p-4 hover:bg-soft">
              <span className="text-[13px] text-muted">{x.label}</span>
              <span className={`font-display text-[28px] leading-none font-extrabold tracking-tight ${x.hot ? "text-accent" : ""}`}>{x.value}</span>
            </Link>
          ))}
        </div>

        {/* Ship these */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-extrabold uppercase">Ship these</h2>
            <Link href="/dashboard/orders" className="text-sm font-semibold underline underline-offset-4">All orders</Link>
          </div>
          {toShip.length ? (
            <ul className="divide-y divide-line">
              {toShip.map((o) => {
                const left = daysLeft(shipBy(o));
                return (
                  <li key={o.id} className="relative flex items-center gap-3 py-3">
                    <img src={o.items[0].image} alt="" className="aspect-[4/5] w-12 shrink-0 object-cover" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/dashboard/orders#${o.id}`} className="line-clamp-2 text-sm leading-snug font-semibold after:absolute after:inset-0 sm:after:hidden">
                        {o.items[0].title}
                      </Link>
                      <p className="truncate text-[13px] text-muted">
                        to {o.fan.name} · ship by {fmtDate(new Date(shipBy(o)).toISOString())}
                      </p>
                    </div>
                    <StatusPill tone={left <= 2 ? "red" : "muted"}>{left === 0 ? "Today" : `${left} day${left > 1 ? "s" : ""} left`}</StatusPill>
                    <span className="hidden sm:block">
                      <Btn href={`/dashboard/orders#${o.id}`} variant="dark" size="sm">Add tracking</Btn>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-2 font-hand text-2xl text-muted">nothing to ship right now ✓</p>
          )}
          {toShip.length > 0 && (
            <p className="mt-2 text-[13px] text-muted">
              Orders not shipped within 7 days are refunded to the fan automatically.
            </p>
          )}
        </Card>

        {/* List something */}
        <Link href="/dashboard/items/new" className="group flex items-center justify-between gap-4 bg-ink p-5 text-white">
          <div>
            <p className="font-display text-2xl font-extrabold uppercase">List a new item</p>
            <p className="mt-1 text-sm text-[#bdbdbd]">Something from a video fans loved? Takes 2 minutes.</p>
          </div>
          <span className="grid size-12 shrink-0 place-items-center bg-accent transition-transform group-hover:rotate-90">
            <Icon name="plus" />
          </span>
        </Link>
      </div>
    </>
  );
}
