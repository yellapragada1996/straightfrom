"use client";

/* eslint-disable @next/next/no-img-element -- photos may be local data: URLs */

import { useEffect, useRef, useState } from "react";
import type { AdminCreator } from "@/lib/admin-store";
import { Icon } from "../icons";
import { Btn, Field, inputCls } from "../creator/ui";

// Small pieces shared by the admin screens. Denser than the creator side:
// tables, pills and confirmations.

export function Thumb({ src, className = "w-10" }: { src?: string; className?: string }) {
  return src ? (
    <img src={src} alt="" className={`aspect-[4/5] shrink-0 object-cover ${className}`} />
  ) : (
    <span className={`grid aspect-[4/5] shrink-0 place-items-center bg-tile text-muted ${className}`}>
      <Icon name="camera" className="size-4" />
    </span>
  );
}

export function CreatorAvatar({ c, size = "size-9" }: { c: Pick<AdminCreator, "avatarUrl" | "displayName">; size?: string }) {
  return c.avatarUrl ? (
    <img src={c.avatarUrl} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
  ) : (
    <span className={`${size} grid shrink-0 place-items-center rounded-full bg-tile text-[13px] font-bold`}>{c.displayName[0]}</span>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "red" }) {
  return (
    <div className="border border-line bg-white p-4">
      <p className="text-xs font-bold tracking-[0.08em] text-muted uppercase">{label}</p>
      <p className={`mt-1.5 font-display text-[28px] leading-none font-extrabold tracking-tight ${tone === "red" ? "text-accent" : ""}`}>{value}</p>
      {sub && <p className="mt-1.5 text-[12.5px] text-muted">{sub}</p>}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="font-display text-xl font-extrabold tracking-tight uppercase">{children}</h2>
      {aside}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="relative mb-4 block">
      <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${inputCls} pl-10`} size={1} />
    </label>
  );
}

/** Horizontally scrollable table wrapper so wide tables never push the page sideways. */
export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-line bg-white">
      <table className="w-full min-w-[680px] text-left text-sm [&_td]:border-t [&_td]:border-line [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-xs [&_th]:font-bold [&_th]:tracking-[0.06em] [&_th]:text-muted [&_th]:uppercase">
        {children}
      </table>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="border border-dashed border-muted bg-white p-6 text-sm text-muted">{children}</div>;
}

/** Plain-text status. Red only when it needs you. */
export function StatusText({ text, urgent }: { text: string; urgent?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold whitespace-nowrap ${urgent ? "text-accent" : "text-ink-2"}`}>
      {urgent && <span className="size-1.5 rounded-full bg-accent" />}
      {text}
    </span>
  );
}

/** Admin page heading: smaller than the creator side so more fits on screen. */
export function AdminTitle({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <h1 className="font-display text-[30px] leading-none font-extrabold tracking-[-0.035em] uppercase md:text-[36px]">{title}</h1>
      {actions}
    </div>
  );
}

/**
 * Every destructive admin action goes through this: say what will happen,
 * optionally ask for a reason (it goes in the activity log), then confirm.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  reasonLabel,
  reasonOptions,
  danger,
  disabled,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  reasonLabel?: string;
  reasonOptions?: string[];
  danger?: boolean;
  /** Extra condition before confirming (e.g. a valid input in the body). */
  disabled?: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  const needsReason = !!reasonLabel;
  const ok = (!needsReason || reason.trim().length > 1) && !disabled;
  return (
    <dialog
      ref={ref}
      onClose={() => {
        setReason("");
        onClose();
      }}
      className="m-auto w-[min(460px,calc(100vw-32px))] border-[1.5px] border-ink bg-white p-0 backdrop:bg-ink/40"
    >
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ok) return;
          onConfirm(reason.trim());
          setReason("");
          onClose();
        }}
        className="flex flex-col gap-4 p-5"
      >
        <h2 className="font-display text-2xl font-extrabold tracking-tight uppercase">{title}</h2>
        <div className="text-[15px] leading-relaxed text-ink-2">{body}</div>
        {needsReason && (
          <Field label={reasonLabel} htmlFor="confirm-reason" hint="Saved in the activity log.">
            {reasonOptions ? (
              <select id="confirm-reason" value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls}>
                <option value="">Choose…</option>
                {reasonOptions.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            ) : (
              <input id="confirm-reason" value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} autoFocus />
            )}
          </Field>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" variant={danger ? "primary" : "dark"} disabled={!ok}>{confirmLabel}</Btn>
        </div>
      </form>
    </dialog>
  );
}
