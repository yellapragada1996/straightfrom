import Link from "next/link";
import { Wordmark } from "./brand";
import { AccountButton, CartButton, ShareButton } from "./header-actions";
import { Icon } from "./icons";
import { RingAvatar } from "./ring-avatar";
import type { Creator } from "@/lib/types";

/** Header for fan pages: brand (creator page) or back-to-creator chip (item page), plus share + cart. */
export function TopBar({ creator, back = false, share = true }: { creator?: Creator; back?: boolean; share?: boolean }) {
  return (
    <header className="relative z-10 border-b border-line bg-paper">
      <div className="mx-auto flex h-[58px] max-w-[1240px] items-center justify-between gap-3 px-4 md:px-10">
        {back && creator ? (
          <Link href={`/${creator.handle}`} className="-ml-1 flex min-h-11 min-w-0 items-center gap-2.5" aria-label={`Back to ${creator.displayName}'s page`}>
            <Icon name="back" />
            <RingAvatar src={creator.avatarUrl} size={36} />
            <b className="truncate font-display text-base font-extrabold tracking-tight">@{creator.handle}</b>
          </Link>
        ) : (
          <Link href="/" aria-label="StraightFrom home">
            <Wordmark />
          </Link>
        )}
        <div className="flex items-center gap-2">
          {share && <ShareButton label={back ? "Share this item" : "Share this page"} />}
          <AccountButton />
          <CartButton />
        </div>
      </div>
    </header>
  );
}
