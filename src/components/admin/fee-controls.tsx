"use client";

import { useState } from "react";
import { adminActions, matchesCreator, useAdmin } from "@/lib/admin-store";
import { fmtFee } from "@/lib/fees";
import { isEmail, parseFeePercent, platformActions, usePlatform, type FeeOverride } from "@/lib/platform-store";
import { Btn, Field, inputCls, useToast } from "../creator/ui";
import { ConfirmDialog, CreatorAvatar } from "./bits";

/** Percent input with a trailing "%". */
function PercentInput({ id, value, onChange, autoFocus }: { id: string; value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <div className="relative w-28">
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" autoFocus={autoFocus} className={`${inputCls} pr-8 text-right tabular-nums`} size={1} />
      <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted">%</span>
    </div>
  );
}

export function PlatformFeeEditor() {
  const p = usePlatform();
  const s = useAdmin();
  const toast = useToast();
  const [v, setV] = useState(String(p.defaultFeeBps / 100));
  const [confirming, setConfirming] = useState(false);
  const [notify, setNotify] = useState(true);
  const bps = parseFeePercent(v);
  const changed = bps !== null && bps !== p.defaultFeeBps;
  const affected = s.creators.filter((c) => !p.creatorFees[c.id]).length;

  return (
    <>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (changed) setConfirming(true);
        }}
      >
        <Field label="Platform fee" htmlFor="platform-fee" error={bps === null ? "Enter a number from 0 to 100" : null} hint="Taken from the item price. Shipping always goes to the creator.">
          <div className="flex flex-wrap items-center gap-3">
            <PercentInput id="platform-fee" value={v} onChange={setV} />
            <Btn type="submit" variant="dark" disabled={!changed}>Save</Btn>
          </div>
        </Field>
      </form>

        <ConfirmDialog
          open={confirming}
          onClose={() => setConfirming(false)}
          title={`Change the fee to ${bps !== null ? fmtFee(bps) : ""}?`}
          confirmLabel="Change fee"
          danger
          body={
            <div className="flex flex-col gap-3">
              <p>
                {affected} creator{affected === 1 ? "" : "s"} on the platform fee will pay {bps !== null ? fmtFee(bps) : ""} instead of {fmtFee(p.defaultFeeBps)} on new orders.
                Creators with their own rate don&apos;t change, and orders already placed keep their fee.
              </p>
              <label className="flex items-start gap-2.5 text-sm text-ink">
                <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="mt-0.5 size-4 accent-ink" />
                Email those {affected} creators about the change
              </label>
            </div>
          }
          onConfirm={() => {
            if (bps === null) return;
            platformActions.setDefaultFee(bps);
            adminActions.log(`Set the platform fee to ${fmtFee(bps)} (was ${fmtFee(p.defaultFeeBps)})${notify ? `, emailed ${affected} creators` : ""}`);
            toast(`Platform fee is now ${fmtFee(bps)} for new orders`);
          }}
        />
    </>
  );
}

/** Fee + why. Used for a creator's own rate and for a rate waiting on an email. */
function RateForm({
  id,
  initial,
  onSave,
  onClear,
  clearLabel,
  onCancel,
}: {
  id: string;
  initial?: FeeOverride;
  onSave: (feeBps: number, note: string) => void;
  onClear?: () => void;
  clearLabel?: string;
  onCancel?: () => void;
}) {
  const [v, setV] = useState(initial ? String(initial.feeBps / 100) : "");
  const [note, setNote] = useState(initial?.note ?? "");
  const bps = parseFeePercent(v);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (bps !== null) onSave(bps, note.trim());
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Their fee" htmlFor={`fee-${id}`} error={v.trim() && bps === null ? "0 to 100" : null}>
          <PercentInput id={`fee-${id}`} value={v} onChange={setV} autoFocus />
        </Field>
        <div className="min-w-[180px] flex-1">
          <Field label="Why" htmlFor={`fee-note-${id}`} optional>
            <input id={`fee-note-${id}`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Launch partner" className={inputCls} size={1} />
          </Field>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Btn type="submit" size="sm" variant="dark" disabled={bps === null}>Save</Btn>
        {onClear && <Btn size="sm" variant="outline" onClick={onClear}>{clearLabel}</Btn>}
        {onCancel && <Btn size="sm" variant="ghost" onClick={onCancel}>Cancel</Btn>}
      </div>
    </form>
  );
}

