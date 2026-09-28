"use client";

import { CARRIERS, type CarrierKey, type CreatorOrder, type OrderStatus } from "./creator-store";
import { PAYOUT_DELAY_DAYS, SHIP_DEADLINE_DAYS } from "@/config";
import { DEFAULT_FEE_BPS, feeFor, stripeFeeEstimate } from "./fees";
import { createLocalStore } from "./local-store";
import { creators as sampleCreators, products as sampleProducts } from "./mock-data";
import type { Product } from "./types";

// Prototype-only store for /admin: every creator, item, order and report on the
// platform, plus the admin activity log. Real app: the same Supabase tables, read
// with the service role behind a server-side admin check.

export const ADMIN_EMAIL = "admin@straightfrom.co";

export type CreatorStatus = "active" | "hidden";

export type AdminCreator = {
  id: string;
  handle: string;
  displayName: string;
  email: string;
  bio: string;
  avatarUrl: string;
  joinedAt: string;
  lastActiveAt: string;
  bankConnected: boolean;
  status: CreatorStatus;
  notes: { at: string; text: string }[];
};

export type OrderEvent = { at: string; text: string; by: "fan" | "creator" | "system" | "admin" };

export type AdminOrder = {
  id: string;
  creatorId: string;
  items: { productId: string; title: string; image?: string; priceCents: number; quantity: number }[];
  itemCents: number;
  shippingCents: number;
  /** The fee rate at the time of purchase. */
  feeBps: number;
  feeCents: number;
  payoutCents: number;
  fan: CreatorOrder["fan"];
  status: OrderStatus;
  paidAt: string;
  shippedAt?: string;
  carrier?: CarrierKey;
  tracking?: string;
  paidOutAt?: string;
  refundedAt?: string;
  refundReason?: string;
  extraShipDays: number;
  dispute?: { openedAt: string; reason: string };
  events: OrderEvent[];
};

export type Report = {
  id: string;
  at: string;
  reporterEmail: string;
  target: { kind: "item" | "creator"; id: string };
  reason: string;
  message: string;
  status: "open" | "resolved";
  resolvedAt?: string;
  resolution?: string;
};

export type LogEntry = { id: string; at: string; text: string };

export type AdminState = {
  version: 2;
  signedIn: boolean;
  creators: AdminCreator[];
  items: Product[];
  orders: AdminOrder[];
  reports: Report[];
  log: LogEntry[];
};

// ---------- seed ----------
const DAY = 86_400_000;
const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * 3_600_000).toISOString();

