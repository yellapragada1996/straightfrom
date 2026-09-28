"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { creatorActions, useCreatorState, type Profile } from "@/lib/creator-store";
import { liveFeed } from "@/lib/live-feed";
import { Icon } from "../icons";
import { PagePreview } from "./page-preview";
import { AvatarPicker } from "./photo-uploader";
import { cleanSocialLinks, SocialLinksEditor } from "./social-links-editor";
import { Btn, Card, CopyButton, Field, inputCls, PageTitle, useToast } from "./ui";
import { BIO_MAX } from "@/config";


/** Order-independent comparison, so the save bar only appears after a real edit. */
const fingerprint = (p: Profile) =>
  JSON.stringify([p.handle, p.displayName.trim(), p.bio.trim(), p.avatarUrl, p.email, cleanSocialLinks(p.socialLinks)]);

export function SettingsView() {
  const s = useCreatorState();
  if (!s.profile) return null;
  return <SettingsForm profile={s.profile} bankConnected={s.bank.connected} feed={liveFeed(s.profile.displayName.split(" ")[0], s.products)} />;
}

function SettingsForm({ profile, bankConnected, feed }: { profile: Profile; bankConnected: boolean; feed: string[] }) {
  const toast = useToast();
  const router = useRouter();
  const [f, setF] = useState<Profile>(profile);
  const [saved, setSaved] = useState<Profile>(profile);
  const dirty = fingerprint(f) !== fingerprint(saved);
  const canSave = dirty && f.displayName.trim().length > 0;

  function save() {
    const next = { ...f, handle: saved.handle, displayName: f.displayName.trim(), bio: f.bio.trim(), socialLinks: cleanSocialLinks(f.socialLinks) };
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 truncate font-display text-xl font-extrabold tracking-tight">straightfrom.co/{saved.handle}</span>
              <CopyButton text={`https://straightfrom.co/${saved.handle}`} label="Copy link" />
            </div>
            <p className="flex items-center gap-2 text-[13px] text-muted">
              <Icon name="lock" className="size-4" /> Your link is permanent, so it keeps working everywhere you&apos;ve shared it.
            </p>
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
            <Btn variant="outline" size="sm" icon="logout" className="self-start" onClick={() => {
              creatorActions.signOut();
              router.push("/");
            }}>Sign out</Btn>
          </Card>
        </div>

        <aside className="flex flex-col gap-3 lg:sticky lg:top-8">
          <p className="text-xs font-bold tracking-[0.08em] text-muted uppercase">Preview</p>
          <PagePreview handle={f.handle} displayName={f.displayName} bio={f.bio} avatarUrl={f.avatarUrl} socialLinks={cleanSocialLinks(f.socialLinks)} feed={feed} />
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
