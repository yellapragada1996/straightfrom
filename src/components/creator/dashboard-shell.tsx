"use client";

/* eslint-disable @next/next/no-img-element -- avatar may be a local data: URL */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useHydrated } from "@/lib/cart";
import { balances, creatorActions, useCreatorState } from "@/lib/creator-store";
import { creators } from "@/lib/mock-data";
import { Wordmark } from "../brand";
import { Icon, type IconName } from "../icons";
import { Btn, ToastProvider } from "./ui";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/dashboard/items", label: "Pieces", icon: "grid" },
  { href: "/dashboard/orders", label: "Orders", icon: "truck" },
  { href: "/dashboard/earnings", label: "Earnings", icon: "wallet" },
  { href: "/dashboard/settings", label: "Settings", icon: "settings" },
];

/** Public page link. In the prototype only the sample creators have a server-rendered page. */
export function usePublicPageHref() {
  const s = useCreatorState();
  const h = s.profile?.handle;
  return h && creators.some((c) => c.handle === h) ? `/${h}` : null;
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const state = useCreatorState();
  const pathname = usePathname();
  const router = useRouter();
  const pageHref = usePublicPageHref();

  if (!hydrated) return <div className="min-h-dvh" aria-busy="true" />;

  if (!state.signedIn) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-4 px-4">
        <Link href="/"><Wordmark /></Link>
        <h1 className="font-display text-4xl font-extrabold uppercase">You&apos;re signed out</h1>
        <p className="text-ink-2">Sign in to get to your dashboard.</p>
        <Btn href="/login" size="lg" iconRight="arrow">Sign in</Btn>
      </div>
    );
  }

  if (!state.profile) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-4 px-4">
        <Wordmark />
        <h1 className="font-display text-4xl font-extrabold uppercase">Finish setting up</h1>
        <p className="text-ink-2">Pick your link to open your dashboard.</p>
        <Btn href="/onboarding" size="lg" iconRight="arrow">Continue</Btn>
      </div>
    );
  }

  const p = state.profile;
  const toShip = balances(state).toShip.length;
  const isActive = (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));
  const avatar = p.avatarUrl ? (
    <img src={p.avatarUrl} alt="" className="size-full rounded-full border-2 border-white object-cover" />
  ) : (
    <span className="grid size-full place-items-center rounded-full border-2 border-white bg-tile text-xs font-bold">{p.displayName[0]}</span>
  );

  return (
    <ToastProvider>
      <div className="min-h-dvh bg-soft md:grid md:grid-cols-[248px_1fr]">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-white px-4 py-5 md:flex">
          <Link href="/dashboard" className="px-2"><Wordmark /></Link>
          <div className="mt-6 flex items-center gap-2.5 px-2">
            <span className="block size-10 shrink-0 rounded-full bg-accent p-[2px]">{avatar}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{p.displayName}</p>
              <p className="truncate text-xs text-muted">@{p.handle}</p>
            </div>
          </div>
          <nav className="mt-6 flex flex-col gap-0.5" aria-label="Dashboard">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive(n.href) ? "page" : undefined}
                className={`flex h-11 items-center gap-3 px-3 text-[15px] font-semibold ${isActive(n.href) ? "bg-ink text-white" : "text-ink-2 hover:bg-tile hover:text-ink"}`}
              >
                <Icon name={n.icon} className="size-[19px]" />
                {n.label}
                {n.label === "Orders" && toShip > 0 && (
                  <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">{toShip}</span>
                )}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-1 border-t border-line pt-4 text-sm">
            {pageHref && (
              <Link href={pageHref} target="_blank" className="flex h-10 items-center gap-2.5 px-3 font-semibold hover:bg-tile">
                <Icon name="external" className="size-[18px]" /> View my page
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                creatorActions.signOut();
                router.push("/");
              }}
              className="flex h-10 items-center gap-2.5 px-3 text-muted hover:bg-tile hover:text-ink">
              <Icon name="logout" className="size-[18px]" /> Sign out
            </button>
            <button
              type="button"
              onClick={() => {
                creatorActions.resetPrototype();
                router.push("/dashboard");
              }}
              className="mt-1 px-3 text-left text-[11px] text-muted underline underline-offset-2"
            >
              Prototype: reset sample data
            </button>
          </div>
        </aside>

        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-white px-4 md:hidden">
          <Link href="/dashboard"><Wordmark className="text-xl" /></Link>
          <div className="flex items-center gap-2">
            {pageHref && (
              <Link href={pageHref} className="inline-flex h-9 items-center gap-1.5 border-[1.5px] border-ink px-2.5 text-[13px] font-semibold">
                <Icon name="eye" className="size-4" /> My page
              </Link>
            )}
            <Link href="/dashboard/settings" aria-label="Settings" className="block size-9 rounded-full bg-accent p-[2px]">{avatar}</Link>
          </div>
        </header>

        <main className="min-w-0 px-4 pt-6 pb-28 md:px-10 md:pt-10 md:pb-16">
          <div className="mx-auto max-w-[980px]">{children}</div>
        </main>

        {/* Mobile bottom tabs */}
        <nav aria-label="Dashboard" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={isActive(n.href) ? "page" : undefined}
              className={`relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${isActive(n.href) ? "text-ink" : "text-muted"}`}
            >
              {isActive(n.href) && <span className="absolute top-0 h-[3px] w-10 bg-accent" />}
              <Icon name={n.icon} className="size-[22px]" />
              {n.label}
              {n.label === "Orders" && toShip > 0 && (
                <span className="absolute top-2 left-1/2 ml-2 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">{toShip}</span>
              )}
            </Link>
          ))}
        </nav>
      </div>
    </ToastProvider>
  );
}