function seed(): AdminState {
  const [maya, theo] = sampleCreators;
  const creators: AdminCreator[] = [
    { id: maya.id, handle: maya.handle, displayName: maya.displayName, email: "maya@example.com", bio: maya.bio, avatarUrl: maya.avatarUrl, joinedAt: ago(26), lastActiveAt: ago(0, 2), bankConnected: false, status: "active", notes: [] },
    { id: theo.id, handle: theo.handle, displayName: theo.displayName, email: "theo@example.com", bio: theo.bio, avatarUrl: theo.avatarUrl, joinedAt: ago(34), lastActiveAt: ago(1), bankConnected: true, status: "active", notes: [{ at: ago(10), text: "Launch partner. 0% fee agreed on our call." }] },
    { id: "c_lena", handle: "lenacooks", displayName: "Lena Park", email: "lena@example.com", bio: "Home cooking, small kitchen, big pots.", avatarUrl: "", joinedAt: ago(11), lastActiveAt: ago(0, 5), bankConnected: true, status: "active", notes: [] },
    { id: "c_jules", handle: "julesdraws", displayName: "Jules Moreau", email: "jules@example.com", bio: "Illustrator. I draw live most Sundays.", avatarUrl: "", joinedAt: ago(18), lastActiveAt: ago(3), bankConnected: true, status: "active", notes: [] },
    { id: "c_dev", handle: "devskates", displayName: "Dev Arora", email: "dev@example.com", bio: "Skate clips, mostly the ones where I fall.", avatarUrl: "", joinedAt: ago(4), lastActiveAt: ago(2), bankConnected: false, status: "active", notes: [] },
    { id: "c_kofi", handle: "kofiboxing", displayName: "Kofi Mensah", email: "kofi.m@example.com", bio: "Boxing coach. Training videos every week.", avatarUrl: "", joinedAt: ago(1), lastActiveAt: ago(1), bankConnected: false, status: "active", notes: [] },
  ];

  const extra = (id: string, creatorId: string, title: string, priceCents: number, status: Product["status"], createdDaysAgo: number, quantity = 1): Product => ({
    id, creatorId, slug: id.slice(2).replace(/_/g, "-"), title, description: "", priceCents, shippingCents: 2000, quantity, status, images: [], createdAt: ago(createdDaysAgo).slice(0, 10),
  });
  const items: Product[] = [
    ...sampleProducts.map((p) => ({ ...p, images: [...p.images] })),
    extra("p_lena_apron", "c_lena", "The apron from the cooking channel", 8500, "available", 9),
    extra("p_lena_pan", "c_lena", "My first cast iron pan", 14000, "sold_out", 9),
    extra("p_lena_knife", "c_lena", "The knife from the dumpling video", 6000, "draft", 2),
    extra("p_jules_sketchbook", "c_jules", "A sketchbook full of doodles", 22000, "sold_out", 16),
    extra("p_jules_pens", "c_jules", "The pens from the Sunday streams", 4000, "available", 16, 3),
    extra("p_dev_board", "c_dev", "The board from the trick video", 16000, "draft", 3),
    extra("p_kofi_gloves", "c_kofi", "Signed boxing gloves", 25000, "available", 1),
  ];

  const fans = {
    priya: { name: "Priya Shah", email: "priya@example.com", line1: "88 Queen St W", line2: "Unit 1204", city: "Toronto", region: "ON", postal: "M5H 2M8", country: "Canada" },
    sam: { name: "Sam Rivera", email: "sam@example.com", line1: "120 Hudson St", line2: "Apt 4B", city: "New York", region: "NY", postal: "10013", country: "United States" },
    jordan: { name: "Jordan Lee", email: "jordan@example.com", line1: "2201 Pine St", city: "Seattle", region: "WA", postal: "98121", country: "United States" },
    aisha: { name: "Aisha Bello", email: "aisha@example.com", line1: "45 Elm Ave", city: "Austin", region: "TX", postal: "78704", country: "United States" },
    chris: { name: "Chris Novak", email: "chris@example.com", line1: "9 Harbour Rd", city: "Vancouver", region: "BC", postal: "V6B 1A1", country: "Canada" },
    mia: { name: "Mia Torres", email: "mia.t@example.com", line1: "310 Lake Shore Dr", city: "Chicago", region: "IL", postal: "60611", country: "United States" },
    ben: { name: "Ben Carter", email: "ben@example.com", line1: "77 King St", city: "Calgary", region: "AB", postal: "T2P 1J9", country: "Canada" },
    nora: { name: "Nora Kim", email: "nora@example.com", line1: "15 Mission St", city: "San Francisco", region: "CA", postal: "94105", country: "United States" },
  };

  type Dates = { paidAt: string; shippedAt?: string; paidOutAt?: string; refundedAt?: string };
  const order = (
    id: string,
    creatorId: string,
    productId: string,
    status: OrderStatus,
    fan: AdminOrder["fan"],
    d: Dates,
    extraFields: Partial<AdminOrder> = {},
  ): AdminOrder => {
    const p = items.find((x) => x.id === productId)!;
    const feeBps = extraFields.feeBps ?? DEFAULT_FEE_BPS;
    const feeCents = feeFor(p.priceCents, feeBps);
    const payoutCents = p.priceCents - feeCents + p.shippingCents;
    const total = p.priceCents + p.shippingCents;
    const events: OrderEvent[] = [{ at: d.paidAt, by: "fan", text: `${fan.name} paid ${fmtMoney(total)}. Order confirmation emailed.` }];
    if (d.shippedAt) {
      const c = CARRIERS.find((x) => x.key === extraFields.carrier);
      events.push({ at: d.shippedAt, by: "creator", text: `Marked shipped with ${c?.label ?? "a carrier"}. Tracking emailed to ${fan.name.split(" ")[0]}.` });
    }
    if (d.paidOutAt) events.push({ at: d.paidOutAt, by: "system", text: `Paid out ${fmtMoney(payoutCents)} to the creator.` });
    if (d.refundedAt) events.push({ at: d.refundedAt, by: "system", text: `Refunded ${fmtMoney(total)}. Not shipped within ${SHIP_DEADLINE_DAYS} days.` });
    return {
      id, creatorId,
      items: [{ productId, title: p.title, image: p.images[0], priceCents: p.priceCents, quantity: 1 }],
      itemCents: p.priceCents, shippingCents: p.shippingCents, feeBps, feeCents, payoutCents,
      fan, status, ...d, extraShipDays: 0, events,
      ...extraFields,
    };
  };

  const orders: AdminOrder[] = [
    // Maya: same orders as her sample dashboard
    order("SF-7Q2KD", "c_maya", "p_tokyo_polaroid", "paid", fans.priya, { paidAt: ago(5, 3) }),
    order("SF-4MZ8P", "c_maya", "p_film_camera", "paid", fans.sam, { paidAt: ago(1, 2) }),
    order("SF-9TR3A", "c_maya", "p_lisbon_tote", "shipped", fans.jordan, { paidAt: ago(6), shippedAt: ago(3) }, { carrier: "usps", tracking: "9400111202555842331234" }),
    order("SF-2LX6W", "c_maya", "p_ring_light", "shipped", fans.aisha, { paidAt: ago(15), shippedAt: ago(12) }, { carrier: "ups", tracking: "1Z999AA10123456784" }),
    order("SF-8HB1C", "c_maya", "p_qa_hoodie", "refunded", fans.chris, { paidAt: ago(24), refundedAt: ago(17) }, { refundReason: `Not shipped within ${SHIP_DEADLINE_DAYS} days` }),
    // Theo: 0% fee since he joined as a launch partner
    order("SF-6WQ4N", "c_theo", "p_theo_keyboard", "paid_out", fans.mia, { paidAt: ago(28), shippedAt: ago(26), paidOutAt: ago(19) }, { feeBps: 0, carrier: "fedex", tracking: "771234567890" }),
    order("SF-3PL9T", "c_theo", "p_theo_mic", "paid", fans.ben, { paidAt: ago(6, 4) }, { feeBps: 0 }),
    // Lena
    order("SF-5KD2R", "c_lena", "p_lena_pan", "shipped", fans.nora, { paidAt: ago(8), shippedAt: ago(6) }, { carrier: "usps", tracking: "9400111202555849876543" }),
    // Jules: the fan opened a chargeback after delivery
    order("SF-1JV7M", "c_jules", "p_jules_sketchbook", "paid_out", fans.sam, { paidAt: ago(16), shippedAt: ago(15), paidOutAt: ago(8) }, {
      carrier: "canada_post", tracking: "7023210039414604",
      dispute: { openedAt: ago(2), reason: "Fan says the item didn't arrive" },
    }),
  ];
  const sj = orders.find((o) => o.id === "SF-1JV7M")!;
  sj.events.push({ at: ago(2), by: "system", text: "Chargeback opened by the fan's bank: “item not received”." });

  const reports: Report[] = [
    { id: "R-104", at: ago(0, 6), reporterEmail: "kai@example.com", target: { kind: "creator", id: "c_kofi" }, reason: "Pretending to be someone", message: "This isn't the real Kofi. His Instagram is kofimensahboxing and it doesn't link here.", status: "open" },
    { id: "R-103", at: ago(1, 3), reporterEmail: "lee@example.com", target: { kind: "item", id: "p_theo_chair" }, reason: "Not what it says", message: "The chair in these photos looks different from the one on stream.", status: "open" },
    { id: "R-101", at: ago(9), reporterEmail: "anon@example.com", target: { kind: "item", id: "p_rain_jacket" }, reason: "Something else", message: "Price seems too high.", status: "resolved", resolvedAt: ago(8), resolution: "No action. Creators set their own prices." },
  ];

  const log: LogEntry[] = [
    { id: "L-3", at: ago(8), text: "Closed report R-101 on “The rain jacket from the Japan vlog”: No action. Creators set their own prices." },
    { id: "L-2", at: ago(10), text: "Set Theo Vance's fee to 0% (Launch partner)" },
    { id: "L-1", at: ago(40), text: "Set the platform fee to 4.9%" },
  ];

  return { version: 2, signedIn: false, creators, items, orders, reports, log };
}

