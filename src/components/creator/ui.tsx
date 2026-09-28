"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Icon, type IconName } from "../icons";

// Small, consistent building blocks for the creator side. Calmer than the
// fan pages: same type and red accent, fewer flourishes.

export const inputCls =
  "h-12 w-full border-[1.5px] border-line bg-white px-3.5 text-[16px] outline-none transition-colors placeholder:text-[#9a9a9a] focus:border-ink aria-invalid:border-accent";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
  aside,
}: {
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string | null;
  optional?: boolean;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[13px] font-semibold">
          {label} {optional && <span className="font-normal text-muted">(optional)</span>}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-accent" role="alert">
          <Icon name="alert" className="size-3.5" /> {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] leading-snug text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

type BtnProps = {
  variant?: "primary" | "dark" | "outline" | "ghost";
  size?: "md" | "lg" | "sm";
  icon?: IconName;
  iconRight?: IconName;
  href?: string;
  full?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Btn({ variant = "primary", size = "md", icon, iconRight, href, full, className = "", children, ...rest }: BtnProps) {
  const v = {
    primary: "bg-accent text-white hover:bg-accent-hover",
    dark: "bg-ink text-white hover:bg-ink-2",
    outline: "border-[1.5px] border-ink hover:bg-ink hover:text-white",
    ghost: "hover:bg-tile",
  }[variant];
  const s = { sm: "h-9 px-3 text-[13px]", md: "h-11 px-4 text-sm", lg: "h-[54px] px-5 text-base" }[size];
  const cls = `inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${v} ${s} ${full ? "w-full" : ""} ${className}`;
  const body = (
    <>
      {icon && <Icon name={icon} className="size-[18px]" />}
      {children}
      {iconRight && <Icon name={iconRight} className="size-[18px]" />}
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" className={cls} {...rest}>
      {body}
    </button>
  );
}

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const pad = /(^|\s)p-\d/.test(className) ? "" : "p-5";
  return <section className={`border border-line bg-white ${pad} ${className}`}>{children}</section>;
}

export function PageTitle({ kicker, title, actions }: { kicker?: string; title: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 md:mb-8">
      <div>
        {kicker && <p className="inline-block -rotate-2 font-hand text-[26px] leading-none font-semibold text-accent">{kicker}</p>}
        <h1 className="font-display text-[40px] leading-[0.88] font-extrabold tracking-[-0.045em] uppercase md:text-[56px]">{title}</h1>
      </div>
      {actions}
    </div>
  );
}

export function StatusPill({ tone, children }: { tone: "red" | "ink" | "muted" | "green"; children: React.ReactNode }) {
  const t = {
    red: "bg-[#fff0ee] text-accent",
    ink: "bg-ink text-white",
    muted: "bg-tile text-ink-2",
    green: "bg-[#eaf6ec] text-[#1f7a3a]",
  }[tone];
  return <span className={`inline-flex h-6 items-center px-2 text-[11px] font-bold tracking-[0.06em] whitespace-nowrap uppercase ${t}`}>{children}</span>;
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="no-scrollbar -mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={`-mb-px flex h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-semibold ${
            value === t.value ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
          }`}
        >
          {t.label}
          {t.count !== undefined && <span className={`text-xs ${value === t.value ? "text-accent" : ""}`}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ---------- toast ----------
const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((m: string) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 bg-ink px-4 py-2.5 text-sm whitespace-nowrap text-white transition-all md:bottom-8 ${
          msg ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
      >
        {msg}
      </div>
    </ToastCtx.Provider>
  );
}

export function CopyButton({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {}
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
      className={`inline-flex h-9 items-center gap-1.5 border-[1.5px] border-ink px-3 text-[13px] font-semibold hover:bg-ink hover:text-white ${className}`}
    >
      <Icon name={done ? "check" : "copy"} className="size-4" />
      {done ? "Copied" : label}
    </button>
  );
}