/** A creator's own rate, or back to the platform rate. */
export function CreatorFeeEditor({ creatorId, name, onDone }: { creatorId: string; name: string; onDone?: () => void }) {
  const p = usePlatform();
  const toast = useToast();
  const current = p.creatorFees[creatorId];
  return (
    <RateForm
      id={creatorId}
      initial={current}
      onSave={(bps, note) => {
        platformActions.setCreatorFee(creatorId, bps, note);
        adminActions.log(`Set ${name}'s fee to ${fmtFee(bps)}${note ? ` (${note})` : ""}`);
        toast(`${name} now pays ${fmtFee(bps)} on new orders`);
        onDone?.();
      }}
      onClear={
        current
          ? () => {
              platformActions.clearCreatorFee(creatorId);
              adminActions.log(`Moved ${name} back to the platform fee (${fmtFee(p.defaultFeeBps)})`);
              toast(`${name} is back on the platform fee`);
              onDone?.();
            }
          : undefined
      }
      clearLabel={`Use platform fee (${fmtFee(p.defaultFeeBps)})`}
      onCancel={onDone}
    />
  );
}

/** A rate agreed before sign-up: applies automatically when someone signs up with this email. */
export function PendingFeeEditor({ email, onDone }: { email: string; onDone?: () => void }) {
  const p = usePlatform();
  const toast = useToast();
  const current = p.pendingFees[email.toLowerCase()];
  return (
    <RateForm
      id={email.replace(/[^a-z0-9]/gi, "")}
      initial={current}
      onSave={(bps, note) => {
        platformActions.setPendingFee(email, bps, note);
        adminActions.log(`Set a ${fmtFee(bps)} fee for ${email}, applies when they sign up${note ? ` (${note})` : ""}`);
        toast(`${fmtFee(bps)} saved for ${email}`);
        onDone?.();
      }}
      onClear={
        current
          ? () => {
              platformActions.clearPendingFee(email);
              adminActions.log(`Removed the waiting fee for ${email}`);
              toast("Removed");
              onDone?.();
            }
          : undefined
      }
      clearLabel="Remove"
      onCancel={onDone}
    />
  );
}

type Pick = { kind: "creator"; id: string; name: string } | { kind: "email"; email: string };

/** Find a creator by name, @handle or email, or type the email of someone who hasn't signed up yet. */
export function CustomRateAdder() {
  const s = useAdmin();
  const p = usePlatform();
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Pick | null>(null);
  const t = q.trim().toLowerCase().replace(/^@/, "");
  const matches = t
    ? s.creators.filter((c) => !p.creatorFees[c.id] && matchesCreator(c, t)).slice(0, 6)
    : [];
  const emailIsNew = isEmail(q) && !s.creators.some((c) => c.email.toLowerCase() === t) && !p.pendingFees[t];

  if (picked) {
    const done = () => {
      setPicked(null);
      setQ("");
    };
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm">
          {picked.kind === "creator" ? (
            <>Own fee for <b>{picked.name}</b></>
          ) : (
            <>Fee for <b>{picked.email}</b>. It applies automatically when they sign up with this email.</>
          )}
        </p>
        {picked.kind === "creator" ? (
          <CreatorFeeEditor creatorId={picked.id} name={picked.name} onDone={done} />
        ) : (
          <PendingFeeEditor email={picked.email} onDone={done} />
        )}
      </div>
    );
  }

  return (
    <div>
      <Field label="Add a creator" htmlFor="rate-search" hint="Search by name, @handle or email. Not signed up yet? Type their email.">
        <input id="rate-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Lena or nina@example.com" className={inputCls} size={1} autoComplete="off" />
      </Field>
      {(matches.length > 0 || emailIsNew) && (
        <ul className="mt-2 border border-line">
          {matches.map((c) => (
            <li key={c.id} className="border-t border-line first:border-t-0">
              <button type="button" onClick={() => setPicked({ kind: "creator", id: c.id, name: c.displayName })} className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-soft">
                <CreatorAvatar c={c} size="size-8" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{c.displayName}</span>
                  <span className="block text-xs text-muted">@{c.handle} · {c.email}</span>
                </span>
              </button>
            </li>
          ))}
          {emailIsNew && (
            <li className="border-t border-line first:border-t-0">
              <button type="button" onClick={() => setPicked({ kind: "email", email: q.trim() })} className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-soft">
                <span className="grid size-8 place-items-center rounded-full border-[1.5px] border-dashed border-muted text-muted">+</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{q.trim()}</span>
                  <span className="block text-xs text-muted">Not signed up yet. Set their rate now</span>
                </span>
              </button>
            </li>
          )}
        </ul>
      )}
      {t && matches.length === 0 && !emailIsNew && !isEmail(q) && (
        <p className="mt-2 text-sm text-muted">No creator matches. If they haven&apos;t signed up yet, type their email.</p>
      )}
    </div>
  );
}
