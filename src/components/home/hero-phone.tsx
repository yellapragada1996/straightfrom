"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { creatorEarns } from "@/lib/fees";
import { money } from "@/lib/format";
import { creators, products } from "@/lib/mock-data";
import { Wordmark } from "../brand";
import { Icon } from "../icons";
import { ArrowDownLeft, Circle, Underline } from "../scribbles";

// The hero phone plays the whole product in ~10 seconds:
// creator page → tap a piece → its story → Buy → sold + "you made a sale".

type Phase = "page" | "tapItem" | "item" | "tapBuy" | "sold";
const TIMELINE: [Phase, number][] = [
  ["page", 2400],
  ["tapItem", 700],
  ["item", 2600],
  ["tapBuy", 600],
  ["sold", 3600],
];

const maya = creators.find((c) => c.handle === "mayaokafor")!;
const pieces = products.filter((p) => p.creatorId === maya.id && p.status === "available").slice(0, 4);
const jacket = pieces[0];

export function HeroPhone() {
  const [phase, setPhase] = useState<Phase>("page");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      i = (i + 1) % TIMELINE.length;
      setPhase(TIMELINE[i][0]);
      timer = setTimeout(next, TIMELINE[i][1]);
    };
    timer = setTimeout(next, TIMELINE[0][1]);
    return () => clearTimeout(timer);
  }, []);

  const onItem = phase === "item" || phase === "tapBuy" || phase === "sold";
  const sold = phase === "sold";

  return (
    <div className="relative mx-auto w-[288px] md:w-[320px]">
      {/* Handwritten note (desktop) */}
      <span className="absolute top-[46%] -left-[150px] z-10 hidden -rotate-[8deg] items-start gap-1 font-hand text-[26px] leading-tight font-semibold text-accent lg:flex">
        your page,
        <br />
        your story
        <ArrowDownLeft className="relative mt-7 size-10 -scale-x-100 [stroke-width:2.2]" />
      </span>

      {/* "You made a sale" push notification, drops in when it sells */}
      <div
        aria-hidden={!sold}
        className={`absolute top-3 left-1/2 z-30 w-[300px] -translate-x-1/2 transition-all duration-500 ease-out md:top-6 md:-left-[140px] md:w-[330px] md:translate-x-0 ${
          sold ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-4 opacity-0"
        }`}
      >
        <div className="flex items-center gap-3 rounded-[20px] bg-white/90 p-3 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.45)] ring-1 ring-black/5 backdrop-blur-xl">
          <span className="grid size-10 shrink-0 place-items-center rounded-[11px] bg-ink">
            <span className="flex items-baseline leading-none">
              <b className="font-display text-[17px] font-extrabold tracking-tight text-white">s</b>
              <i className="font-serif text-[20px] text-accent">f</i>
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between text-[11px] font-semibold tracking-wide text-muted uppercase">
              StraightFrom <span className="font-normal normal-case">now</span>
            </span>
            <span className="block text-[14px] leading-tight font-bold">You made a sale!</span>
            <span className="block truncate text-[12.5px] leading-snug text-ink-2">{jacket.title}</span>
            <span className="block text-[12px] leading-snug text-muted">
              Sold for {money(jacket.priceCents)} · <b className="font-semibold text-accent">you earn {money(creatorEarns(jacket.priceCents, jacket.shippingCents))}</b>
            </span>
          </span>
          <span className="relative size-10 shrink-0 overflow-hidden rounded-[9px] bg-tile">
            <Image src={jacket.images[0]} alt="" fill sizes="40px" className="object-cover" />
          </span>
        </div>
      </div>

      {/* Phone */}
      <div className="rounded-[46px] bg-ink p-2.5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)]" role="img" aria-label="A fan opens Maya's page, taps the rain jacket, reads its story and buys it. Maya gets a sale notification.">
        <div className="relative aspect-[9/18.5] overflow-hidden rounded-[37px] bg-white">
          {/* Screen 1: creator page */}
          <div className={`absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.3,0.7,0.2,1)] ${onItem ? "-translate-x-[30%]" : "translate-x-0"}`}>
            <PhoneBar />
            <div className="relative px-4 pt-3">
              <p className="-rotate-2 font-hand text-[15px] leading-none font-semibold text-accent">straight from ↓</p>
              <p className="mt-1 font-display text-[46px] leading-[0.82] font-extrabold tracking-[-0.05em] uppercase md:text-[52px]">
                <span className="block">Maya</span>
                <span className="relative inline-block">
                  Okafor
                  <Underline draw className="absolute -bottom-[0.1em] left-0 h-[0.18em] w-full [stroke-width:3]" />
                </span>
              </p>
              <span className="absolute top-3 right-4 block size-12 rounded-full bg-accent p-[2px]">
                <Image src={maya.avatarUrl} alt="" width={96} height={96} className="size-full rounded-full border-2 border-white object-cover" />
              </span>
              <p className="mt-2.5 font-display text-[11px] font-extrabold">@{maya.handle}</p>
              <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-ink-2">{maya.bio}</p>
            </div>
            <div className="mt-3 overflow-hidden bg-accent py-1.5 whitespace-nowrap text-white">
              <div className="inline-flex animate-ticker font-display text-[9px] font-extrabold tracking-wide uppercase">
                {Array.from({ length: 6 }).map((_, i) => (
                  <span key={i} className="px-2">5 pieces available ✦ Every piece really Maya&apos;s ✦</span>
                ))}
              </div>
            </div>
            <div className="px-4 pt-3">
              <p className="font-display text-[20px] leading-none font-extrabold tracking-[-0.04em] uppercase">Own a piece</p>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                {pieces.map((p, i) => (
                  <div key={p.id} className="relative">
                    <div className="relative aspect-[4/5] overflow-hidden bg-tile">
                      <Image src={p.images[0]} alt="" fill sizes="140px" className="object-cover" />
                      <span className="absolute bottom-0 left-0 bg-ink px-1.5 pt-1 pb-0.5 font-display text-[10px] leading-none font-extrabold text-white">
                        {money(p.priceCents)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-[9px] font-semibold">{p.title}</p>
                    {i === 0 && phase === "tapItem" && <Tap className="top-[38%] left-[48%]" />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Screen 2: item page, slides in from the right */}
          <div
            className={`absolute inset-0 bg-white shadow-[-12px_0_30px_-18px_rgba(0,0,0,0.4)] transition-transform duration-500 ease-[cubic-bezier(0.3,0.7,0.2,1)] ${
              onItem ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex h-10 items-center justify-between border-b border-line px-3 pt-1">
              <span className="flex items-center gap-1.5">
                <Icon name="back" className="size-3.5" />
                <span className="block size-5 rounded-full bg-accent p-[1.5px]">
                  <Image src={maya.avatarUrl} alt="" width={40} height={40} className="size-full rounded-full border border-white object-cover" />
                </span>
                <b className="font-display text-[11px] font-extrabold">@{maya.handle}</b>
              </span>
              <PhoneIcons />
            </div>
            <div className="relative aspect-square overflow-hidden bg-tile">
              <Image src={jacket.images[0]} alt="" fill sizes="320px" className={`object-cover transition-all duration-500 ${sold ? "opacity-45 grayscale" : ""}`} />
              {sold && (
                <span className="absolute bottom-3 left-3 z-[1] inline-block -rotate-[8deg] px-3 pt-0.5 pb-1.5 font-hand text-[26px] leading-none font-semibold text-accent">
                  <span className="absolute inset-0 rounded-[50%] bg-white/95" />
                  <span className="relative z-[1]">sold!</span>
                  <Circle draw className="absolute -inset-x-2 -inset-y-1 z-[1] h-[calc(100%+8px)] w-[calc(100%+16px)] [stroke-width:2.4]" />
                </span>
              )}
              <span className="absolute right-0 bottom-0 bg-ink px-2 pt-1 pb-0.5 font-display text-[10px] font-extrabold text-white">1/4</span>
            </div>
            <div className="flex flex-col gap-2 px-4 pt-3">
              <p className="text-[11px]">
                <i className="font-serif text-[1.15em] text-accent">straight from </i>
                <b className="font-display font-extrabold">@{maya.handle}</b>
              </p>
              <p className="font-display text-[23px] leading-[0.9] font-extrabold tracking-[-0.04em] uppercase">{jacket.title}</p>
              <div className="flex items-center gap-2.5">
                <span className={`font-display text-[28px] leading-none font-extrabold tracking-[-0.04em] ${sold ? "text-muted" : ""}`}>{money(jacket.priceCents)}</span>
                {!sold && (
                  <span className="relative -rotate-3 px-2 pb-0.5 font-hand text-[15px] leading-none font-semibold text-accent">
                    one of one
                    <Circle className="absolute -inset-x-1.5 -inset-y-1 h-[calc(100%+8px)] w-[calc(100%+12px)] [stroke-width:1.8]" />
                  </span>
                )}
              </div>
              <div className="relative">
                {sold ? (
                  <div className="flex h-10 items-center justify-between bg-ink px-3 text-white">
                    <span className="font-display text-[13px] font-extrabold uppercase">Sold<span className="text-accent">.</span></span>
                    <span className="text-[10px] text-[#cfcfcf]">A fan owns this one now</span>
                  </div>
                ) : (
                  <div className={`flex h-10 items-center justify-between bg-accent px-3 font-display text-[13px] font-extrabold text-white uppercase transition-transform ${phase === "tapBuy" ? "scale-[0.97]" : ""}`}>
                    <span>Buy now</span>
                    <span>{money(jacket.priceCents + jacket.shippingCents)}</span>
                  </div>
                )}
                {phase === "tapBuy" && <Tap className="top-1/2 left-[45%]" />}
              </div>
              <p className="line-clamp-3 font-serif text-[13px] leading-snug text-ink-2 italic">“{jacket.description}”</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhoneIcons() {
  return (
    <span className="flex gap-1">
      <span className="grid size-6 place-items-center border border-ink"><Icon name="share" className="size-3" /></span>
      <span className="grid size-6 place-items-center border border-ink"><Icon name="bag" className="size-3" /></span>
    </span>
  );
}

function PhoneBar() {
  return (
    <div className="flex h-10 items-center justify-between border-b border-line px-4 pt-1">
      <Wordmark className="text-[13px]" />
      <PhoneIcons />
    </div>
  );
}

/** A finger tap: a soft ring that pulses once. */
function Tap({ className }: { className: string }) {
  return (
    <span className={`pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 ${className}`} aria-hidden="true">
      <span className="block size-9 animate-tap rounded-full border-2 border-white bg-ink/35 shadow-[0_2px_10px_rgba(0,0,0,0.3)]" />
    </span>
  );
}
