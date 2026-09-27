import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { ClaimForm } from "@/components/home/claim-form";
import { HeroPhone } from "@/components/home/hero-phone";
import { Icon, type IconName } from "@/components/icons";
import { ItemCard } from "@/components/item-card";
import { ArrowDown, Circled, Underline } from "@/components/scribbles";
import { SiteFooter } from "@/components/site-footer";
import { Ticker } from "@/components/ticker";
import { creatorEarns, feePercent } from "@/lib/fees";
import { money } from "@/lib/format";
import { creators, products } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: { absolute: "StraightFrom · Your stuff has fans." },
  description:
    "The mic, the camera, the props, the things fans spot in every video. Sell them straight to the people who watched. Free to start.",
  openGraph: {
    title: "Your stuff has fans.",
    description: "Creators sell their personal items straight to their fans. Free to start.",
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
        <Ticker label="Not merch. Not resale. The real thing." items={["Not merch", "Not resale", "The real thing", "Straight from you"]} />
        <RealThing />
        <HowItWorks />
        <Trust />
        <Fees />
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
          <a href="#how" className="hover:text-accent">How it works</a>
          <a href="#fees" className="hover:text-accent">Fees</a>
          <a href="#faq" className="hover:text-accent">FAQ</a>
        </nav>
        <div className="flex items-center gap-1 md:gap-2">
          <Link href="/login" className="inline-flex h-10 items-center px-2 text-[14px] font-semibold whitespace-nowrap hover:underline md:px-3 md:text-[15px]">Sign in</Link>
          <a href="#claim" className="inline-flex h-10 items-center bg-ink px-3 text-[13px] font-semibold whitespace-nowrap text-white hover:bg-ink-2 md:px-4 md:text-[14px]">
            <span className="md:hidden">Start free</span>
            <span className="hidden md:inline">Claim your page</span>
          </a>
        </div>
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
          The mic, the camera, the props, the things fans spot in every video. Sell them straight to the people who watched. Your page is live in 2 minutes.
        </p>
        <div className="mt-7 scroll-mt-24" id="claim">
          <ClaimForm />
        </div>
        <ul className="mt-1 flex flex-wrap gap-x-5 gap-y-2 text-[13.5px] text-muted">
          {["Free to start", "No approval wait", "You only pay when you sell"].map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <Icon name="check" className="size-4 text-accent" /> {t}
            </li>
          ))}
        </ul>
      </div>
      <HeroPhone />
    </section>
  );
}

