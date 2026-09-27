"use client";

/* eslint-disable @next/next/no-img-element -- photos may be data: URLs */

import { useState } from "react";
import { adminActions } from "@/lib/admin-store";
import { fmtDate } from "@/lib/creator-store";
import { money } from "@/lib/format";
import type { Product } from "@/lib/types";
import { Icon } from "../icons";
import { Btn, useToast } from "../creator/ui";
import { ConfirmDialog, StatusText, Thumb } from "./bits";

const STATUS: Record<Product["status"], string> = {
  available: "Live",
  draft: "Draft",
  hidden: "Hidden",
  sold_out: "Sold",
  reserved: "On hold",
};

/** One item in a creator's list; opens in place to hide it or remove photos. */
export function ItemRow({ item: p, creatorHandle, defaultOpen = false }: { item: Product; creatorHandle: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <li className="border-t border-line first:border-t-0">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-soft">
        <Thumb src={p.images[0]} className="w-9" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{p.title}</span>
          <span className="block text-xs text-muted">Listed {fmtDate(p.createdAt)}{p.quantity > 1 ? ` · ${p.quantity} left` : ""}</span>
        </span>
        <span className="tabular-nums">{money(p.priceCents)}</span>
        <span className="w-14 text-right"><StatusText text={STATUS[p.status]} /></span>
        <Icon name="chevronRight" className={`size-4 text-muted transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && <ItemControls item={p} creatorHandle={creatorHandle} />}
    </li>
  );
}

function ItemControls({ item: p, creatorHandle }: { item: Product; creatorHandle: string }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState<null | "hide" | { photo: number }>(null);
  const publicHref = p.images.length && p.status === "available" ? `/${creatorHandle}/${p.slug}` : null;

  return (
    <div className="flex flex-col gap-4 border-t border-line bg-soft px-3 py-4">
      {p.description && <p className="max-w-2xl font-serif text-[17px] leading-snug text-ink-2 italic">“{p.description}”</p>}

      {p.images.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {p.images.map((src, i) => (
            <div key={src + i} className="flex w-20 flex-col gap-1.5">
              <img src={src} alt="" className="aspect-[4/5] w-full object-cover" />
              <button type="button" onClick={() => setConfirm({ photo: i })} className="flex items-center justify-center gap-1 text-[12px] font-semibold text-muted hover:text-ink">
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
        ) : p.status !== "sold_out" && p.status !== "draft" ? (
          <Btn size="sm" variant="outline" icon="eye" onClick={() => setConfirm("hide")}>Hide</Btn>
        ) : null}
        {publicHref && <Btn size="sm" variant="ghost" href={publicHref} iconRight="external">View as a fan</Btn>}
      </div>

      <ConfirmDialog
        open={confirm === "hide"}
        onClose={() => setConfirm(null)}
        title="Hide this item?"
        danger
        confirmLabel="Hide"
        body={<>Fans can&apos;t see or buy it. The creator sees it as hidden. You can unhide it anytime.</>}
        onConfirm={() => { adminActions.setItemStatus(p.id, "hidden"); toast("Item hidden"); }}
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