const fmtMoney = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: c % 100 ? 2 : 0 })}`;

const store = createLocalStore<AdminState>("sf-admin-v1", seed);
export const useAdmin = store.use;

// ---------- actions (each one is written to the activity log) ----------
const now = () => new Date().toISOString();
const logEntry = (text: string): LogEntry => ({ id: "L-" + Math.random().toString(36).slice(2, 8), at: now(), text });

function act(text: string, update: (s: AdminState) => AdminState) {
  store.set((s) => {
    const next = update(s);
    return { ...next, log: [logEntry(text), ...next.log] };
  });
}
const mapOrder = (id: string, f: (o: AdminOrder) => AdminOrder) => (s: AdminState) => ({ ...s, orders: s.orders.map((o) => (o.id === id ? f(o) : o)) });
const mapCreator = (id: string, f: (c: AdminCreator) => AdminCreator) => (s: AdminState) => ({ ...s, creators: s.creators.map((c) => (c.id === id ? f(c) : c)) });
const mapItem = (id: string, f: (p: Product) => Product) => (s: AdminState) => ({ ...s, items: s.items.map((p) => (p.id === id ? f(p) : p)) });
const addEvent = (o: AdminOrder, text: string): AdminOrder => ({ ...o, events: [...o.events, { at: now(), by: "admin", text }] });
const creatorName = (id: string) => store.get().creators.find((c) => c.id === id)?.displayName ?? id;
const itemTitle = (id: string) => store.get().items.find((p) => p.id === id)?.title ?? id;

export const adminActions = {
  signIn() {
    store.set((s) => ({ ...s, signedIn: true }));
  },
  signOut() {
    store.set((s) => ({ ...s, signedIn: false }));
  },
  reset() {
    store.set(() => ({ ...seed(), signedIn: true }));
  },
  log(text: string) {
    act(text, (s) => s);
  },

  // Orders
  refund(id: string, reason: string) {
    const o = store.get().orders.find((x) => x.id === id)!;
    const total = o.itemCents + o.shippingCents;
    act(`Refunded ${id} in full (${fmtMoney(total)}): ${reason}`, mapOrder(id, (o) =>
      addEvent(
        { ...o, status: "refunded", refundedAt: now(), refundReason: reason },
        `Refunded ${fmtMoney(total)} to ${o.fan.name}${o.status === "paid_out" ? ", and took the payout back from the creator" : ""}. Reason: ${reason}. Fan and creator emailed.`,
      ),
    ));
  },
  extendShipBy(id: string, days: number) {
    act(`Gave ${id} ${days} more day${days > 1 ? "s" : ""} to ship`, mapOrder(id, (o) =>
      addEvent({ ...o, extraShipDays: o.extraShipDays + days }, `Ship-by date moved ${days} day${days > 1 ? "s" : ""} later. Creator emailed.`),
    ));
  },
  setTracking(id: string, carrier: CarrierKey, tracking: string) {
    const label = CARRIERS.find((c) => c.key === carrier)?.label;
    act(`Set tracking on ${id}: ${label} ${tracking}`, mapOrder(id, (o) =>
      o.status === "paid"
        ? addEvent({ ...o, status: "shipped", shippedAt: now(), carrier, tracking }, `Marked shipped with ${label} ${tracking}. Tracking emailed to ${o.fan.name.split(" ")[0]}.`)
        : addEvent({ ...o, carrier, tracking }, `Tracking changed to ${label} ${tracking}. New link emailed to ${o.fan.name.split(" ")[0]}.`),
    ));
  },
  /** Resends the fan's latest email: tracking once shipped, otherwise the order confirmation. */
  resendEmail(id: string) {
    const o = store.get().orders.find((x) => x.id === id)!;
    const label = o.tracking ? "tracking email" : "order confirmation";
    act(`Resent the ${label} for ${id} to ${o.fan.email}`, mapOrder(id, (o) => addEvent(o, `Resent the ${label} to ${o.fan.name.split(" ")[0]}.`)));
  },

  // Creators
  setCreatorStatus(id: string, status: CreatorStatus, reason?: string) {
    const verb = { active: "Unhid the page of", hidden: "Hid the page of" }[status];
    act(`${verb} ${creatorName(id)}${reason ? `: ${reason}` : ""}`, mapCreator(id, (c) => ({ ...c, status })));
  },
  removeBio(id: string) {
    act(`Removed ${creatorName(id)}'s bio`, mapCreator(id, (c) => ({ ...c, bio: "" })));
  },
  removeAvatar(id: string) {
    act(`Removed ${creatorName(id)}'s profile photo`, mapCreator(id, (c) => ({ ...c, avatarUrl: "" })));
  },
  changeHandle(id: string, handle: string, reason: string) {
    const old = store.get().creators.find((c) => c.id === id)?.handle;
    act(`Changed ${creatorName(id)}'s link from @${old} to @${handle}: ${reason}`, mapCreator(id, (c) => ({ ...c, handle })));
  },
  addNote(id: string, text: string) {
    act(`Added a note on ${creatorName(id)}`, mapCreator(id, (c) => ({ ...c, notes: [{ at: now(), text }, ...c.notes] })));
  },

  // Items
  setItemStatus(id: string, status: "hidden" | "draft" | "available") {
    const verb = { hidden: "Hid", draft: "Moved to drafts:", available: "Unhid" }[status];
    act(`${verb} “${itemTitle(id)}”`, mapItem(id, (p) => ({ ...p, status })));
  },
  removePhoto(id: string, index: number) {
    act(`Removed photo ${index + 1} from “${itemTitle(id)}”`, mapItem(id, (p) => {
      const images = p.images.filter((_, i) => i !== index);
      // A live item needs at least one photo.
      return { ...p, images, status: images.length === 0 && p.status === "available" ? "draft" : p.status };
    }));
  },

  // Reports
  /** Close a report, optionally hiding what was reported in the same step. */
  resolveReport(id: string, outcome: "hide" | "no_action") {
    const r = store.get().reports.find((x) => x.id === id)!;
    const resolution =
      outcome === "no_action" ? "No action needed" : r.target.kind === "item" ? "Hid the item" : "Hid the page";
    act(`Closed report ${id} on ${reportTargetName(store.get(), r)}: ${resolution}`, (s) => {
      let next = { ...s, reports: s.reports.map((x) => (x.id === id ? { ...x, status: "resolved" as const, resolvedAt: now(), resolution } : x)) };
      if (outcome === "hide")
        next = r.target.kind === "item"
          ? mapItem(r.target.id, (p) => ({ ...p, status: "hidden" }))(next)
          : mapCreator(r.target.id, (c) => ({ ...c, status: "hidden" }))(next);
      return next;
    });
  },
};

