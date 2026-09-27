import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { ClosingSignIn, HeroCta, HomeHeaderActions } from "@/components/home/home-actions";
import { HeroPhone } from "@/components/home/hero-phone";
import { Icon, type IconName } from "@/components/icons";
import { ItemCard } from "@/components/item-card";
import { ArrowDown, Underline } from "@/components/scribbles";
import { SiteFooter } from "@/components/site-footer";
import { Ticker } from "@/components/ticker";
import { creators, products } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: { absolute: "StraightFrom · Your stuff has fans." },
  description:
    "The closest a fan can get is owning something that was yours. Put your things on one page and share it with the people who care most.",
  openGraph: {
    title: "Your stuff has fans.",
    description: "The closest a fan can get is owning something that was yours.",
  },
};

const handleOf = (creatorId: string) => creators.find((c) => c.id === creatorId)!.handle;
const EXAMPLES = ["p_theo_headset", "p_tokyo_polaroid", "p_theo_mic", "p_rain_jacket"].map((id) => products.find((p) => p.id === id)!);

const wrap = "mx-auto w-full max-w-[1240px] px-4 md:px-10";
const h2 = "font-display text-[44px] leading-[0.86] font-extrabold tracking-[-0.045em] uppercase md:text-[84px]";

export default function Home() {
  return (
    <>
      <HomeHeader />
      <main className="flex-1">
        <Hero />
        <Ticker
          label="Pieces creators have listed"
          items={[
            "The headset from 1,000 streams",
            "The camera from the travel series",
            "The mic from the charity stream",
            "Polaroids from the last night in Tokyo",
            "The chair from every stream",
          ]}
        />
        <Pieces />
        <HowItWorks />
        <YourPage />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter compact />
    </>
  );
}

function HomeHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
      <div className={`${wrap} flex h-[62px] items-center justify-between gap-4`}>
        <Link href="/" aria-label="StraightFrom home">
          <Wordmark className="text-[20px] md:text-[23px]" />
        </Link>
        <nav className="hidden items-center gap-7 text-[15px] font-semibold md:flex" aria-label="Main">
          <a href="#pieces" className="hover:text-accent">Examples</a>
          <a href="#how" className="hover:text-accent">How it works</a>
          <a href="#faq" className="hover:text-accent">FAQ</a>
        </nav>
        <HomeHeaderActions />
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className={`${wrap} grid grid-cols-[minmax(0,1fr)] items-center gap-12 pt-8 pb-14 md:pt-16 md:pb-24 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)] lg:gap-12`}>
      <div>
        <p className="inline-flex origin-left -rotate-2 items-end gap-1 font-hand text-[26px] font-semibold text-accent md:text-[32px]">
          for creators
          <ArrowDown className="relative -mb-2.5 size-[30px] [stroke-width:2.2]" />
        </p>
        <h1 className="mt-1 font-display text-[min(15.5vw,96px)] leading-[0.82] font-extrabold tracking-[-0.05em] uppercase md:text-[120px] lg:text-[clamp(84px,7.4vw,120px)]">
          <span className="block whitespace-nowrap">Your stuff</span>
          <span className="block whitespace-nowrap">
            has{" "}
            <span className="relative inline-block text-accent">
              fans.
              <Underline draw className="absolute -bottom-[0.06em] left-0 h-[0.14em] w-full [stroke-width:4] md:[stroke-width:6]" />
            </span>
          </span>
        </h1>
        <p className="mt-7 max-w-[540px] text-[17px] leading-relaxed text-ink-2 md:text-[19px]">
          The closest a fan can get is owning something that was yours. Put your things on one page and share it with the people who care most.
        </p>
        <div className="mt-8">
          <HeroCta />
        </div>
      </div>
      <HeroPhone />
    </section>
  );
}

function Pieces() {
  return (
    <section id="pieces" className={`${wrap} scroll-mt-16 py-16 md:py-28`} aria-labelledby="pieces-h">
      <h2 id="pieces-h" className={`${h2} max-w-[1000px]`}>
        Your fans want something that was{" "}
        <span className="relative inline-block">
          yours.
          <Underline className="absolute -bottom-[0.08em] left-0 h-[0.14em] w-full [stroke-width:4]" />
        </span>
      </h2>
      <p className="mt-8 max-w-[680px] font-serif text-[26px] leading-snug italic text-ink-2 md:text-[32px]">
        Something you owned, used, loved. For a fan, that&apos;s worth more than anything with your name printed on it.
      </p>

      <div className="mt-12 grid grid-cols-2 gap-x-2.5 gap-y-8 md:grid-cols-4 md:gap-x-5">
        {EXAMPLES.map((p, i) => (
          <ItemCard key={p.id} product={p} handle={handleOf(p.creatorId)} index={i} />
        ))}
      </div>
      <p className="mt-4 text-[13px] text-muted">Examples from sample creator pages. Tap one to see the full page.</p>
    </section>
  );
}

