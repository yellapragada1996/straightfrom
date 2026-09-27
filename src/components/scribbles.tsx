// Hand-drawn marks in the creator's red "pen". Used sparingly: they add
// character, the clean layout around them carries the trust.

type P = { className?: string; draw?: boolean; late?: boolean };
const cls = ({ className = "", draw, late }: P) => `scribble ${draw ? "scribble-draw" : ""} ${late ? "late" : ""} ${className}`;

export function Underline(p: P) {
  return (
    <svg className={cls(p)} viewBox="0 0 300 14" preserveAspectRatio="none" aria-hidden="true">
      <path pathLength={1} d="M3 9 C 50 3, 110 4, 160 6 S 250 11, 297 4" />
    </svg>
  );
}

export function Circle(p: P) {
  return (
    <svg className={cls(p)} viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden="true">
      <path pathLength={1} d="M172 8 C 90 2, 8 12, 8 36 C 8 60, 100 67, 170 63 C 250 58, 294 46, 292 28 C 290 8, 220 2, 118 13" />
    </svg>
  );
}

export function ArrowDown(p: P) {
  return (
    <svg className={cls(p)} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M6 5 C 20 8, 30 18, 28 34" />
      <path d="M20 27 L 28 35 L 34 26" />
    </svg>
  );
}

export function ArrowDownLeft(p: P) {
  return (
    <svg className={cls(p)} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M34 4 C 30 18, 20 28, 6 32" />
      <path d="M8 22 L 5 32 L 15 36" />
    </svg>
  );
}

/** Handwritten red note with a hand-drawn circle around it. */
export function Circled({ children, className = "text-2xl" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`relative inline-block px-2.5 pt-0.5 pb-1 font-hand font-semibold leading-none text-accent -rotate-3 ${className}`}>
      {children}
      <Circle draw late className="absolute -inset-x-2 -inset-y-1.5 h-[calc(100%+12px)] w-[calc(100%+16px)] [stroke-width:2.2]" />
    </span>
  );
}

/** "sold!" circled, on a soft white patch so it reads on any photo. */
export function SoldMark({ className = "text-3xl", draw = false }: { className?: string; draw?: boolean }) {
  return (
    <span className={`absolute z-[1] inline-block px-3.5 pt-1 pb-2 font-hand font-semibold leading-none text-accent -rotate-[8deg] ${className}`}>
      <span className="absolute inset-0 rounded-[50%] bg-white/95" />
      <span className="relative z-[1]">sold!</span>
      <Circle draw={draw} className="absolute -inset-x-2 -inset-y-1 z-[1] h-[calc(100%+8px)] w-[calc(100%+16px)] [stroke-width:2.4]" />
    </span>
  );
}
