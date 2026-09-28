// Shipping carriers a creator can pick, with their tracking-page links.
// Keys match the `carrier` enum in the database (src/server/db/schema.ts).

export const CARRIERS = [
  { key: "canada_post", label: "Canada Post", track: (n: string) => `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${n}` },
  { key: "purolator", label: "Purolator", track: (n: string) => `https://www.purolator.com/en/shipping/tracker?pin=${n}` },
  { key: "usps", label: "USPS", track: (n: string) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}` },
  { key: "ups", label: "UPS", track: (n: string) => `https://www.ups.com/track?tracknum=${n}` },
  { key: "fedex", label: "FedEx", track: (n: string) => `https://www.fedex.com/fedextrack/?trknbr=${n}` },
  { key: "dhl", label: "DHL", track: (n: string) => `https://www.dhl.com/en/express/tracking.html?AWB=${n}` },
  { key: "other", label: "Other", track: null },
] as const;

export type CarrierKey = (typeof CARRIERS)[number]["key"];

/** The carrier's tracking page for this number, or null for "Other" (show the number only). */
export function trackingUrl(carrier: CarrierKey, trackingNumber: string): string | null {
  const c = CARRIERS.find((x) => x.key === carrier);
  const n = trackingNumber.replace(/\s+/g, "");
  return c?.track && n ? c.track(encodeURIComponent(n)) : null;
}
