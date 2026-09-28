"use client";

import { useEffect, useState } from "react";
import { CODE_LENGTH, MIN_PASSWORD_LENGTH, RESEND_CODE_SECONDS } from "@/config";
import { Icon } from "../icons";

// Email + password auth shared by creators and fans.
// Sign up: email + password → 6-digit code emailed → verified, signed in.
// Sign in: email + password. Forgot password: email → 6-digit code → new password.
// Real app: Supabase Auth (signUp → verifyOtp, signInWithPassword,
// resetPasswordForEmail → verifyOtp type "recovery" → updateUser).

const inputCls =
  "h-12 w-full border-[1.5px] border-line bg-white px-3.5 text-[16px] outline-none transition-colors placeholder:text-[#9a9a9a] focus:border-ink aria-invalid:border-accent";
const btnCls =
  "flex h-[52px] w-full items-center justify-center gap-2 bg-accent font-semibold text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-45";

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Step = "form" | "verify" | "forgot" | "reset-code" | "new-password";

export function EmailPasswordAuth({
  mode,
  presetEmail = "",
  submitLabel,
  onDone,
  prototypeNote,
  intro,
  footer,
}: {
  mode: "signup" | "signin";
  presetEmail?: string;
  submitLabel?: string;
  /** Called once the person is signed in. `isNew` is true right after sign-up. */
  onDone: (email: string, isNew: boolean) => void;
  prototypeNote?: string;
  /** Shown above the email field on the first step only (e.g. heading and Google button). */
  intro?: React.ReactNode;
  /** Shown below the form on the first step only (e.g. terms, "Already have an account?"). */
  footer?: React.ReactNode;
}) {
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState(presetEmail);
  const [password, setPassword] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";

  const emailErr = !isEmail(email) ? "Enter a valid email" : null;
  const pwErr = signup
    ? password.length < MIN_PASSWORD_LENGTH
      ? `At least ${MIN_PASSWORD_LENGTH} characters`
      : null
    : !password
      ? "Enter your password"
      : null;

  if (step === "verify" || step === "reset-code") {
    return (
      <CodeStep
        email={email}
        title={step === "verify" ? "Check your email" : "Reset your password"}
        intro={step === "verify" ? "to finish creating your account." : "to reset your password."}
        onBack={() => setStep(step === "verify" ? "form" : "forgot")}
        onVerified={() => (step === "verify" ? onDone(email.trim(), true) : setStep("new-password"))}
      />
    );
  }

  if (step === "new-password") {
    return <NewPasswordStep email={email} onDone={() => onDone(email.trim(), false)} />;
  }

  if (step === "forgot") {
    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setTried(true);
          if (emailErr) return;
          setBusy(true);
          await wait(600);
          setBusy(false);
          setStep("reset-code");
        }}
      >
        <div>
          <h3 className="font-display text-xl font-extrabold uppercase">Forgot your password?</h3>
          <p className="mt-1 text-sm text-muted">We&apos;ll email you a {CODE_LENGTH}-digit code to set a new one.</p>
        </div>
        <EmailField value={email} onChange={setEmail} error={tried ? emailErr : null} />
        <button type="submit" disabled={busy} className={btnCls}>
          {busy ? "Sending…" : "Send code"}
        </button>
        <button type="button" onClick={() => setStep("form")} className="self-start text-sm underline underline-offset-4">
          Back to sign in
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {intro}
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setTried(true);
          if (emailErr || pwErr) return;
          setBusy(true);
          await wait(700);
          setBusy(false);
          if (signup) setStep("verify");
          else onDone(email.trim(), false);
        }}
      >
        <EmailField value={email} onChange={setEmail} error={tried ? emailErr : null} />
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <label htmlFor="auth-password" className="text-[13px] font-semibold">
              {signup ? "Create a password" : "Password"}
            </label>
            {!signup && (
              <button type="button" onClick={() => setStep("forgot")} className="text-[13px] text-muted underline underline-offset-2 hover:text-ink">
                Forgot password?
              </button>
            )}
          </div>
          <PasswordInput
            id="auth-password"
            value={password}
            onChange={setPassword}
            autoComplete={signup ? "new-password" : "current-password"}
            invalid={tried && !!pwErr}
          />
          {tried && pwErr ? (
            <FieldError>{pwErr}</FieldError>
          ) : signup ? (
            <p className="mt-1.5 text-[13px] text-muted">At least {MIN_PASSWORD_LENGTH} characters.</p>
          ) : null}
        </div>
        <button type="submit" disabled={busy} className={btnCls}>
          {busy ? (signup ? "Creating account…" : "Signing in…") : (submitLabel ?? (signup ? "Create account" : "Sign in"))}
          {!busy && <Icon name="arrow" className="size-[18px]" />}
        </button>
        {prototypeNote && <p className="border border-dashed border-muted p-2.5 text-xs text-muted">{prototypeNote}</p>}
      </form>
      {footer}
    </div>
  );
}

