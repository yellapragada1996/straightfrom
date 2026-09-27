"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useHydrated } from "@/lib/cart";
import { creatorActions } from "@/lib/creator-store";
import { checkHandle, suggestHandle } from "@/lib/handles";
import type { SocialLinks } from "@/lib/social";
import { Wordmark } from "../brand";
import { Icon } from "../icons";
import { PagePreview } from "./page-preview";
import { AvatarPicker } from "./photo-uploader";
import { cleanSocialLinks, SocialLinksEditor } from "./social-links-editor";
import { Btn, CopyButton, Field, inputCls } from "./ui";
import { PENDING_EMAIL_KEY } from "./login-form";

const STEPS = ["Your link", "Your profile", "Your socials"] as const;
const BIO_MAX = 160;

function readPendingEmail() {
  try {
    return sessionStorage.getItem(PENDING_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function Onboarding() {
  // Reads the email saved at sign-in, so render only once we're in the browser.
  return useHydrated() ? <OnboardingSteps /> : <div className="min-h-dvh" aria-busy="true" />;
}

function OnboardingSteps() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [email] = useState(readPendingEmail);
  const [handle, setHandle] = useState(() => suggestHandle(email));
  const [adult, setAdult] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [socials, setSocials] = useState<SocialLinks>({});
  const [done, setDone] = useState(false);
  const [touchedHandle, setTouchedHandle] = useState(false);

  const h = handle.trim().toLowerCase();
  const check = checkHandle(h);
  const canNext = step === 0 ? check.ok && adult : step === 1 ? displayName.trim().length > 0 : true;

  function finish() {
    creatorActions.startNew({
      email: email || "you@example.com",
      handle: h,
      displayName: displayName.trim(),
      bio: bio.trim(),
      avatarUrl,
      socialLinks: cleanSocialLinks(socials),
    });
    setDone(true);
    window.scrollTo({ top: 0 });
  }

  const preview = (
    <PagePreview handle={h} displayName={displayName} bio={bio} avatarUrl={avatarUrl} socialLinks={cleanSocialLinks(socials)} />
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-[58px] max-w-[1100px] items-center justify-between px-4 md:px-10">
          <Wordmark />
          {!done && (
            <span className="text-[13px] text-muted">
              Step {step + 1} of {STEPS.length}
            </span>
          )}
        </div>
        {!done && (
          <div className="h-1 bg-tile">
            <div className="h-full bg-accent transition-all duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
        )}
      </header>

      <main className="mx-auto grid w-full max-w-[1100px] flex-1 gap-10 px-4 pt-8 pb-16 md:grid-cols-[minmax(0,1fr)_360px] md:gap-16 md:px-10 md:pt-14">
        {done ? (
          <div className="flex flex-col gap-5 md:col-span-2 md:max-w-xl">
            <p className="inline-block -rotate-2 self-start font-hand text-[30px] font-semibold text-accent">you&apos;re live!</p>
            <h1 className="-mt-3 font-display text-[44px] leading-[0.86] font-extrabold tracking-[-0.045em] uppercase md:text-[68px]">Your page is ready</h1>
            {preview}
            <div className="flex flex-wrap items-center gap-2 border-[1.5px] border-ink p-3">
              <span className="min-w-0 flex-1 truncate font-display font-extrabold">straightfrom.co/{h}</span>
              <CopyButton text={`https://straightfrom.co/${h}`} label="Copy link" />
            </div>
            <p className="text-sm leading-relaxed text-muted">
              Put it in your Instagram and TikTok bio, and in your YouTube descriptions. Fans can see your page right away. It
              fills up as you list pieces.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Btn href="/dashboard/items/new" size="lg" icon="plus">List your first piece</Btn>
              <Btn href="/dashboard" size="lg" variant="outline">Go to dashboard</Btn>
            </div>
            <p className="text-[13px] text-muted">
              No bank details needed yet. We&apos;ll ask when you make your first sale.
            </p>
          </div>
        ) : (
          <>
            <form
              className="flex flex-col gap-6"
              onSubmit={(e) => {
                e.preventDefault();
                if (!canNext) return;
                if (step < STEPS.length - 1) setStep(step + 1);
                else finish();
              }}
            >
              {step === 0 && (
                <>
                  <div>
                    <h1 className="font-display text-[40px] leading-[0.88] font-extrabold tracking-[-0.045em] uppercase md:text-[56px]">Claim your link</h1>
                    <p className="mt-2 text-[15px] text-ink-2">This is the link fans tap from your bio. Use the name they know you by.</p>
                  </div>
                  <Field
                    label="Your link"
                    htmlFor="handle"
                    error={touchedHandle && !check.ok ? check.reason : null}
                    hint={check.ok ? <span className="flex items-center gap-1.5 text-[#1f7a3a]"><Icon name="check" className="size-4" /> straightfrom.co/{h} is yours</span> : "Letters, numbers and _ only."}
                  >
                    <div className="flex items-stretch border-[1.5px] border-line bg-white focus-within:border-ink">
                      <span className="flex items-center pl-3.5 text-[16px] text-muted">straightfrom.co/</span>
                      <input
                        id="handle"
                        value={handle}
                        onChange={(e) => {
                          setHandle(e.target.value.toLowerCase().replace(/\s/g, ""));
                          setTouchedHandle(true);
                        }}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        maxLength={30}
                        className="h-12 min-w-0 flex-1 bg-transparent pr-3 text-[16px] font-semibold outline-none"
                        placeholder="yourname"
                      />
                    </div>
                  </Field>
                  <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-snug">
                    <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-0.5 size-5 accent-[#e0201b]" />
                    <span>
                      I&apos;m 18 or older, and I agree to the <Link href="/terms" className="underline">Terms</Link>. I&apos;ll only list things I personally owned or used.
                    </span>
                  </label>
                </>
              )}

              {step === 1 && (
                <>
                  <div>
                    <h1 className="font-display text-[40px] leading-[0.88] font-extrabold tracking-[-0.045em] uppercase md:text-[56px]">Your profile</h1>
                    <p className="mt-2 text-[15px] text-ink-2">Fans should recognise you in one second.</p>
                  </div>
                  <AvatarPicker src={avatarUrl} onChange={setAvatarUrl} name={displayName} />
                  <Field label="Name" htmlFor="name" hint="Shown big at the top of your page.">
                    <input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} className={inputCls} placeholder="Maya Okafor" autoComplete="name" />
                  </Field>
                  <Field label="Bio" htmlFor="bio" optional aside={<span className={`text-xs ${bio.length > BIO_MAX - 20 ? "text-accent" : "text-muted"}`}>{bio.length}/{BIO_MAX}</span>}>
                    <textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                      rows={3}
                      className={`${inputCls} h-auto py-3 leading-relaxed`}
                      placeholder="What do you make? e.g. Travel vlogger. Everything here came along on a trip you watched."
                    />
                  </Field>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <h1 className="font-display text-[40px] leading-[0.88] font-extrabold tracking-[-0.045em] uppercase md:text-[56px]">Your socials</h1>
                    <p className="mt-2 text-[15px] text-ink-2">
                      They show on your page with their icons. It&apos;s how fans know it&apos;s really you. Paste a profile link or just
                      type your username.
                    </p>
                  </div>
                  <SocialLinksEditor value={socials} onChange={setSocials} />
                </>
              )}

              <div className="flex items-center gap-3 border-t border-line pt-5">
                {step > 0 && (
                  <Btn variant="ghost" icon="back" onClick={() => setStep(step - 1)}>
                    Back
                  </Btn>
                )}
                <div className="flex-1" />
                {step === 2 && Object.keys(cleanSocialLinks(socials)).length === 0 && (
                  <button type="submit" className="text-sm text-muted underline underline-offset-4">Skip for now</button>
                )}
                <Btn type="submit" size="lg" disabled={!canNext} iconRight="arrow">
                  {step < STEPS.length - 1 ? "Continue" : "Create my page"}
                </Btn>
              </div>
              {step === 0 && !canNext && check.ok && !adult && <p className="-mt-3 text-right text-[13px] text-muted">Tick the box to continue.</p>}
            </form>

            <aside className="hidden md:block">
              <p className="mb-2 text-xs font-bold tracking-[0.08em] text-muted uppercase">Live preview</p>
              <div className="sticky top-8">{preview}</div>
            </aside>
            {step > 0 && <div className="md:hidden">{preview}</div>}
          </>
        )}
      </main>
      {!done && step === 0 && (
        <p className="pb-8 text-center text-sm text-muted">
          Already have a page? <button type="button" className="underline" onClick={() => router.push("/login")}>Sign in</button>
        </p>
      )}
    </div>
  );
}