function HowItWorks() {
  const steps: { t: string; d: string; demo: React.ReactNode }[] = [
    {
      t: "Claim your page",
      d: "Pick your link, add your photo and your socials. You're live in two minutes.",
      demo: (
        <div className="flex items-center gap-1 border-[1.5px] border-ink bg-white px-3 py-2.5 text-sm">
          <span className="text-muted">straightfrom.co/</span>
          <b>yourname</b>
          <Icon name="check" className="ml-auto size-4 text-[#1f9d4c]" />
        </div>
      ),
    },
    {
      t: "List a piece",
      d: "A few photos, the story behind it, a price. That's your listing.",
      demo: (
        <div className="flex items-center justify-between gap-2 border-[1.5px] border-ink bg-white px-3 py-2.5 text-[13px]">
          <span className="truncate"><b>The mic from the charity stream</b></span>
          <span className="shrink-0 bg-[#eaf6ec] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-[#1f7a3a] uppercase">Live</span>
        </div>
      ),
    },
    {
      t: "Share your link",
      d: "Put it in your bio, your stories, your video descriptions. Fans tap, fall for something, buy it in a few taps.",
      demo: (
        <div className="flex items-center gap-2 border-[1.5px] border-ink bg-white px-3 py-2.5 text-[13px]">
          <Icon name="instagram" className="size-4" />
          <span className="truncate">
            <b>mayaokafor</b> · travel vlogs ·{" "}
            <span className="text-accent">straightfrom.co/mayaokafor</span>
          </span>
        </div>
      ),
    },
    {
      t: "Ship it, get paid",
      d: "Pack it up, send it off, add the tracking number. Your fan gets it straight from you, and you get paid.",
      demo: (
        <div className="flex items-center justify-between gap-2 border-[1.5px] border-ink bg-white px-3 py-2.5 text-[13px]">
          <span><b>USPS</b> · 9400 1112…</span>
          <span className="bg-[#eaf6ec] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-[#1f7a3a] uppercase">Paid</span>
        </div>
      ),
    },
  ];

  return (
    <section id="how" className="scroll-mt-16 bg-soft py-16 md:py-28" aria-labelledby="how-h">
      <div className={wrap}>
        <h2 id="how-h" className={h2}>How it works</h2>
        <ol className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-px border border-line bg-line md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.t} className="flex flex-col gap-4 bg-white p-6">
              <span className="font-display text-[64px] leading-none font-extrabold tracking-[-0.05em] text-accent">{i + 1}</span>
              <div>
                <h3 className="font-display text-2xl leading-none font-extrabold tracking-tight uppercase">{s.t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{s.d}</p>
              </div>
              <div className="mt-auto pt-2">{s.demo}</div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function YourPage() {
  const points: { i: IconName; t: string; d: string }[] = [
    { i: "user", t: "Looks like you", d: "Your name, big. Your photo, your socials. A page that feels like yours, not a store." },
    { i: "star", t: "Every piece has its story", d: "Tell fans where it's been and what it meant. That's the part they'll remember." },
    { i: "share", t: "One link for everything", d: "Bio, stories, video descriptions. It looks great every time someone shares it." },
    { i: "bag", t: "Fans buy in a few taps", d: "Straight from Instagram or TikTok, on their phone, in seconds." },
    { i: "mail", t: "Know the moment it sells", d: "You get the ping, and your fan gets something of yours." },
  ];
  return (
    <section className={`${wrap} py-16 md:py-28`} aria-labelledby="page-h">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <h2 id="page-h" className={h2}>
          Your page,
          <br />
          your{" "}
          <span className="relative inline-block text-accent">
            way.
            <Underline className="absolute -bottom-[0.08em] left-0 h-[0.14em] w-full [stroke-width:4]" />
          </span>
        </h2>
        <ul className="grid gap-7 sm:grid-cols-2">
          {points.map((x) => (
            <li key={x.t} className="grid grid-cols-[40px_1fr] gap-3.5">
              <span className="grid size-10 place-items-center rounded-full bg-ink text-white"><Icon name={x.i} className="size-[19px]" /></span>
              <div>
                <h3 className="text-[17px] font-bold">{x.t}</h3>
                <p className="mt-1 text-[15px] leading-snug text-muted">{x.d}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}


const FAQ: { q: string; a: string }[] = [
  { q: "What can I sell?", a: "Anything you've personally owned or used that your fans would love to have: gear, cameras, mics, props, things from your desk or your room, clothes, signed bits. If it has a story, even better." },
  { q: "How do fans find my page?", a: "Through your link. Put straightfrom.co/yourname in your bio, your stories and your video descriptions, and mention it when you list something new." },
  { q: "Who ships it?", a: "You do, however you like. When something sells you get an email with where to send it. Add the tracking number and your fan gets it straight away." },
  { q: "Is it free to start?", a: "Yes. Creating your page and listing your things is free. We only earn when you sell." },
  { q: "How do I get paid?", a: "Through Stripe, straight to your bank, shortly after you ship." },
];

function Faq() {
  return (
    <section id="faq" className="scroll-mt-16 border-t border-line py-16 md:py-28" aria-labelledby="faq-h">
      <div className={`${wrap} grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16`}>
        <div>
          <h2 id="faq-h" className={h2}>Questions</h2>
          <p className="mt-4 text-[15px] text-muted">
            Anything else? Email <a href="mailto:hello@straightfrom.co" className="text-ink underline underline-offset-4">hello@straightfrom.co</a>
          </p>
        </div>
        <div className="border-t-[1.5px] border-ink">
          {FAQ.map((f) => (
            <details key={f.q} className="group border-b border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[17px] font-semibold md:text-[19px] [&::-webkit-details-marker]:hidden">
                {f.q}
                <Icon name="plus" className="size-5 shrink-0 transition-transform group-open:rotate-45" />
              </summary>
              <p className="-mt-1 pr-8 pb-5 text-[15.5px] leading-relaxed text-ink-2">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-ink py-16 text-white md:py-28">
      <div className={`${wrap} flex flex-col items-start gap-6`}>
        <h2 className=" max-w-4xl font-display text-[48px] leading-[0.86] font-extrabold tracking-[-0.045em] uppercase md:text-[104px]">
          Your fans are already asking.
        </h2>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <HeroCta />
          <ClosingSignIn />
        </div>
        <p className="text-[14px] text-[#9a9a9a]">
          Here for a creator? Tap the link in their bio to see their page.
        </p>
      </div>
    </section>
  );
}

