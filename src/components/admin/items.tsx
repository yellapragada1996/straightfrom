"use client";

/* eslint-disable @next/next/no-img-element -- photos may be data: URLs */

import Link from "next/link";
import { useState } from "react";
import { adminActions, useAdmin } from "@/lib/admin-store";
import { fmtDate } from "@/lib/creator-store";
import { money } from "@/lib/format";
import type { Product } from "@/lib/types";
import { Icon } from "../icons";
import { Btn, PageTitle, Tabs, useToast } from "../creator/ui";
import { ConfirmDialog, Empty, SearchBox, Thumb } from "./bits";
import { ItemStatusPill } from "./creators";

type Tab = "all" | "available" | "draft" | "hidden" | "sold_out";

export function AdminItems({ initialQuery = "" }: { initialQuery?: string }) {
  const s = useAdmin();
  const [q, setQ] = useState(initialQuery);
  const [tab, setTab] = useState<Tab>("all");
  const [open, setOpen] = useState<string | null>(null);
  const t = q.trim().toLowerCase();
  const creator = (id: string) => s.creators.find((c) => c.id === id);
  const list = s.items
    .filter((p) => (tab === "all" || p.status === tab) && (!t || [p.title, creator(p.creatorId)?.displayName, creator(p.creatorId)?.handle].some((v) => v?.toLowerCase().includes(t))))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const count = (st: Tab) => s.items.filter((p) => p.status === st).length;

  return (
    <>
      <PageTitle title="Items" />
      <SearchBox value={q} onChange={setQ} placeholder="Item title or creator" />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "all", label: "All", count: s.items.length },
          { value: "available", label: "Live", count: count("available") },
          { value: "draft", label: "Drafts", count: count("draft") },
          { value: "hidden", label: "Hidden", count: count("hidden") },
          { value: "sold_out", label: "Sold", count: count("sold_out") },
        ]}
      />
      {list.length === 0 ? (
        <Empty>No items match.</Empty>
      ) : (
        <ul className="border border-line bg-white">
          {list.map((p) => {
            const c = creator(p.creatorId);
            const expanded = open === p.id || list.length === 1;
            return (
              <li key={p.id} className="border-t border-line first:border-t-0">
                <button type="button" onClick={() => setOpen(expanded ? null : p.id)} aria-expanded={expanded} className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-soft">
                  <Thumb src={p.images[0]} className="w-10" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.title}</span>
                    <span className="block text-muted">{c?.displayName} · listed {fmtDate(p.createdAt)}{p.quantity > 1 ? ` · ${p.quantity} left` : ""}</span>
                  </span>
                  <span className="hidden tabular-nums sm:inline">{money(p.priceCents)}</span>
                  <ItemStatusPill status={p.status} />
                  <Icon name="chevronRight" className={`size-4 text-muted transition-transform ${expanded ? "rotate-90" : ""}`} />
                </button>
                {expanded && <ItemControls item={p} creatorHandle={c?.handle} />}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function ItemControls({ item: p, creatorHandle }: { item: Product; creatorHandle?: string }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState<null | "hide" | "draft" | { photo: number }>(null);
  const publicHref = creatorHandle && p.images.length && p.slug ? `/${creatorHandle}/${p.slug}` : null;

  return (
    <div className="flex flex-col gap-4 border-t border-line bg-soft px-3 py-4 md:px-4">
      {p.description && <p className="max-w-2xl font-serif text-[17px] leading-snug text-ink-2 italic">“{p.description}”</p>}

      {p.images.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {p.images.map((src, i) => (
            <div key={src + i} className="flex w-24 flex-col gap-1.5">
              <img src={src} alt="" className="aspect-[4/5] w-full object-cover" />
              <button type="button" onClick={() => setConfirm({ photo: i })} className="flex items-center justify-center gap-1 text-[12px] font-semibold text-muted hover:text-accent">
                <Icon name="trash" className="size-3.5" /> Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">No photos.</p>
      )}

      <div className="flex flex-wrap gap-2">
        {p.status === "hidden" ? (
          <Btn size="sm" variant="dark" onClick={() => { adminActions.setItemStatus(p.id, "available"); toast("Item is live again"); }}>Unhide</Btn>
        ) : p.status !== "sold_out" ? (
          <>
            <Btn size="sm" variant="primary" icon="eye" onClick={() => setConfirm("hide")}>Hide</Btn>
            {p.status !== "draft" && <Btn size="sm" variant="outline" onClick={() => setConfirm("draft")}>Back to drafts</Btn>}
          </>
        ) : null}
        {publicHref && p.status === "available" && <Btn size="sm" variant="ghost" href={publicHref} iconRight="external">View</Btn>}
        <Link href={`/admin/creators/${p.creatorId}`} className="inline-flex h-9 items-center px-3 text-[13px] font-semibold underline underline-offset-2">Creator</Link>
      </div>

      <ConfirmDialog
        open={confirm === "hide"}
        onClose={() => setConfirm(null)}
        title="Hide this item?"
        danger
        confirmLabel="Hide"
        body={<>Fans can&apos;t see or buy it. The creator sees it as hidden. You can unhide it later.</>}
        onConfirm={() => { adminActions.setItemStatus(p.id, "hidden"); toast("Item hidden"); }}
      />
      <ConfirmDialog
        open={confirm === "draft"}
        onClose={() => setConfirm(null)}
        title="Move back to drafts?"
        confirmLabel="Move to drafts"
        body={<>It comes off the page. The creator can fix it and publish again.</>}
        onConfirm={() => { adminActions.setItemStatus(p.id, "draft"); toast("Moved to drafts"); }}
      />
      <ConfirmDialog
        open={typeof confirm === "object" && confirm !== null}
        onClose={() => setConfirm(null)}
        title="Remove this photo?"
        danger
        confirmLabel="Remove photo"
        body={
          <>
            It&apos;s deleted from the item.
            {p.images.length === 1 && p.status === "available" && <> It&apos;s the only photo, so the item moves to drafts until the creator adds a new one.</>}
          </>
        }
        onConfirm={() => {
          if (typeof confirm === "object" && confirm) adminActions.removePhoto(p.id, confirm.photo);
          toast("Photo removed");
        }}
      />
    </div>
  );
}
