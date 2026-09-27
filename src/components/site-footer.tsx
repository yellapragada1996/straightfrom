import Link from "next/link";
import { Wordmark } from "./brand";
import { Icon } from "./icons";
import { ArrowDownLeft } from "./scribbles";

export function SiteFooter() {
  return (
    <footer className="mt-auto overflow-hidden bg-ink pt-12 pb-6 text-white md:pt-20">
      <div className="mx-auto max-w-[1240px] px-4 md:px-10">
        <p className="max-w-3xl font-display text-[40px] leading-[0.88] font-extrabold tracking-[-0.045em] uppercase md:text-[76px]">
          Let your fans own a piece of your story.
        </p>
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <Link
            href="/"
            className="inline-flex h-[54px] items-center gap-2.5 bg-accent px-5 font-display text-base font-extrabold uppercase tracking-[0.01em] hover:bg-accent-hover"
          >
            Start your page <Icon name="arrow" />
          </Link>
          <span className="mb-1.5 inline-flex -rotate-[5deg] items-start gap-0.5 font-hand text-[28px] font-semibold text-accent">
            <ArrowDownLeft className="relative mt-1 size-[30px] [stroke-width:2.2]" />
            it&apos;s free!
          </span>
        </div>
        <div className="mt-12">
          <Wordmark onDark className="text-[min(15.5vw,176px)]" />
        </div>
        <div className="mt-4 flex justify-between gap-4 border-t border-[#2a2a2a] pt-4 text-[13px] text-[#9a9a9a]">
          <span>straightfrom.co</span>
          <nav aria-label="Legal" className="flex gap-5">
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
