"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

/** Shown when a fan adds an item from a different creator: one creator per cart. */
export function CartConflictDialog({
  open,
  currentHandle,
  newHandle,
  onStartNew,
  onClose,
}: {
  open: boolean;
  currentHandle: string;
  newHandle: string;
  onStartNew: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(92vw,440px)] bg-paper p-0 text-ink backdrop:bg-black/50"
      aria-labelledby="conflict-h"
    >
      <div className="flex flex-col gap-3 p-6">
        <h2 id="conflict-h" className="font-display text-2xl leading-none font-extrabold tracking-tight uppercase">
          Your cart is from @{currentHandle}
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-2">
          Each creator packs and ships their own orders, so a cart can only hold pieces from one creator. Check out your
          @{currentHandle} pieces first, or start a new cart with this one from @{newHandle}.
        </p>
        <div className="mt-2 flex flex-col gap-2">
          <Link href="/cart" className="grid h-12 place-items-center bg-ink text-sm font-semibold text-white hover:bg-ink-2">
            Go to my cart
          </Link>
          <button type="button" onClick={onStartNew} className="h-12 border-[1.5px] border-ink text-sm font-semibold hover:bg-soft">
            Start a new cart with this piece
          </button>
          <button type="button" onClick={onClose} className="h-11 text-sm text-muted underline underline-offset-4">
            Keep browsing
          </button>
        </div>
      </div>
    </dialog>
  );
}