// ---------- derived ----------
export const shipByAt = (o: AdminOrder) => new Date(o.paidAt).getTime() + (SHIP_DEADLINE_DAYS + o.extraShipDays) * DAY;
export const payoutDueAt = (o: AdminOrder) => (o.shippedAt ? new Date(o.shippedAt).getTime() + PAYOUT_DELAY_DAYS * DAY : Infinity);
export const daysUntil = (t: number) => Math.ceil((t - Date.now()) / DAY);
export const orderTotal = (o: AdminOrder) => o.itemCents + o.shippingCents;

export type PayoutState = "after_ship" | "waiting" | "paying" | "no_bank" | "paid_out" | "refunded";

/** Where the creator's money for this order stands. */
export function payoutState(o: AdminOrder, s: AdminState): PayoutState {
  if (o.status === "refunded") return "refunded";
  if (o.status === "paid_out") return "paid_out";
  if (o.status === "paid") return "after_ship";
  if (payoutDueAt(o) > Date.now()) return "waiting";
  const c = s.creators.find((x) => x.id === o.creatorId);
  return c?.bankConnected ? "paying" : "no_bank";
}

/** One plain status per order. `urgent` = you should do something. */
export function orderLabel(o: AdminOrder, s: AdminState): { text: string; urgent: boolean } {
  if (o.dispute && o.status !== "refunded") return { text: "Chargeback", urgent: true };
  if (o.status === "refunded") return { text: "Refunded", urgent: false };
  if (o.status === "paid_out") return { text: "Paid out", urgent: false };
  if (o.status === "paid") {
    const left = daysUntil(shipByAt(o));
    return { text: left <= 0 ? "To ship · due today" : `To ship · ${left} day${left > 1 ? "s" : ""} left`, urgent: left <= 2 };
  }
  const ps = payoutState(o, s);
  return { text: ps === "no_bank" ? "Shipped · payout waiting on bank" : "Shipped", urgent: false };
}

