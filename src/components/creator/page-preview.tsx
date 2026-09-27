"use client";

/* eslint-disable @next/next/no-img-element -- previews can be local data: URLs */

import { socialList, type SocialLinks } from "@/lib/social";
import { Icon } from "../icons";
import { Underline } from "../scribbles";

/** A small, faithful preview of the top of the creator's public page. */
export function PagePreview({
  handle,
  displayName,
  bio,
  avatarUrl,
  socialLinks,
}: {
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  socialLinks: SocialLinks;
}) {
  const [firstWord, ...rest] = (displayName || "Your name").split(" ");
  const socials = socialList(socialLinks);
  return (
    <div className="overflow-hidden border-[1.5px] border-ink bg-white">
      <div className="flex items-center gap-2 border-b border-line bg-soft px-3 py-2 text-[11px] text-muted">
        <Icon name="lock" className="size-3" /> straightfrom.co/{handle || "yourname"}
      </div>
      <div className="relative p-4">
        <p className="-mb-0.5 inline-block -rotate-2 font-hand text-lg font-semibold text-accent">straight from ↓</p>
        <p className="pr-20 font-display text-[40px] leading-[0.84] font-extrabold tracking-[-0.05em] break-words uppercase">
          <span className="block">{firstWord}</span>
          {rest.length > 0 && (
            <span className="relative inline-block">
              {rest.join(" ")}
              <Underline className="absolute -bottom-[0.1em] left-0 h-[0.18em] w-full [stroke-width:3]" />
            </span>
          )}
        </p>
        <span className="absolute top-4 right-4 block size-16 rounded-full bg-accent p-[3px]">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="size-full rounded-full border-[3px] border-white object-cover" />
          ) : (
            <span className="block size-full rounded-full border-[3px] border-white bg-tile" />
          )}
        </span>
        <p className="mt-3 font-display text-sm font-extrabold">@{handle || "yourname"}</p>
        {bio && <p className="mt-1 text-[13px] leading-snug text-ink-2">{bio}</p>}
        {socials.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {socials.map((s) => (
              <span key={s.key} className="inline-flex h-8 items-center gap-1.5 border-[1.5px] border-ink px-2 text-[12px] font-semibold">
                <Icon name={s.icon} className="size-3.5" />
                {s.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="bg-accent py-1.5 text-center font-display text-[11px] font-extrabold tracking-wide text-white uppercase">
        Every piece really {firstWord}&apos;s ✦ Shipped by {firstWord}, personally
      </div>
    </div>
  );
}
