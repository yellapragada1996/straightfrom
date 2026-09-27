import Image from "next/image";
import { creators, products } from "@/lib/mock-data";
import { money } from "@/lib/format";
import { Wordmark } from "../brand";
import { ArrowDownLeft, Underline } from "../scribbles";

/** A phone showing a real creator page, with a "new sale" notification popping in. */
export function HeroPhone() {
  const maya = creators[0];
  const items = products.filter((p) => p.creatorId === maya.id && p.status === "available").slice(0, 4);
  const jacket = items[0];

  return (
    <div className="relative mx-auto w-[280px] md:w-[320px]">
      {/* Handwritten note pointing at the phone (desktop) */}
      <span className="absolute top-[38%] -left-[150px] z-10 hidden -rotate-[8deg] items-start gap-1 font-hand text-[26px] font-semibold text-accent lg:flex">
        your page,
        <br />
        your story
        <ArrowDownLeft className="relative mt-6 size-10 -scale-x-100 [stroke-width:2.2]" />
      </span>

      {/* New-sale notification */}
      <div
        className="absolute top-[7%] -left-4 z-20 flex w-[250px] animate-pop items-center gap-3 border-[1.5px] border-ink bg-white p-2.5 shadow-[6px_6px_0_0_#0d0d0d] md:-left-24 md:w-[270px]"
        style={{ animationDelay: "1.1s" }}
      >
        <span className="relative aspect-[4/5] w-11 shrink-0 overflow-hidden bg-tile">
          <Image src={jacket.images[0]} alt="" fill sizes="48px" className="object-cover" />
        </span>
        <span className="min-w-0">
          <span className="block text-[10px] font-bold tracking-[0.1em] text-accent uppercase">New sale</span>
          <span className="block truncate text-[13px] leading-snug font-semibold">{jacket.title}</span>
          <span className="block text-[12px] text-muted">{money(jacket.priceCents)} · to Priya in Toronto</span>
        </span>
      </div>

      {/* Phone */}
      <div className="rounded-[46px] bg-ink p-2.5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)]">
        <div className="relative aspect-[9/18.5] overflow-hidden rounded-[37px] bg-white">
          <div className="flex h-10 items-center justify-between border-b border-line px-4 pt-1">
            <Wordmark className="text-[13px]" />
            <span className="flex gap-1">
              <span className="size-5 border border-ink" />
              <span className="size-5 border border-ink" />
            </span>
          </div>

          <div className="relative px-4 pt-3">
            <p className="font-hand text-[15px] leading-none font-semibold text-accent -rotate-2">straight from ↓</p>
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
              {items.map((p) => (
                <div key={p.id}>
                  <div className="relative aspect-[4/5] overflow-hidden bg-tile">
                    <Image src={p.images[0]} alt="" fill sizes="140px" className="object-cover" />
                    <span className="absolute bottom-0 left-0 bg-ink px-1.5 pt-1 pb-0.5 font-display text-[10px] leading-none font-extrabold text-white">
                      {money(p.priceCents)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-[9px] font-semibold">{p.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