function EmailField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error: string | null }) {
  return (
    <div>
      <label htmlFor="auth-email" className="mb-1.5 block text-[13px] font-semibold">
        Email
      </label>
      <input
        id="auth-email"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="you@example.com"
        aria-invalid={!!error}
        className={inputCls}
      />
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-accent" role="alert">
      <Icon name="alert" className="size-3.5" /> {children}
    </p>
  );
}

export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: "new-password" | "current-password";
  invalid?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        className={`${inputCls} pr-16`}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute top-1/2 right-2 h-9 -translate-y-1/2 px-2 text-[13px] font-semibold text-muted hover:text-ink"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

/** Enter the emailed code. Prototype: any 6 digits work, except 000000 (shows the wrong-code message). */
function CodeStep({ email, title, intro, onBack, onVerified }: { email: string; title: string; intro: string; onBack: () => void; onVerified: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_CODE_SECONDS);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const complete = code.length === CODE_LENGTH;

  async function verify(value: string) {
    setError(null);
    setBusy(true);
    await wait(600);
    setBusy(false);
    if (value === "0".repeat(CODE_LENGTH)) {
      setError("That code isn't right. Check the latest email, or send a new code.");
      return;
    }
    onVerified();
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (complete) verify(code);
      }}
    >
      <span className="grid size-12 place-items-center rounded-full bg-ink text-white">
        <Icon name="mail" />
      </span>
      <div>
        <h3 className="font-display text-2xl font-extrabold tracking-tight uppercase">{title}</h3>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">
          We sent a {CODE_LENGTH}-digit code to <b className="text-ink">{email}</b>. Enter it {intro}
        </p>
      </div>
      <div>
        <label htmlFor="auth-code" className="mb-1.5 block text-[13px] font-semibold">
          {CODE_LENGTH}-digit code
        </label>
        <input
          id="auth-code"
          value={code}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH);
            setCode(v);
            setError(null);
            if (v.length === CODE_LENGTH) verify(v);
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder={"•".repeat(CODE_LENGTH)}
          aria-invalid={!!error}
          className={`${inputCls} h-14 text-center font-display text-[28px] font-extrabold tracking-[0.5em] placeholder:tracking-[0.5em]`}
        />
        {error && <FieldError>{error}</FieldError>}
      </div>
      <button type="submit" disabled={!complete || busy} className={btnCls}>
        {busy ? "Checking…" : "Verify"}
      </button>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        {cooldown > 0 ? (
          <span className="text-muted">
            {resent ? "Sent! " : ""}Resend code in {cooldown}s
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setCooldown(RESEND_CODE_SECONDS);
              setResent(true);
              setCode("");
              setError(null);
            }}
            className="underline underline-offset-4"
          >
            Resend code
          </button>
        )}
        <button type="button" onClick={onBack} className="text-muted underline underline-offset-4 hover:text-ink">
          Use a different email
        </button>
      </div>
      <p className="border border-dashed border-muted p-2.5 text-xs text-muted">
        Prototype: any {CODE_LENGTH} digits work. 000000 shows the wrong-code message.
      </p>
    </form>
  );
}

function NewPasswordStep({ email, onDone }: { email: string; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const err = password.length < MIN_PASSWORD_LENGTH ? `At least ${MIN_PASSWORD_LENGTH} characters` : null;
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setTried(true);
        if (err) return;
        setBusy(true);
        await wait(600);
        onDone();
      }}
    >
      <div>
        <h3 className="font-display text-xl font-extrabold uppercase">Set a new password</h3>
        <p className="mt-1 text-sm text-muted">For {email}</p>
      </div>
      <div>
        <label htmlFor="auth-new-password" className="mb-1.5 block text-[13px] font-semibold">
          New password
        </label>
        <PasswordInput id="auth-new-password" value={password} onChange={setPassword} autoComplete="new-password" invalid={tried && !!err} />
        {tried && err ? <FieldError>{err}</FieldError> : <p className="mt-1.5 text-[13px] text-muted">At least {MIN_PASSWORD_LENGTH} characters.</p>}
      </div>
      <button type="submit" disabled={busy} className={btnCls}>
        {busy ? "Saving…" : "Save and sign in"}
      </button>
    </form>
  );
}
