import type { IconName } from "@/components/icons";

// Social platforms a creator can link. They type a username (or paste a full
// profile URL); we store the clean username and build the link + icon for their page.

export type SocialKey = "instagram" | "tiktok" | "youtube" | "x" | "twitch" | "kick" | "snapchat" | "threads" | "facebook";

type Platform = {
  key: SocialKey;
  label: string;
  icon: IconName;
  /** Shown before the input, e.g. "tiktok.com/@" */
  prefix: string;
  hosts: string[];
  url: (username: string) => string;
};

export const PLATFORMS: Platform[] = [
  { key: "instagram", label: "Instagram", icon: "instagram", prefix: "instagram.com/", hosts: ["instagram.com"], url: (u) => `https://instagram.com/${u}` },
  { key: "tiktok", label: "TikTok", icon: "tiktok", prefix: "tiktok.com/@", hosts: ["tiktok.com"], url: (u) => `https://tiktok.com/@${u}` },
  { key: "youtube", label: "YouTube", icon: "youtube", prefix: "youtube.com/@", hosts: ["youtube.com", "youtu.be"], url: (u) => `https://youtube.com/@${u}` },
  { key: "x", label: "X", icon: "x", prefix: "x.com/", hosts: ["x.com", "twitter.com"], url: (u) => `https://x.com/${u}` },
  { key: "twitch", label: "Twitch", icon: "twitch", prefix: "twitch.tv/", hosts: ["twitch.tv"], url: (u) => `https://twitch.tv/${u}` },
  { key: "kick", label: "Kick", icon: "kick", prefix: "kick.com/", hosts: ["kick.com"], url: (u) => `https://kick.com/${u}` },
  { key: "snapchat", label: "Snapchat", icon: "snapchat", prefix: "snapchat.com/add/", hosts: ["snapchat.com"], url: (u) => `https://snapchat.com/add/${u}` },
  { key: "threads", label: "Threads", icon: "threads", prefix: "threads.net/@", hosts: ["threads.net", "threads.com"], url: (u) => `https://threads.net/@${u}` },
  { key: "facebook", label: "Facebook", icon: "facebook", prefix: "facebook.com/", hosts: ["facebook.com", "fb.com"], url: (u) => `https://facebook.com/${u}` },
];

export const platform = (key: SocialKey) => PLATFORMS.find((p) => p.key === key)!;

/**
 * Turns whatever the creator typed into a clean username:
 * "@maya", "maya", "https://www.tiktok.com/@maya?lang=en" → "maya".
 */
export function normalizeUsername(key: SocialKey, input: string): string {
  let v = input.trim();
  if (!v) return "";
  const p = platform(key);
  try {
    if (/^(https?:\/\/)?(www\.|m\.)?[a-z0-9.-]+\.[a-z]{2,}\//i.test(v)) {
      const url = new URL(v.startsWith("http") ? v : `https://${v}`);
      if (p.hosts.some((h) => url.hostname.replace(/^(www\.|m\.)/, "") === h)) {
        const parts = url.pathname.split("/").filter(Boolean);
        v = (key === "snapchat" && parts[0] === "add" ? parts[1] : key === "youtube" && ["c", "channel", "user"].includes(parts[0]) ? parts[1] : parts[0]) ?? "";
      }
    }
  } catch {
    /* not a URL, treat as a username */
  }
  return v.replace(/^@+/, "").replace(/[/?#].*$/, "");
}

export const isValidUsername = (u: string) => /^[A-Za-z0-9._-]{1,60}$/.test(u);

export type SocialLinks = Partial<Record<SocialKey, string>>;

/** Links in the order of PLATFORMS, ready to render. */
export function socialList(links: SocialLinks) {
  return PLATFORMS.filter((p) => links[p.key]).map((p) => ({ ...p, username: links[p.key]!, href: p.url(links[p.key]!) }));
}