function RealThing() {
  return (
    <section className={`${wrap} py-16 md:py-28`} aria-labelledby="real-h">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
        <h2 id="real-h" className={h2}>
          Not merch.
          <br />
          The{" "}
          <span className="relative inline-block">
            real
            <Underline className="absolute -bottom-[0.08em] left-0 h-[0.14em] w-full [stroke-width:4]" />
          </span>{" "}
          thing.
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-line bg-soft p-5">
            <p className="text-xs font-bold tracking-[0.09em] text-muted uppercase">Merch</p>
            <ul className="mt-3 flex flex-col gap-2 text-[15px] text-muted">
              <li>Made for fans</li>
              <li>Thousands of copies</li>
              <li>Printed on demand</li>
            </ul>
          </div>
          <div className="border-[1.5px] border-accent bg-white p-5">
            <p className="text-xs font-bold tracking-[0.09em] text-accent uppercase">StraightFrom</p>
            <ul className="mt-3 flex flex-col gap-2 text-[15px] font-semibold">
              <li>Was really yours</li>
              <li>One of one</li>
              <li>Comes with its story</li>
            </ul>
          </div>
        </div>
      </div>

      <p className="mt-14 max-w-[640px] font-serif text-[26px] leading-snug italic text-ink-2 md:text-[32px]">
        The headset from a thousand streams. The camera behind the travel films. The prop from that one sketch. Fans don&apos;t want another thing with your name printed on it. They want the real one.
      </p>

      <div className="mt-10 grid grid-cols-2 gap-x-2.5 gap-y-8 md:grid-cols-4 md:gap-x-5">
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
      d: "Pick your link, add your photo and socials. Two minutes, no approval wait.",
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
      d: "A few photos, the story behind it, a price. Shipping is pre-filled for you.",
      demo: (
        <div className="border-[1.5px] border-ink bg-white px-3 py-2.5">
          <p className="text-[10px] font-bold tracking-[0.09em] text-muted uppercase">You&apos;ll earn</p>
          <p className="font-display text-2xl leading-none font-extrabold">$168</p>
          <p className="mt-1 text-[11px] text-muted">$180 − {feePercent} fee + $15 shipping</p>
        </div>
      ),
    },
    {
      t: "Share your link",
      d: "Put it in your bio, your stories, your video descriptions. Fans tap and buy. No app, no account.",
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
      d: "Pack it, add the tracking number. The money lands in your bank 7 days later.",
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
        <p className="inline-block -rotate-2 font-hand text-[28px] font-semibold text-accent">it&apos;s this simple</p>
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

function Trust() {
  const forYou: { i: IconName; t: string; d: string }[] = [
    { i: "mail", t: "Fans can't message you", d: "No DMs, no inbox. Fans only hear from you through order emails." },
    { i: "lock", t: "Addresses stay private", d: "You see a fan's address only to ship their order. Nobody sees yours." },
    { i: "check", t: "No approval wait", d: "Your page is live the moment you create it." },
    { i: "box", t: "No inventory, no warehouse", d: "It's your stuff, in your home. You ship it when it sells." },
    { i: "star", t: "Your call, always", d: "You choose what to list, what to charge and what shipping costs." },
    { i: "eye", t: "Sold stays on your page", d: "Sold pieces keep their spot with a sold mark, so fans see your stuff really goes." },
  ];
  const forFans = [
    "Secure checkout by Stripe",
    "No account or app needed",
    "Tracking emailed as soon as it ships",
    "Automatic refund if it doesn't ship in 7 days",
  ];
  return (
    <section className={`${wrap} py-16 md:py-28`} aria-labelledby="trust-h">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <h2 id="trust-h" className={h2}>
            Built so you don&apos;t have to <Circled className="text-[0.6em] tracking-normal normal-case">worry</Circled>
          </h2>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2">
            {forYou.map((x) => (
              <li key={x.t} className="grid grid-cols-[36px_1fr] gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-ink text-white"><Icon name={x.i} className="size-[18px]" /></span>
                <div>
                  <h3 className="text-[16px] font-bold">{x.t}</h3>
                  <p className="mt-0.5 text-[14.5px] leading-snug text-muted">{x.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="self-start bg-ink p-7 text-white md:p-9">
          <p className="inline-block -rotate-2 font-hand text-[26px] font-semibold text-accent">and your fans?</p>
          <h3 className="mt-1 font-display text-[36px] leading-[0.9] font-extrabold tracking-[-0.04em] uppercase md:text-[44px]">They&apos;re protected too</h3>
          <ul className="mt-6 flex flex-col gap-3.5">
            {forFans.map((t) => (
              <li key={t} className="flex items-start gap-3 text-[16px]">
                <Icon name="shield" className="mt-0.5 size-5 text-accent" /> {t}
              </li>
            ))}
          </ul>
          <p className="mt-6 border-t border-[#2a2a2a] pt-4 text-[14px] leading-relaxed text-[#bdbdbd]">
            Every piece says <i className="font-serif text-[1.1em] text-white">straight from</i> your handle, and links back to your socials, so fans know it&apos;s really you.
          </p>
        </div>
      </div>
    </section>
  );
}

function Fees() {
  return (
    <section id="fees" className="scroll-mt-16 border-y border-line bg-soft py-16 md:py-28" aria-labelledby="fees-h">
      <div className={`${wrap} grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-2 lg:items-end lg:gap-16`}>
        <div>
          <p className="inline-block -rotate-2 font-hand text-[28px] font-semibold text-accent">no surprises</p>
          <h2 id="fees-h" className={h2}>
            Free to start.
            <br />
            <span className="text-accent">{feePercent}</span> when you sell.
          </h2>
        </div>
        <div>
          <ul className="flex flex-col gap-3 text-[16px]">
            {[
              `We keep ${feePercent} of the item price. That's it.`,
              "You keep 100% of the shipping you charge.",
              "No monthly fee. No listing fee. No setup fee.",
              "Paid to your bank 7 days after you ship.",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <Icon name="check" className="mt-0.5 size-5 text-accent" /> {t}
              </li>
            ))}
          </ul>
          <p className="mt-6 border-t border-line pt-4 text-[15px] text-ink-2">
            <b className="text-ink">Example:</b> list something for $180 with $15 shipping, and you earn{" "}
            <b className="font-display text-lg text-accent">{money(creatorEarns(18000, 1500))}</b>.
          </p>
        </div>
      </div>
    </section>
  );
}


const FAQ: { q: string; a: string }[] = [
  { q: "What can I sell?", a: "Things you've personally owned or used: your gear, cameras and mics, props, things from your desk or set, clothes from your videos, signed bits. If fans would recognise it, even better. No mass-produced merch or new stock." },
  { q: "Is this a merch platform?", a: "No. Merch is made for fans. StraightFrom is for things that were really yours, usually one of one, with the story of where they've been." },
  { q: "Do I need a bank account to start?", a: "No. Create your page and list pieces first. We'll ask you to connect your bank (through Stripe, about 5 minutes) after your first sale. Your money waits safely until then." },
  { q: "Who ships the items?", a: "You do, however you like. When something sells you get an email with the fan's address. Ship it and add the tracking number; the fan is emailed straight away." },
  { q: "How much does it cost?", a: `Nothing to start and no monthly fee. We keep ${feePercent} of the item price when something sells. You keep all of the shipping you charge.` },
  { q: "When do I get paid?", a: "7 days after you add tracking, straight to your bank through Stripe." },
  { q: "What if I can't ship in time?", a: "You have 7 days to ship. If an order isn't shipped by then, the fan is refunded automatically and the piece is hidden until you re-list it." },
  { q: "Can fans contact me?", a: "No. There's no messaging on StraightFrom. Fans only receive order and shipping emails, and they never see your address." },
  { q: "Where can fans buy from?", a: "The United States and Canada at launch." },
  { q: "Do I need to be approved?", a: "No. Your page goes live as soon as you create it. You need to be 18 or older." },
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
        <p className="inline-block -rotate-2 font-hand text-[30px] font-semibold text-accent">go on…</p>
        <h2 className="-mt-3 max-w-4xl font-display text-[48px] leading-[0.86] font-extrabold tracking-[-0.045em] uppercase md:text-[104px]">
          Your fans are already asking.
        </h2>
        <ClaimForm dark />
        <p className="text-[14px] text-[#9a9a9a]">
          Here for a creator? Tap the link in their bio to see their page.
        </p>
      </div>
    </section>
  );
}
