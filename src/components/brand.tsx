/** "straight" heavy + "from" in red italic serif. Size it with a text-* class. */
export function Wordmark({ className = "text-[22px]", onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <span className={`inline-flex items-baseline leading-none whitespace-nowrap ${className}`}>
      <b className={`font-display font-extrabold tracking-[-0.05em] ${onDark ? "text-white" : ""}`}>straight</b>
      <i className="font-serif text-[1.16em] tracking-[-0.01em] text-accent ml-[0.03em]">from</i>
    </span>
  );
}
