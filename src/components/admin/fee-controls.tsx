"use client";

import { useState } from "react";
import { adminActions } from "@/lib/admin-store";
import { fmtFee } from "@/lib/fees";
import { parseFeePercent, platformActions, usePlatform } from "@/lib/platform-store";
import { Btn, Field, inputCls, StatusPill, useToast } from "../creator/ui";

/** Percent input with a trailing "%" that hands back basis points. */
function PercentInput({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative w-32">
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" className={`${inputCls} pr-8 text-right tabular-nums`} size={1} />
      <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted">%</span>
    </div>
  );
}

export function PlatformFeeEditor() {
  const p = usePlatform();
  const toast = useToast();
  const [v, setV] = useState(String(p.defaultFeeBps / 100));
  const bps = parseFeePercent(v);
  const changed = bps !== null && bps !== p.defaultFeeBps;
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (bps === null || !changed) return;
        platformActions.setDefaultFee(bps);
        adminActions.log(`Set the platform fee to ${fmtFee(bps)} (was ${fmtFee(p.defaultFeeBps)})`);
        toast(`Platform fee is now ${fmtFee(bps)} for new orders`);
      }}
    >
      <Field label="Platform fee" htmlFor="platform-fee" error={bps === null ? "Enter a number from 0 to 100" : null} hint="Taken from the item price. Shipping always goes to the creator.">
        <div className="flex flex-wrap items-center gap-3">
          <PercentInput id="platform-fee" value={v} onChange={setV} />
          <Btn type="submit" variant="dark" disabled={!changed}>Save</Btn>
        </div>
      </Field>
    </form>
  );
}

/** A creator's own rate, or back to the platform rate. */
export function CreatorFeeEditor({ creatorId, name, onDone }: { creatorId: string; name: string; onDone?: () => void }) {
  const p = usePlatform();
  const toast = useToast();
  const current = p.creatorFees[creatorId];
  const [v, setV] = useState(current ? String(current.feeBps / 100) : "");
  const [note, setNote] = useState(current?.note ?? "");
  const bps = parseFeePercent(v);
  const tried = v.trim() !== "";

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (bps === null) return;
        platformActions.setCreatorFee(creatorId, bps, note.trim());
        adminActions.log(`Set ${name}'s fee to ${fmtFee(bps)}${note.trim() ? ` (${note.trim()})` : ""}`);
        toast(`${name} now pays ${fmtFee(bps)} on new orders`);
        onDone?.();
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Their fee" htmlFor={`fee-${creatorId}`} error={tried && bps === null ? "0 to 100" : null}>
          <PercentInput id={`fee-${creatorId}`} value={v} onChange={setV} />
        </Field>
        <div className="min-w-[180px] flex-1">
          <Field label="Why" htmlFor={`fee-note-${creatorId}`} optional>
            <input id={`fee-note-${creatorId}`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Launch partner" className={inputCls} size={1} />
          </Field>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Btn type="submit" size="sm" variant="dark" disabled={bps === null}>Save</Btn>
        {current && (
          <Btn
            size="sm"
            variant="outline"
            onClick={() => {
              platformActions.clearCreatorFee(creatorId);
              adminActions.log(`Moved ${name} back to the platform fee (${fmtFee(p.defaultFeeBps)})`);
              toast(`${name} is back on the platform fee`);
              onDone?.();
            }}
          >
            Use platform fee ({fmtFee(p.defaultFeeBps)})
          </Btn>
        )}
        {onDone && <Btn size="sm" variant="ghost" onClick={onDone}>Cancel</Btn>}
      </div>
    </form>
  );
}

/** "4.9%" with a "custom" tag when the creator has their own rate. */
export function FeeBadge({ creatorId }: { creatorId: string }) {
  const p = usePlatform();
  const own = p.creatorFees[creatorId];
  return own ? (
    <span className="inline-flex items-center gap-1.5">
      <b className="tabular-nums">{fmtFee(own.feeBps)}</b> <StatusPill tone="red">Custom</StatusPill>
    </span>
  ) : (
    <span className="text-muted tabular-nums">{fmtFee(p.defaultFeeBps)}</span>
  );
}
