"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { adminActions, needsAttention, useAdmin } from "@/lib/admin-store";
import { useHydrated } from "@/lib/cart";
import { platformActions } from "@/lib/platform-store";
import { Wordmark } from "../brand";
import { GoogleButton } from "../google-button";
import { Icon, type IconName } from "../icons";
import { ToastProvider } from "../creator/ui";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin", label: "Home", icon: "home" },
  { href: "/admin/orders", label: "Orders", icon: "truck" },
  { href: "/admin/creators", label: "Creators", icon: "users" },
  { href: "/admin/fees", label: "Fees", icon: "percent" },
];

function AdminTag() {
  return <span className="bg-accent px-1.5 py-0.5 text-[10px] font-bold tracking-[0.12em] text-white uppercase">Admin</span>;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const s = useAdmin();
  const pathname = usePathname();
  const router = useRouter();

  if (!hydrated) return <div className="min-h-dvh" aria-busy="true" />;
  if (!s.signedIn) return <AdminSignIn />;

  const todo = needsAttention(s).length + s.reports.filter((r) => r.status === "open").length;
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));
  const badge = (href: string) => (href === "/admin" ? todo : 0);

  return (
    <ToastProvider>
      <div className="min-h-dvh bg-soft md:grid md:grid-cols-[232px_1fr]">
        <aside className="sticky top-0 hidden h-dvh flex-col bg-ink px-4 py-5 text-white md:flex">
          <Link href="/admin" className="flex items-center gap-2 px-2">
            <Wordmark onDark /> <AdminTag />
          </Link>
          <nav className="mt-8 flex flex-col gap-0.5" aria-label="Admin">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive(n.href) ? "page" : undefined}
                className={`flex h-10 items-center gap-3 px-3 text-[14.5px] font-semibold ${isActive(n.href) ? "bg-white text-ink" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
              >
                <Icon name={n.icon} className="size-[18px]" />
                {n.label}
                {badge(n.href) > 0 && (
                  <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">{badge(n.href)}</span>
                )}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-1 border-t border-white/15 pt-4 text-sm">
            <Link
              href="/admin/activity"
              aria-current={isActive("/admin/activity") ? "page" : undefined}
              className={`flex h-10 items-center gap-2.5 px-3 ${isActive("/admin/activity") ? "bg-white text-ink" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
            >
              <Icon name="list" className="size-[18px]" /> Activity log
            </Link>
            <p className="mt-2 truncate px-3 text-xs text-white/50">admin@straightfrom.co</p>
            <button
              type="button"
              onClick={() => {
                adminActions.signOut();
                router.push("/admin");
              }}
              className="flex h-10 items-center gap-2.5 px-3 text-white/70 hover:bg-white/10 hover:text-white"
            >
              <Icon name="logout" className="size-[18px]" /> Sign out
            </button>
            <button
              type="button"
              onClick={() => {
                adminActions.reset();
                platformActions.reset();
                router.push("/admin");
              }}
              className="mt-1 px-3 text-left text-[11px] text-white/50 underline underline-offset-2"
            >
              Prototype: reset admin data
            </button>
          </div>
        </aside>

        {/* Mobile: top bar + scrollable nav */}
        <header className="sticky top-0 z-20 bg-ink text-white md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/admin" className="flex items-center gap-2"><Wordmark onDark className="text-xl" /> <AdminTag /></Link>
            <button type="button" aria-label="Sign out" onClick={() => adminActions.signOut()} className="grid size-9 place-items-center text-white/70">
              <Icon name="logout" className="size-5" />
            </button>
          </div>
          <nav aria-label="Admin" className="grid grid-cols-4 gap-1 px-3 pb-2">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive(n.href) ? "page" : undefined}
                className={`flex h-8 items-center justify-center gap-1.5 text-[13px] font-semibold ${isActive(n.href) ? "bg-white text-ink" : "text-white/70"}`}
              >
                {n.label}
                {badge(n.href) > 0 && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">{badge(n.href)}</span>}
              </Link>
            ))}
          </nav>
        </header>

        <main className="min-w-0 px-4 pt-6 pb-20 md:px-10 md:pt-10">
          <div className="mx-auto max-w-[1080px]">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}

/** One admin account. Real app: Google sign-in, then a server check against ADMIN_EMAIL on every admin request. */
function AdminSignIn() {
  const [denied, setDenied] = useState(false);
  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink px-4">
      <div className="w-full max-w-[400px] bg-white p-6 md:p-8">
        <div className="flex items-center gap-2">
          <Wordmark /> <AdminTag />
        </div>
        <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight uppercase">Admin sign in</h1>
        <p className="mt-2 mb-5 text-sm text-muted">Only the StraightFrom admin account can get in.</p>
        <GoogleButton onSuccess={() => adminActions.signIn()} />
        {denied && (
          <p role="alert" className="mt-3 flex items-start gap-2 bg-[#fff0ee] p-3 text-sm text-accent">
            <Icon name="alert" className="mt-0.5 size-4" /> That Google account doesn&apos;t have admin access.
          </p>
        )}
        <div className="mt-6 border border-dashed border-muted p-3 text-[12.5px] text-muted">
          Prototype: the button above signs in as admin@straightfrom.co.{" "}
          <button type="button" onClick={() => setDenied(true)} className="underline underline-offset-2 hover:text-ink">
            Try any other account
          </button>
        </div>
      </div>
    </div>
  );
}
