import { days, SHIP_DEADLINE_DAYS } from "@/config";

/** Trust strip on the creator page: how buying from this creator works. */
export function HowItWorks({ first }: { first: string }) {
  const steps = [
    { t: `${first} ships it personally`, d: `Packed and sent by ${first}, with tracking emailed to you.` },
    { t: "You're protected", d: `If it doesn't ship within ${days(SHIP_DEADLINE_DAYS)}, you're refunded automatically.` },
    { t: "Secure checkout by Stripe", d: "Pay by card or Link. No account needed." },
  ];
  return (
    <section className="mx-auto max-w-[1240px] px-4 pb-3 md:px-10" aria-labelledby="how-h">
      <div className="grid gap-4 border-t-[1.5px] border-ink pt-5 md:grid-cols-[260px_1fr] md:gap-10 md:pt-6">
        <h2 id="how-h" className="font-display text-xl font-extrabold tracking-[-0.02em] uppercase">
          How buying from {first} works
        </h2>
        <ol className="grid gap-3.5 md:grid-cols-3 md:gap-8">
          {steps.map((s, i) => (
            <li key={s.t} className="grid grid-cols-[34px_1fr] items-start gap-3 text-sm leading-snug text-muted">
              <span className="grid size-[34px] place-items-center rounded-full bg-ink font-display text-[15px] font-extrabold text-white">{i + 1}</span>
              <div>
                <b className="block text-[15px] font-semibold text-ink">{s.t}</b>
                {s.d}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
