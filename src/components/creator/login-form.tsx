"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { creatorActions } from "@/lib/creator-store";
import { Wordmark } from "../brand";
import { Icon } from "../icons";
import { Underline } from "../scribbles";
import { Btn, Field, inputCls } from "./ui";

export const PENDING_EMAIL_KEY = "sf-pending-email";
export const CLAIM_HANDLE_KEY = "sf-claim-handle";

/** Magic-link sign in. One screen for both new and returning creators. */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 700));
    try {
      sessionStorage.setItem(PENDING_EMAIL_KEY, email.trim());
    } catch {}
    setBusy(false);
    setSent(true);
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-[58px] max-w-[1100px] items-center px-4 md:px-10">
          <Link href="/" aria-label="StraightFrom home">
            <Wordmark />
          </Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1100px] flex-1 items-start gap-10 px-4 py-10 md:grid-cols-2 md:gap-16 md:px-10 md:py-20">
        <div>
          <p className="inline-block -rotate-2 font-hand text-[28px] font-semibold text-accent">for creators</p>
          <h1 className="font-display text-[44px] leading-[0.86] font-extrabold tracking-[-0.045em] uppercase md:text-[72px]">
            Let fans own a{" "}
            <span className="relative inline-block">
              piece
              <Underline draw className="absolute -bottom-[0.1em] left-0 h-[0.16em] w-full [stroke-width:4]" />
            </span>{" "}
            of your story
          </h1>
          <ul className="mt-6 flex flex-col gap-2.5 text-[15px] text-ink-2">
            {[
              "Your own page, live in 2 minutes",
              "List the things fans saw in your videos",
              "You ship it, we handle payments",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <Icon name="check" className="size-[18px] text-accent" /> {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-[1.5px] border-ink p-6 md:p-8">
          {!sent ? (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <h2 className="font-display text-2xl font-extrabold tracking-tight uppercase">Sign in or create your page</h2>
              <p className="-mt-2 text-sm text-muted">No password. We&apos;ll email you a link.</p>
              <Field label="Email" htmlFor="email">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputCls}
                  required
                />
              </Field>
              <Btn type="submit" size="lg" full disabled={!valid || busy} iconRight={busy ? undefined : "arrow"}>
                {busy ? "Sending…" : "Email me a sign-in link"}
              </Btn>
              <p className="text-[12.5px] leading-relaxed text-muted">
                You must be 18 or older to sell on StraightFrom. By continuing you agree to the{" "}
                <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
              </p>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              <span className="grid size-12 place-items-center rounded-full bg-ink text-white">
                <Icon name="mail" />
              </span>
              <h2 className="font-display text-2xl font-extrabold tracking-tight uppercase">Check your email</h2>
              <p className="text-[15px] leading-relaxed text-ink-2">
                We sent a sign-in link to <b className="text-ink">{email}</b>. It works for 1 hour. Open it on this device.
              </p>
              <button type="button" onClick={() => setSent(false)} className="self-start text-sm underline underline-offset-4">
                Use a different email
              </button>

              <div className="mt-2 flex flex-col gap-2 border border-dashed border-muted p-4">
                <p className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">Prototype: pretend you clicked the link</p>
                <Btn variant="dark" full onClick={() => router.push("/onboarding")}>
                  Open link as a new creator
                </Btn>
                <Btn
                  variant="outline"
                  full
                  onClick={() => {
                    creatorActions.signInAsSample();
                    router.push("/dashboard");
                  }}
                >
                  Open link as Maya (sample creator)
                </Btn>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
