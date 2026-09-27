"use client";

/* eslint-disable @next/next/no-img-element -- item photos can be local data: URLs */

import Link from "next/link";
import { useState } from "react";
import { creatorActions, useCreatorState } from "@/lib/creator-store";
import { money } from "@/lib/format";
import type { Product } from "@/lib/types";
import { Icon } from "../icons";
import { usePublicPageHref } from "./dashboard-shell";
import { Btn, PageTitle, StatusPill, Tabs, useToast } from "./ui";

type Tab = "live" | "drafts" | "sold";
const tabOf = (p: Product): Tab => (p.status === "sold_out" ? "sold" : p.status === "available" || p.status === "reserved" ? "live" : "drafts");

export function ItemsList() {
  const s = useCreatorState();
  const toast = useToast();
  const pageHref = usePublicPageHref();
  const [tab, setTab] = useState<Tab>("live");
  const counts = { live: 0, drafts: 0, sold: 0 };
  s.products.forEach((p) => counts[tabOf(p)]++);
  const list = s.products.filter((p) => tabOf(p) === tab);

  return (
    <>
      <PageTitle title="Your items" actions={<Btn href="/dashboard/items/new" icon="plus">New item</Btn>} />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "live", label: "Live", count: counts.live },
          { value: "drafts", label: "Drafts & hidden", count: counts.drafts },
          { value: "sold", label: "Sold", count: counts.sold },
        ]}
      />

      {list.length === 0 ? (
        <div className="flex flex-col items-start gap-3 border border-dashed border-muted bg-white p-8">
          <p className="font-hand text-[28px] leading-none text-accent">
            {tab === "live" ? "nothing live yet" : tab === "drafts" ? "no drafts" : "no sales yet… soon!"}
          </p>
          <p className="max-w-md text-sm text-muted">
            {tab === "live"
              ? "List something fans saw in your videos: the jacket, the mic, the thing on your desk. The story is what makes it special."
              : tab === "drafts"
                ? "Items you save without publishing, or take down, show up here."
                : "Sold items stay on your page with a SOLD mark. It shows fans your stuff really goes."}
          </p>
          {tab !== "sold" && <Btn href="/dashboard/items/new" icon="plus">List an item</Btn>}
        </div>
      ) : (
        <ul className="flex flex-col gap-px border border-line bg-line">
          {list.map((p) => {
            const tone = p.status === "available" ? "green" : p.status === "reserved" ? "red" : p.status === "sold_out" ? "ink" : "muted";
            const label = { available: "Live", reserved: "In checkout", sold_out: "Sold", draft: "Draft", hidden: "Hidden" }[p.status];
            return (
              <li key={p.id} className="flex items-center gap-3 bg-white p-3 md:gap-4 md:p-4">
                <Link href={`/dashboard/items/${p.id}`} className="shrink-0">
                  {p.images[0] ? (
                    <img src={p.images[0]} alt="" className={`aspect-[4/5] w-16 object-cover md:w-20 ${p.status === "sold_out" ? "grayscale" : ""}`} />
                  ) : (
                    <span className="grid aspect-[4/5] w-16 place-items-center bg-tile md:w-20"><Icon name="camera" className="text-muted" /></span>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/dashboard/items/${p.id}`} className="line-clamp-2 text-[15px] leading-snug font-semibold hover:underline">
                    {p.title || "Untitled item"}
                  </Link>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
                    <StatusPill tone={tone}>{label}</StatusPill>
                    <span className="font-semibold text-ink tabular-nums">{money(p.priceCents)}</span>
                    <span>+ {money(p.shippingCents)} shipping</span>
                    {p.quantity > 1 && p.status !== "sold_out" && <span>· {p.quantity} left</span>}
                  </p>
                  {p.status === "hidden" && (
                    <p className="mt-1 text-[12.5px] text-accent">Hidden after an order wasn&apos;t shipped in time. Publish it again when you&apos;re ready.</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5 md:flex-row md:items-center">
                  {p.status === "available" && pageHref && (
                    <span className="hidden md:block">
                      <Btn href={`${pageHref}/${p.slug}`} variant="ghost" size="sm" icon="eye">View</Btn>
                    </span>
                  )}
                  {p.status !== "sold_out" && <Btn href={`/dashboard/items/${p.id}`} variant="outline" size="sm">Edit</Btn>}
                  {p.status === "available" && (
                    <button
                      type="button"
                      onClick={() => {
                        creatorActions.setProductStatus(p.id, "draft");
                        toast("Unpublished. It's in Drafts now.");
                      }}
                      className="text-[12.5px] text-muted underline underline-offset-2 hover:text-ink"
                    >
                      Unpublish
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