/** What we actually keep: fees on orders that stuck, minus Stripe's card fee on every charge (not returned on refunds). */
export const keptCents = (orders: AdminOrder[]) =>
  orders.reduce((n, o) => n + (o.status === "refunded" ? 0 : o.feeCents) - stripeFeeEstimate(orderTotal(o)), 0);

export function creatorStats(s: AdminState, creatorId: string) {
  const orders = s.orders.filter((o) => o.creatorId === creatorId);
  const kept = orders.filter((o) => o.status !== "refunded");
  return {
    orders,
    sales: kept.length,
    salesCents: kept.reduce((n, o) => n + orderTotal(o), 0),
    feeCents: kept.reduce((n, o) => n + o.feeCents, 0),
    liveItems: s.items.filter((p) => p.creatorId === creatorId && p.status === "available").length,
    items: s.items.filter((p) => p.creatorId === creatorId),
  };
}

/** Search: the start of any word in their name, or the start of their @handle or email. */
export function matchesCreator(c: Pick<AdminCreator, "displayName" | "handle" | "email">, query: string) {
  const t = query.trim().toLowerCase().replace(/^@/, "");
  if (!t) return true;
  return (
    c.displayName.toLowerCase().split(/\s+/).some((w) => w.startsWith(t)) ||
    c.displayName.toLowerCase().startsWith(t) ||
    c.handle.startsWith(t) ||
    c.email.toLowerCase().startsWith(t)
  );
}

