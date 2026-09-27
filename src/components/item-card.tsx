import Image from "next/image";
import Link from "next/link";
import { firstSentence, isSold, money } from "@/lib/format";
import type { Product } from "@/lib/types";
import { ArrowDownLeft, SoldMark } from "./scribbles";

export function ItemCard({ product, handle, feature = false, index = 0 }: { product: Product; handle: string; feature?: boolean; index?: number }) {
  const sold = isSold(product);
  return (
    <Link
      href={`/${handle}/${product.slug}`}
      className={`group relative flex animate-rise flex-col gap-2.5 ${feature ? "col-span-2 mt-2 md:row-span-2" : ""}`}
      style={{ animationDelay: `${Math.min(index, 5) * 60}ms` }}
    >
      {feature && !sold && (
        <span className="absolute -top-[34px] right-1.5 z-[2] flex -rotate-[4deg] items-start gap-0.5 font-hand text-[26px] font-semibold text-accent md:-top-10 md:text-[30px]">
          just listed!
          <ArrowDownLeft className="relative mt-3 size-[34px] [stroke-width:2.2]" />
        </span>
      )}
      <div className="relative aspect-[4/5] overflow-hidden bg-tile">
        <Image
          src={product.images[0]}
          alt={product.title}
          fill
          sizes={feature ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 50vw"}
          className={`object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045] ${sold ? "opacity-40 grayscale" : ""}`}
        />
        {sold && <SoldMark className="top-3.5 left-3.5 text-[30px]" />}
        {!sold && product.quantity > 1 && (
          <span className="absolute top-3 right-3 z-[1] rotate-3 bg-white px-2 pt-0.5 pb-1 font-hand text-[22px] font-semibold leading-none text-accent">
            {product.quantity} left!
          </span>
        )}
        <span
          className={`absolute bottom-0 left-0 px-2.5 pt-2 pb-[7px] font-display leading-none font-extrabold tracking-[-0.02em] ${
            sold ? "bg-white text-muted" : "bg-ink text-white"
          } ${feature ? "px-4 pt-3 pb-2.5 text-[30px] md:text-[40px]" : "text-[17px]"}`}
        >
          {sold ? <s className="decoration-accent decoration-2">{money(product.priceCents)}</s> : money(product.priceCents)}
        </span>
      </div>
      <p
        className={`line-clamp-2 ${
          feature
            ? "font-display text-[30px] leading-[0.92] font-extrabold tracking-[-0.04em] uppercase md:text-[40px]"
            : "text-[15px] leading-snug font-semibold"
        } ${sold ? "text-muted" : ""}`}
      >
        {product.title}
      </p>
      {!sold && (
        <p className={`line-clamp-2 font-serif italic leading-tight text-ink-2 ${feature ? "text-[21px] md:text-2xl" : "text-[17px]"}`}>
          “{firstSentence(product.description)}”
        </p>
      )}
    </Link>
  );
}
