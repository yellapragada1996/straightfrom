import Link from "next/link";
import { Icon } from "@/components/icons";
import { TopBar } from "@/components/top-bar";

export default function NotFound() {
  return (
    <>
      <TopBar share={false} />
      <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col items-start gap-4 px-4 py-16 md:px-10 md:py-24">
        <p className="inline-block -rotate-2 font-hand text-[28px] font-semibold text-accent">hmm…</p>
        <h1 className="font-display text-[46px] leading-[0.86] font-extrabold tracking-[-0.045em] uppercase md:text-[80px]">
          Nothing here
        </h1>
        <p className="max-w-md text-[17px] leading-relaxed text-ink-2">
          This page doesn&apos;t exist, or it was taken down. If a creator shared this link, check you have the right handle.
        </p>
        <Link href="/" className="mt-4 inline-flex h-[54px] items-center gap-2.5 border-[1.5px] border-ink px-5 font-display font-extrabold uppercase hover:bg-ink hover:text-white">
          Go to StraightFrom <Icon name="arrow" />
        </Link>
      </main>
    </>
  );
}
