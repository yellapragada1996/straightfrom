"use client";

import { useState } from "react";
import { creatorEarns, feePercent, platformFee } from "@/lib/fees";
import { money } from "@/lib/format";

export function EarningsCalculator() {
  const [price, setPrice] = useState(180);
  const [shipping, setShipping] = useState(15);
  const p = price * 100;
  const s = shipping * 100;

  return (
    <div className="border-[1.5px] border-ink bg-white p-5 md:p-7">
      <p className="text-xs font-bold tracking-[0.09em] text-muted uppercase">Try it</p>

      <label className="mt-4 block">
        <span className="flex items-baseline justify-between">
          <span className="text-sm font-semibold">You list it for</span>
          <span className="font-display text-3xl font-extrabold tabular-nums">{money(p)}</span>
        </span>
        <input
          type="range"
          min={10}
          max={1000}
          step={5}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className="mt-3 w-full accent-[#e0201b]"
        />
      </label>

      <label className="mt-4 block">
        <span className="flex items-baseline justify-between">
          <span className="text-sm font-semibold">Shipping you charge</span>
          <span className="font-display text-xl font-extrabold tabular-nums">{money(s)}</span>
        </span>
        <input
          type="range"
          min={0}
          max={60}
          step={1}
          value={shipping}
          onChange={(e) => setShipping(Number(e.target.value))}
          className="mt-3 w-full accent-[#e0201b]"
        />
      </label>

      <dl className="mt-5 flex flex-col gap-2 border-t border-line pt-4 text-[15px]">
        <div className="flex justify-between"><dt className="text-ink-2">Fan pays</dt><dd className="tabular-nums">{money(p + s)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-2">StraightFrom fee ({feePercent} of the price)</dt><dd className="tabular-nums">−{money(platformFee(p))}</dd></div>
        <div className="mt-2 flex items-end justify-between border-t border-line pt-3">
          <dt className="font-bold">You earn</dt>
          <dd className="font-display text-[44px] leading-none font-extrabold tracking-tight text-accent tabular-nums">{money(creatorEarns(p, s))}</dd>
        </div>
      </dl>
    </div>
  );
}
