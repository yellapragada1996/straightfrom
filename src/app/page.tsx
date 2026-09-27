import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { creators } from "@/lib/mock-data";

// Placeholder until the homepage step: links into the sample creators.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-6 px-4 py-16 md:px-10">
      <Wordmark className="text-5xl" />
      <p className="text-ink-2">Prototype. Homepage coming next. Sample creator pages:</p>
      <ul className="flex flex-col gap-2">
        {creators.map((c) => (
          <li key={c.id}>
            <Link href={`/${c.handle}`} className="font-display text-2xl font-extrabold underline underline-offset-4">
              @{c.handle}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
