"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { SoldMark } from "./scribbles";

/** Swipeable photos with a counter and thumbnails (thumbnails sit left on desktop). */
export function ItemGallery({ images, title, sold }: { images: string[]; title: string; sold: boolean }) {
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const many = images.length > 1;

  const onScroll = () => {
    const el = track.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };
  const go = (i: number) => {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="-mx-4 flex flex-col gap-2 md:mx-0 md:flex-row-reverse md:items-start md:gap-3">
      <div className="relative min-w-0 flex-1">
        <div
          ref={track}
          onScroll={onScroll}
          tabIndex={0}
          aria-label={`Photos of ${title}`}
          className="no-scrollbar flex aspect-[4/5] snap-x snap-mandatory overflow-x-auto bg-tile"
        >
          {images.map((src, i) => (
            <div key={src} className="relative h-full w-full shrink-0 snap-start">
              <Image
                src={src}
                alt={`${title}, photo ${i + 1}`}
                fill
                priority={i === 0}
                sizes="(min-width: 768px) 55vw, 100vw"
                className={`object-cover ${sold ? "opacity-45 grayscale" : ""}`}
              />
            </div>
          ))}
        </div>
        {sold && <SoldMark draw className="top-5 left-5 text-[40px]" />}
        {many && (
          <span className="absolute right-0 bottom-0 bg-ink px-3 pt-2 pb-[7px] font-display text-sm leading-none font-extrabold text-white">
            {index + 1}/{images.length}
          </span>
        )}
      </div>
      {many && (
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 md:flex-col md:overflow-visible md:px-0">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
              className={`relative aspect-[4/5] w-[58px] shrink-0 overflow-hidden border-2 transition-opacity md:w-[76px] ${
                i === index ? "border-ink opacity-100" : "border-transparent opacity-55"
              }`}
            >
              <Image src={src} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
