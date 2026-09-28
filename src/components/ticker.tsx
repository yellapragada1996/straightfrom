export function Ticker({ items, label }: { items: string[]; label: string }) {
  const run = items.flatMap((t, i) => [
    <span key={`t${i}`} className="px-4">{t}</span>,
    <span key={`s${i}`} className="opacity-85">✦</span>,
  ]);
  return (
    <div className="overflow-hidden whitespace-nowrap bg-accent text-white" aria-label={label}>
      <div className="inline-flex animate-ticker py-3 font-display text-[15px] font-extrabold uppercase tracking-[0.01em]" aria-hidden="true">
        {run}{run}{run}{run}
      </div>
    </div>
  );
}
