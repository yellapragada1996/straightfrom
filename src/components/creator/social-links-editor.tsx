"use client";

import { isValidUsername, normalizeUsername, platform, PLATFORMS, type SocialKey, type SocialLinks } from "@/lib/social";
import { Icon } from "../icons";

/**
 * Pick platforms from the list, type or paste a username / profile URL.
 * The page shows each one as an icon + link automatically.
 */
export function SocialLinksEditor({ value, onChange }: { value: SocialLinks; onChange: (v: SocialLinks) => void }) {
  const active = PLATFORMS.filter((p) => p.key in value);
  const available = PLATFORMS.filter((p) => !(p.key in value));

  const setOne = (key: SocialKey, v: string) => onChange({ ...value, [key]: v });
  const removeOne = (key: SocialKey) => {
    const next = { ...value };
    delete next[key];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {active.length > 0 && (
        <ul className="flex flex-col gap-3">
          {active.map((p) => {
            const raw = value[p.key] ?? "";
            const clean = normalizeUsername(p.key, raw);
            const invalid = raw.length > 0 && !isValidUsername(clean);
            return (
              <li key={p.key}>
                <div className="flex items-stretch">
                  <span className="grid w-12 shrink-0 place-items-center border-[1.5px] border-r-0 border-line bg-soft" title={p.label}>
                    <Icon name={p.icon} />
                  </span>
                  <label className="flex min-w-0 flex-1 items-center border-[1.5px] border-line bg-white focus-within:border-ink">
                    <span className="sr-only">{p.label} username</span>
                    <span className="hidden pl-3 text-[15px] whitespace-nowrap text-muted sm:inline">{p.prefix}</span>
                    <input
                      value={raw}
                      onChange={(e) => setOne(p.key, e.target.value)}
                      onBlur={() => clean !== raw && setOne(p.key, clean)}
                      placeholder={`your ${p.label} username`}
                      aria-invalid={invalid}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="h-12 min-w-0 flex-1 bg-transparent px-3 text-[16px] outline-none placeholder:text-[#9a9a9a] sm:pl-0.5"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeOne(p.key)}
                    aria-label={`Remove ${p.label}`}
                    className="grid w-12 shrink-0 place-items-center border-[1.5px] border-l-0 border-line text-muted hover:text-ink"
                  >
                    <Icon name="close" className="size-4" />
                  </button>
                </div>
                {invalid ? (
                  <p className="mt-1 text-[13px] text-accent">That doesn&apos;t look like a {p.label} username.</p>
                ) : clean ? (
                  <p className="mt-1 truncate text-[12.5px] text-muted">
                    Links to <span className="text-ink-2">{platform(p.key).url(clean).replace("https://", "")}</span>
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {available.length > 0 && (
        <div>
          <p className="mb-2 text-[13px] font-semibold">{active.length ? "Add another" : "Tap the ones you use"}</p>
          <div className="flex flex-wrap gap-2">
            {available.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setOne(p.key, "")}
                className="inline-flex h-11 items-center gap-2 border-[1.5px] border-line bg-white px-3.5 text-sm font-semibold hover:border-ink"
              >
                <Icon name={p.icon} className="size-[18px]" />
                {p.label}
                <Icon name="plus" className="size-3.5 text-muted" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Drop empty entries and clean up usernames before saving. */
export function cleanSocialLinks(v: SocialLinks): SocialLinks {
  const out: SocialLinks = {};
  for (const p of PLATFORMS) {
    const u = v[p.key] ? normalizeUsername(p.key, v[p.key]!) : "";
    if (u && isValidUsername(u)) out[p.key] = u;
  }
  return out;
}
