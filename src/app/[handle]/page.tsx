import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HowItWorks } from "@/components/how-it-works";
import { Icon, type IconName } from "@/components/icons";
import { ItemCard } from "@/components/item-card";
import { RingAvatar } from "@/components/ring-avatar";
import { ArrowDown, Underline } from "@/components/scribbles";
import { SiteFooter } from "@/components/site-footer";
import { Ticker } from "@/components/ticker";
import { TopBar } from "@/components/top-bar";
import { getCreator, getCreatorProducts } from "@/lib/data";
import { firstName, isSold } from "@/lib/format";
import type { SocialKey } from "@/lib/types";

const SOCIAL: Record<SocialKey, { label: string; icon: IconName }> = {
  youtube: { label: "YouTube", icon: "youtube" },
  instagram: { label: "Instagram", icon: "instagram" },
  tiktok: { label: "TikTok", icon: "tiktok" },
  twitch: { label: "Twitch", icon: "twitch" },
  x: { label: "X", icon: "x" },
};

export async function generateMetadata({ params }: PageProps<"/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const creator = await getCreator(handle);
  if (!creator) return { title: "Not found" };
  const products = await getCreatorProducts(creator.id);
  const cover = products.find((p) => !isSold(p))?.images[0] ?? creator.avatarUrl;
  return {
    title: `${creator.displayName} (@${creator.handle})`,
    description: `Own something that was really ${firstName(creator)}'s. ${creator.bio}`,
    openGraph: { title: `Straight from @${creator.handle}`, description: creator.bio, images: [cover] },
  };
}

export default async function CreatorPage({ params }: PageProps<"/[handle]">) {
  const { handle } = await params;
  const creator = await getCreator(handle);
  if (!creator) notFound();

  const products = await getCreatorProducts(creator.id);
  const available = products.filter((p) => !isSold(p));
  const sold = products.filter(isSold);
  const first = firstName(creator);
  const [firstWord, ...rest] = creator.displayName.split(" ");
  const socials = (Object.keys(creator.socialLinks) as SocialKey[]).filter((k) => creator.socialLinks[k]);

  return (
    <>
      <TopBar creator={creator} />
      <main className="flex-1">
        {/* Hero: who this is, in the first second */}
        <section className="relative mx-auto max-w-[1240px] px-4 pt-5 pb-6 md:grid md:grid-cols-[minmax(0,1fr)_360px] md:items-end md:gap-x-14 md:px-10 md:py-14">
          <div>
            <p className="mb-1.5 inline-flex origin-left -rotate-2 items-end gap-1 font-hand text-[25px] font-semibold text-accent md:text-[32px]">
              straight from
              <ArrowDown className="relative -mb-2.5 size-[30px] [stroke-width:2.2]" />
            </p>
            <h1 className="font-display text-[min(21.5vw,100px)] leading-[0.82] font-extrabold tracking-[-0.05em] uppercase md:text-[min(13vw,176px)]">
              <span className="block">{firstWord}</span>
              {rest.length > 0 && (
                <span className="relative inline-block">
                  {rest.join(" ")}
                  <Underline draw className="absolute -bottom-[0.1em] -left-[2%] h-[0.18em] w-[104%] [stroke-width:4] md:[stroke-width:5.5]" />
                </span>
              )}
            </h1>
          </div>
          <div>
            <RingAvatar
              src={creator.avatarUrl}
              alt={creator.displayName}
              size={82}
              className="absolute top-5 right-4 md:static md:mb-4 md:size-[132px]!"
            />
            <p className="mt-5 font-display text-lg font-extrabold tracking-[-0.02em] md:mt-0 md:text-[22px]">@{creator.handle}</p>
            <p className="mt-2 max-w-[480px] text-base leading-relaxed text-ink-2 md:text-[17px]">{creator.bio}</p>
            {socials.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {socials.map((k) => (
                  <a
                    key={k}
                    href={creator.socialLinks[k]}
                    className="inline-flex h-11 items-center gap-1.5 border-[1.5px] border-ink px-3 text-[13.5px] font-semibold hover:bg-ink hover:text-white md:px-4 md:text-sm"
                  >
                    <Icon name={SOCIAL[k].icon} className="size-[18px]" />
                    {SOCIAL[k].label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>

        <Ticker
          label={`${available.length} available, ${sold.length} owned by fans`}
          items={[
            `${available.length} ${available.length === 1 ? "piece" : "pieces"} available`,
            `${sold.length} now owned by fans`,
            `Every piece really ${first}'s`,
            `Shipped by ${first}, personally`,
          ]}
        />

        <section className="mx-auto max-w-[1240px] px-4 pt-9 pb-10 md:px-10 md:pt-14 md:pb-16" aria-labelledby="pieces-h">
          <h2 id="pieces-h" className="mb-5 flex items-start gap-1 font-display text-[46px] leading-[0.86] font-extrabold tracking-[-0.045em] uppercase md:text-[80px]">
            Own a piece<sup className="mt-[0.08em] text-[0.34em] leading-none tracking-normal text-accent">{available.length}</sup>
          </h2>
          {available.length ? (
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-8 md:grid-cols-4 md:gap-x-5 md:gap-y-12">
              {available.map((p, i) => (
                <ItemCard key={p.id} product={p} handle={creator.handle} feature={i === 0} index={i} />
              ))}
            </div>
          ) : (
            <p className="max-w-md font-serif text-2xl italic text-ink-2">
              Nothing up right now. Check back soon, {first} lists new pieces from time to time.
            </p>
          )}
        </section>

        <HowItWorks first={first} />

        {sold.length > 0 && (
          <section className="mx-auto max-w-[1240px] px-4 pt-9 pb-12 md:px-10 md:pt-14 md:pb-16" aria-labelledby="sold-h">
            <h2 id="sold-h" className="mb-5 flex items-start gap-1 font-display text-[34px] leading-[0.86] font-extrabold tracking-[-0.045em] uppercase md:text-[52px]">
              Owned by fans<sup className="mt-[0.08em] text-[0.34em] leading-none tracking-normal text-accent">{sold.length}</sup>
            </h2>
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-8 md:grid-cols-4 md:gap-x-5">
              {sold.map((p, i) => (
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