/** A creator's next step toward getting paid, or null once they're fully set up. */
export function creatorNextStep(s: AdminState, c: AdminCreator): { step: "list" | "sell" | "bank"; text: string } | null {
  const st = creatorStats(s, c.id);
  if (st.items.every((p) => p.status === "draft" || p.status === "hidden"))
    return { step: "list", text: st.items.length ? "Has drafts, nothing live yet" : "Hasn't added an item" };
  if (st.sales === 0) return { step: "sell", text: "Live, no sale yet" };
  if (!c.bankConnected) {
    const waiting = s.orders.filter((o) => o.creatorId === c.id && payoutState(o, s) === "no_bank").reduce((n, o) => n + o.payoutCents, 0);
    return { step: "bank", text: waiting ? `Needs to connect a bank · ${fmtMoney(waiting)} waiting` : "Needs to connect a bank" };
  }
  return null;
}

export type Attention = { key: string; tone: "red" | "ink"; title: string; detail: string; href: string };

/** The admin's to-do list, most urgent first. */
export function needsAttention(s: AdminState): Attention[] {
  const out: Attention[] = [];
  const name = (id: string) => s.creators.find((c) => c.id === id)?.displayName ?? id;
  for (const o of s.orders) {
    if (o.dispute && o.status !== "refunded")
      out.push({ key: "d" + o.id, tone: "red", title: `Chargeback on ${o.id}`, detail: `${o.dispute.reason}. Answer it in Stripe.`, href: `/admin/orders/${o.id}` });
  }
  for (const o of s.orders) {
    if (o.status !== "paid") continue;
    const left = daysUntil(shipByAt(o));
    if (left <= 2)
      out.push({ key: "s" + o.id, tone: "red", title: `${o.id} not shipped yet`, detail: `${name(o.creatorId)} · ${left <= 0 ? "refunds today" : `${left} day${left > 1 ? "s" : ""} left to ship`}`, href: `/admin/orders/${o.id}` });
  }
  return out;
}

export function reportTargetName(s: AdminState, r: Report) {
  if (r.target.kind === "creator") {
    const c = s.creators.find((x) => x.id === r.target.id);
    return c ? `${c.displayName} (@${c.handle})` : "Deleted creator";
  }
  const p = s.items.find((x) => x.id === r.target.id);
  return p ? `“${p.title}”` : "Deleted item";
}

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** ISO time `days` ago (a plain helper so screens don't call Date.now while rendering). */
export const isoDaysAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString();

export const timeAgo = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
};
