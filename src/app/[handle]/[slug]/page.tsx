import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BuyBox } from "@/components/buy-box";
import { ItemCard } from "@/components/item-card";
import { ItemGallery } from "@/components/item-gallery";
import { SiteFooter } from "@/components/site-footer";
import { TopBar } from "@/components/top-bar";
import { getCreator, getCreatorProducts, getProduct } from "@/lib/data";
import { firstName, isSold, money } from "@/lib/format";
import { SHIPS_TO } from "@/lib/mock-data";

async function load(params: PageProps<"/[handle]/[slug]">["params"]) {
  const { handle, slug } = await params;
  const creator = await getCreator(handle);
  if (!creator) return null;
  const product = await getProduct(creator.id, slug);
  return product ? { creator, product } : null;
}

export async function generateMetadata({ params }: PageProps<"/[handle]/[slug]">): Promise<Metadata> {
  const data = await load(params);
  if (!data) return { title: "Not found" };
  const { creator, product } = data;
  return {
    title: `${product.title} · straight from @${creator.handle}`,
    description: product.description,
    openGraph: {
      title: `${product.title} · ${money(product.priceCents)}`,
      description: `Straight from @${creator.handle}. ${product.description}`,
      images: [product.images[0]],
    },
  };
}

export default async function ItemPage({ params }: PageProps<"/[handle]/[slug]">) {
  const data = await load(params);
  if (!data) notFound();
  const { creator, product } = data;
  const first = firstName(creator);
  const more = (await getCreatorProducts(creator.id)).filter((p) => p.id !== product.id && !isSold(p)).slice(0, 4);

  const how = [
    { t: `${first} ships it personally`, d: "Straight from their place to yours." },
    { t: "Tracking in your inbox", d: "As soon as it's on its way." },
    { t: "Ships in 7 days or you're refunded", d: "Automatically. No need to ask." },
    { t: "Secure checkout by Stripe", d: "Card, Link and more. No account." },
  ];

  return (
    <>
      <TopBar creator={creator} back />
      <main className="flex-1">
        <div className="mx-auto grid max-w-[1240px] gap-6 px-4 pb-11 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-start md:gap-14 md:px-10 md:pt-8 md:pb-20">
          <ItemGallery images={product.images} title={product.title} sold={isSold(product)} />

          <div className="flex flex-col gap-5 md:sticky md:top-6">
            <div>
              <p className="flex flex-wrap items-baseline gap-1.5 text-[17px]">
                <i className="font-serif text-[1.2em] text-accent">straight from</i>
                <b className="font-display font-extrabold tracking-[-0.02em]">@{creator.handle}</b>
              </p>
              <h1 className="mt-2 font-display text-[44px] leading-[0.88] font-extrabold tracking-[-0.045em] uppercase md:text-[64px]">
                {product.title}
              </h1>
            </div>

            <BuyBox product={product} handle={creator.handle} first={first} shipsTo={SHIPS_TO.join(" & ").replace("United States", "US")} />

            <section className="flex flex-col gap-2.5 border-t-[1.5px] border-ink pt-4" aria-labelledby="story-h">
              <h2 id="story-h" className="text-xs font-bold tracking-[0.09em] uppercase">The story</h2>
              <span aria-hidden="true" className="-mb-2 h-11 font-serif text-[110px] leading-none text-accent">“</span>
              <blockquote className="font-serif text-[27px] leading-[1.18] italic md:text-[30px]">{product.description}</blockquote>
              <p className="mt-1 flex items-center gap-2.5">
                <Image src={creator.avatarUrl} alt="" width={52} height={52} className="size-[26px] rounded-full object-cover" />
                <span className="inline-block -rotate-3 font-hand text-[34px] font-medium">— {first}</span>
                <span className="text-[13px] text-muted">on this piece</span>
              </p>
            </section>

            <ul className="grid grid-cols-2 gap-x-4 gap-y-4 border-t-[1.5px] border-ink pt-4" aria-label="How buying works">
              {how.map((h, i) => (
                <li key={h.t} className="flex flex-col gap-1">
                  <span className="font-display text-[15px] font-extrabold text-accent">0{i + 1}</span>
                  <strong className="text-[15px] leading-tight font-semibold">{h.t}</strong>
                  <span className="text-[13px] leading-snug text-muted">{h.d}</span>
                </li>
              ))}
            </ul>

            <a
              href={`mailto:report@straightfrom.co?subject=${encodeURIComponent(`Report: straightfrom.co/${creator.handle}/${product.slug}`)}`}
              className="inline-flex min-h-11 items-center self-start text-[13px] text-muted underline underline-offset-4"
            >
              Report this item
            </a>
          </div>
        </div>

        {more.length > 0 && (
          <section className="mx-auto max-w-[1240px] px-4 pb-12 md:px-10 md:pb-16" aria-labelledby="more-h">
            <div className="mb-5 flex items-end justify-between gap-3">
              <h2 id="more-h" className="font-display text-[38px] leading-[0.86] font-extrabold tracking-[-0.045em] uppercase md:text-[64px]">
                More from {first}
              </h2>
              <a href={`/${creator.handle}`} className="text-sm font-semibold whitespace-nowrap underline underline-offset-4">See all</a>
            </div>
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-8 md:grid-cols-4 md:gap-x-5">
              {more.map((p, i) => (
                <ItemCard key={p.id} product={p} handle={creator.handle} index={i} />
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
