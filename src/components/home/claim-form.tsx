"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { checkHandle } from "@/lib/handles";
import { CLAIM_HANDLE_KEY } from "../creator/login-form";
import { Icon } from "../icons";

/** "straightfrom.co/[yourname] → Claim it". Carries the handle into sign-up. */
export function ClaimForm({ dark = false, id }: { dark?: boolean; id?: string }) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [touched, setTouched] = useState(false);
  const h = handle.trim().toLowerCase();
  const check = checkHandle(h);
  const showError = touched && h.length > 0 && !check.ok;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (h && !check.ok) return;
    try {
      if (h) sessionStorage.setItem(CLAIM_HANDLE_KEY, h);
    } catch {}
    router.push("/login");
  }

  return (
    <form onSubmit={submit} className="w-full max-w-[520px]" id={id}>
      <div
        className={`flex flex-col gap-2 sm:flex-row sm:gap-0 ${
          dark ? "sm:border-[1.5px] sm:border-white" : "sm:border-[1.5px] sm:border-ink"
        }`}
      >
        <label
          className={`flex h-[58px] min-w-0 shrink-0 items-center border-[1.5px] sm:flex-1 sm:shrink sm:border-0 ${
            dark ? "border-white bg-ink text-white" : "border-ink bg-white"
          } focus-within:outline-2 focus-within:-outline-offset-4 focus-within:outline-accent`}
        >
          <span className="sr-only">Choose your link</span>
          <span className={`pl-4 text-[17px] whitespace-nowrap ${dark ? "text-[#9a9a9a]" : "text-muted"}`}>straightfrom.co/</span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/\s/g, ""))}
            onBlur={() => setTouched(true)}
            placeholder="yourname"
            maxLength={30}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={showError}
            size={1}
            className={`h-full w-0 min-w-0 flex-1 bg-transparent pr-3 text-[17px] font-semibold outline-none ${
              dark ? "placeholder:text-[#666]" : "placeholder:text-[#b5b5b5]"
            }`}
          />
          {h && check.ok && <Icon name="check" className="mr-3 size-5 text-[#1f9d4c]" />}
        </label>
        <button
          type="submit"
          className="flex h-[58px] items-center justify-center gap-2 bg-accent px-6 font-display text-lg font-extrabold whitespace-nowrap text-white uppercase hover:bg-accent-hover"
        >
          Claim it <Icon name="arrow" />
        </button>
      </div>
      <p className={`mt-2 h-5 text-[13px] ${showError ? "text-accent" : dark ? "text-[#9a9a9a]" : "text-muted"}`} aria-live="polite">
        {showError ? (check as { reason: string }).reason : h && check.ok ? `straightfrom.co/${h} is available` : ""}
      </p>
    </form>
  );
}
