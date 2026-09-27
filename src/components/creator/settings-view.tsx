"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { creatorActions, useCreatorState, type Profile } from "@/lib/creator-store";
import { checkHandle } from "@/lib/handles";
import { Icon } from "../icons";
import { PagePreview } from "./page-preview";
import { AvatarPicker } from "./photo-uploader";
import { cleanSocialLinks, SocialLinksEditor } from "./social-links-editor";
import { Btn, Card, Field, inputCls, PageTitle, useToast } from "./ui";

const BIO_MAX = 160;

/** Order-independent comparison, so the save bar only appears after a real edit. */
const fingerprint = (p: Profile) =>
  JSON.stringify([p.handle, p.displayName.trim(), p.bio.trim(), p.avatarUrl, p.email, cleanSocialLinks(p.socialLinks)]);

export function SettingsView() {
  const s = useCreatorState();
  if (!s.profile) return null;
  return <SettingsForm profile={s.profile} bankConnected={s.bank.connected} />;
}

function SettingsForm({ profile, bankConnected }: { profile: Profile; bankConnected: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const [f, setF] = useState<Profile>(profile);
  const [saved, setSaved] = useState<Profile>(profile);
  const handleCheck = checkHandle(f.handle, saved.handle);
  const handleChanged = f.handle !== saved.handle;
  const dirty = fingerprint(f) !== fingerprint(saved);
  const canSave = dirty && f.displayName.trim().length > 0 && handleCheck.ok;

  function save() {
    const next = { ...f, handle: f.handle.toLowerCase(), displayName: f.displayName.trim(), bio: f.bio.trim(), socialLinks: cleanSocialLinks(f.socialLinks) };
    creatorActions.updateProfile(next);
    setF(next);
    setSaved(next);
    toast("Saved. Your page is updated.");
  }

  return (
    <>
      <PageTitle title="Settings" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-5">
            <h2 className="-mb-1 font-display text-lg font-extrabold uppercase">Profile</h2>
            <AvatarPicker src={f.avatarUrl} onChange={(avatarUrl) => setF({ ...f, avatarUrl })} name={f.displayName} />
            <Field label="Name" htmlFor="name" error={!f.displayName.trim() ? "Your name can't be empty" : null}>
              <input id="name" value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} maxLength={40} className={inputCls} />
            </Field>
            <Field label="Bio" htmlFor="bio" optional aside={<span className="text-xs text-muted">{f.bio.length}/{BIO_MAX}</span>}>
              <textarea id="bio" rows={3} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value.slice(0, BIO_MAX) })} className={`${inputCls} h-auto py-3 leading-relaxed`} />
            </Field>
          </Card>

          <Card className="flex flex-col gap-4">
            <h2 className="-mb-1 font-display text-lg font-extrabold uppercase">Your link</h2>
            <Field label="Handle" htmlFor="handle" error={!handleCheck.ok ? handleCheck.reason : null}>
              <div className="flex items-stretch border-[1.5px] border-line bg-white focus-within:border-ink">
                <span className="flex items-center pl-3.5 text-[16px] text-muted">straightfrom.co/</span>
                <input
                  id="handle"
                  value={f.handle}
                  onChange={(e) => setF({ ...f, handle: e.target.value.toLowerCase().replace(/\s/g, "") })}
                  maxLength={30}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-12 min-w-0 flex-1 bg-transparent pr-3 text-[16px] font-semibold outline-none"
                />
              </div>
            </Field>
            {handleChanged && handleCheck.ok && (
              <p className="flex gap-2.5 bg-[#fff4f3] px-3.5 py-3 text-[13px] leading-relaxed text-ink-2">
                <Icon name="alert" className="mt-0.5 size-4 shrink-0 text-accent" />
                Links with your old handle (straightfrom.co/{saved.handle}) will stop working. Update your bios after saving.
              </p>
            )}
          </Card>

          <Card className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-lg font-extrabold uppercase">Social links</h2>
              <p className="mt-1 text-[13px] text-muted">Shown on your page with their icons, so fans know it&apos;s really you.</p>
            </div>
            <SocialLinksEditor value={f.socialLinks} onChange={(socialLinks) => setF({ ...f, socialLinks })} />
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-extrabold uppercase">Payouts</h2>
            <p className="text-sm text-ink-2">
              {bankConnected ? "Bank connected. Payouts are on." : "No bank connected yet. Money you earn is held until you connect."}
            </p>
            <Link href="/dashboard/earnings" className="self-start text-sm font-semibold underline underline-offset-4">
              {bankConnected ? "View earnings" : "Connect your bank"}
            </Link>
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-extrabold uppercase">Account</h2>
            <p className="text-sm text-ink-2">Signed in as <b>{profile.email}</b>. We send sales, reminders and payout emails here.</p>
            <Btn variant="outline" size="sm" icon="logout" className="self-start" onClick={() => router.push("/login")}>Sign out</Btn>
          </Card>
        </div>

        <aside className="flex flex-col gap-3 lg:sticky lg:top-8">
          <p className="text-xs font-bold tracking-[0.08em] text-muted uppercase">Preview</p>
          <PagePreview handle={f.handle} displayName={f.displayName} bio={f.bio} avatarUrl={f.avatarUrl} socialLinks={cleanSocialLinks(f.socialLinks)} />
        </aside>
      </div>

      {/* Save bar */}
      <div
        className={`fixed inset-x-0 bottom-16 z-30 flex items-center justify-between gap-3 border-t border-line bg-white px-4 py-3 transition-transform md:bottom-0 md:left-[248px] md:px-10 ${
          dirty ? "translate-y-0" : "translate-y-[calc(100%+80px)]"
        }`}
      >
        <p className="text-sm text-muted">You have unsaved changes</p>
        <div className="flex gap-2">
          <Btn variant="ghost" size="sm" onClick={() => setF(saved)}>Discard</Btn>
          <Btn size="sm" onClick={save} disabled={!canSave}>Save changes</Btn>
        </div>
      </div>
    </>
  );
}
