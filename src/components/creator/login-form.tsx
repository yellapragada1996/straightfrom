"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { creatorActions } from "@/lib/creator-store";
import { EmailPasswordAuth } from "../auth/email-password";
import { Wordmark } from "../brand";
import { GoogleButton, OrDivider } from "../google-button";
import { Underline } from "../scribbles";

export const PENDING_EMAIL_KEY = "sf-pending-email";

/**
 * Creator auth. /signup: Google, or email + password confirmed with a 6-digit code.
 * /login: Google, or email + password (with "Forgot password?").
 */
export function LoginForm({ mode = "signin" }: { mode?: "signup" | "signin" }) {
  const signup = mode === "signup";
  const router = useRouter();

  function startOnboarding(email: string) {
    try {
      sessionStorage.setItem(PENDING_EMAIL_KEY, email);
    } catch {}
    router.push("/onboarding");
  }
  function openSampleDashboard() {
    // Prototype: signing in opens Maya's sample dashboard.
    creatorActions.signInAsSample();
    router.push("/dashboard");
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
            Your stuff has{" "}
            <span className="relative inline-block text-accent">
              fans.
              <Underline draw className="absolute -bottom-[0.1em] left-0 h-[0.16em] w-full [stroke-width:4]" />
            </span>
          </h1>
          <p className="mt-6 max-w-[440px] text-[17px] leading-relaxed text-ink-2">
            Add a few things you own, share one link, and your fans can buy them straight from you.
          </p>
        </div>

        <div className="border-[1.5px] border-ink p-6 md:p-8">
          <EmailPasswordAuth
            mode={mode}
            onDone={(email, isNew) => (signup && isNew ? startOnboarding(email) : openSampleDashboard())}
            prototypeNote={signup ? undefined : "Prototype: any email and password opens Maya's sample dashboard."}
            intro={
              <>
                <h2 className="font-display text-2xl font-extrabold tracking-tight uppercase">{signup ? "Your fans are waiting" : "Welcome back"}</h2>
                <p className="-mt-2 text-sm text-muted">
                  {signup ? "Sign up, share your link, and let the people who follow you own something that was really yours." : "Sign in with Google or your email."}
                </p>
                <GoogleButton onSuccess={() => (signup ? startOnboarding("you@gmail.com") : openSampleDashboard())} />
                <OrDivider />
              </>
            }
            footer={
              <>
                {signup && (
                  <p className="text-[12.5px] leading-relaxed text-muted">
                    You must be 18 or older to sell on StraightFrom. By continuing you agree to the{" "}
                    <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
                  </p>
                )}
                <p className="border-t border-line pt-4 text-sm">
                  {signup ? "Already have a page? " : "New to StraightFrom? "}
                  <Link href={signup ? "/login" : "/signup"} className="font-semibold underline underline-offset-4">
                    {signup ? "Sign in" : "Sign up"}
                  </Link>
                </p>
              </>
            }
          />
        </div>
      </main>
    </div>
  );
}
