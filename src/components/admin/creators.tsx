"use client";

import Link from "next/link";
import { useState } from "react";
import { adminActions, creatorStats, fmtDateTime, orderTotal, payoutState, timeAgo, useAdmin, type AdminCreator, type CreatorStatus } from "@/lib/admin-store";
import { fmtDate } from "@/lib/creator-store";
import { fmtFee } from "@/lib/fees";
import { money } from "@/lib/format";
import { checkHandle } from "@/lib/handles";
import { creators as samplePages } from "@/lib/mock-data";
import { usePlatform } from "@/lib/platform-store";
import { Icon } from "../icons";
import { Btn, Card, Field, inputCls, PageTitle, StatusPill, Tabs, useToast } from "../creator/ui";
import { ConfirmDialog, CreatorAvatar, Empty, OrderStatusPill, SearchBox, SectionTitle, Stat, Table, Thumb } from "./bits";
import { CreatorFeeEditor, FeeBadge } from "./fee-controls";

export function CreatorStatusPill({ status }: { status: CreatorStatus }) {
  if (status === "active") return <StatusPill tone="green">Live</StatusPill>;
  return <StatusPill tone="red">{status === "hidden" ? "Hidden" : "Suspended"}</StatusPill>;
}

export function AdminCreators() {
  const s = useAdmin();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | CreatorStatus>("all");
  const t = q.trim().toLowerCase().replace(/^@/, "");
  const list = s.creators
    .filter((c) => (tab === "all" || c.status === tab) && (!t || [c.displayName, c.handle, c.email].some((v) => v.toLowerCase().includes(t))))
    .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
  const count = (st: CreatorStatus) => s.creators.filter((c) => c.status === st).length;

  return (
    <>
      <PageTitle title="Creators" />
      <SearchBox value={q} onChange={setQ} placeholder="Name, @handle or email" />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "all", label: "All", count: s.creators.length },
          { value: "active", label: "Live", count: count("active") },
          { value: "hidden", label: "Hidden", count: count("hidden") },
          { value: "suspended", label: "Suspended", count: count("suspended") },
        ]}
      />
      {list.length === 0 ? (
        <Empty>No creators match.</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Creator</th>
              <th>Joined</th>
              <th className="text-right">Live items</th>
              <th className="text-right">Sold</th>
              <th className="text-right">Sales</th>
              <th>Fee</th>
              <th>Bank</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => {
              const st = creatorStats(s, c.id);
              return (
                <tr key={c.id} className="hover:bg-soft">
                  <td>
                    <Link href={`/admin/creators/${c.id}`} className="flex items-center gap-2.5">
                      <CreatorAvatar c={c} size="size-8" />
                      <span>
                        <span className="block font-semibold underline-offset-2 hover:underline">{c.displayName}</span>
                        <span className="block text-xs text-muted">@{c.handle}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="text-muted">{fmtDate(c.joinedAt)}</td>
                  <td className="text-right tabular-nums">{st.liveItems}</td>
                  <td className="text-right tabular-nums">{st.sales}</td>
                  <td className="text-right tabular-nums">{money(st.salesCents)}</td>
                  <td><FeeBadge creatorId={c.id} /></td>
                  <td>{c.bankConnected ? <span className="text-[#1f7a3a]">Connected</span> : <span className="text-muted">Not yet</span>}</td>
                  <td><CreatorStatusPill status={c.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}

type Pending = null | "hide" | "suspend" | "restore" | "bio" | "avatar" | "handle";

export function AdminCreatorDetail({ id }: { id: string }) {
  const s = useAdmin();
  const p = usePlatform();
  const toast = useToast();
  const [pending, setPending] = useState<Pending>(null);
  const [editFee, setEditFee] = useState(false);
  const [note, setNote] = useState("");
  const c = s.creators.find((x) => x.id === id);
  if (!c) {
    return (
      <div className="flex flex-col items-start gap-3">
        <h1 className="font-display text-4xl font-extrabold uppercase">Creator not found</h1>
        <Btn href="/admin/creators" variant="outline">Back to creators</Btn>
      </div>
    );
  }
  const st = creatorStats(s, c.id);
  const first = c.displayName.split(" ")[0];
  const owed = st.orders.filter((o) => o.status === "paid" || o.status === "shipped");
  const held = st.orders.filter((o) => payoutState(o, s) === "no_bank");
  const fee = p.creatorFees[c.id];
  const hasPublicPage = samplePages.some((x) => x.handle === c.handle);
  const openOrders = st.orders.filter((o) => o.status === "paid").length;

  return (
    <>
      <Link href="/admin/creators" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <Icon name="back" className="size-4" /> Creators
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <CreatorAvatar c={c} size="size-16" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[36px] leading-[0.9] font-extrabold tracking-[-0.04em] uppercase md:text-[48px]">{c.displayName}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            @{c.handle} · {c.email} <CreatorStatusPill status={c.status} />
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          {hasPublicPage && (
            <Btn href={`/${c.handle}`} variant="outline" size="sm" icon="eye">View page</Btn>
          )}
          <Btn href={`mailto:${c.email}`} variant="outline" size="sm" icon="mail">Email</Btn>
        </div>
      </div>

      {c.status !== "active" && (
        <div className="mb-5 flex flex-wrap items-center gap-3 border-[1.5px] border-accent bg-[#fff0ee] p-4">
          <Icon name="alert" className="size-5 text-accent" />
          <p className="min-w-0 flex-1 text-sm">
            {c.status === "hidden"
              ? <>Hidden. Fans can&apos;t see {first}&apos;s page or items. {first} can still sign in and ship orders.</>
              : <>Suspended. {first} can&apos;t sign in and the page is hidden. Open orders still need shipping or refunding.</>}
          </p>
          <Btn size="sm" variant="dark" onClick={() => setPending("restore")}>Restore</Btn>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Live items" value={String(st.liveItems)} sub={`${st.items.length} total`} />
        <Stat label="Sold" value={String(st.sales)} sub={money(st.salesCents) + " in sales"} />
        <Stat label="Our revenue" value={money(st.feeCents)} sub={`at ${fee ? fmtFee(fee.feeBps) : fmtFee(p.defaultFeeBps)} now`} />
        <Stat label="Owed to them" value={money(owed.reduce((n, o) => n + o.payoutCents, 0))} sub={held.length ? `${money(held.reduce((n, o) => n + o.payoutCents, 0))} held, no bank` : c.bankConnected ? "Bank connected" : "No bank yet"} tone={held.length ? "red" : undefined} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section>
            <SectionTitle>Items</SectionTitle>
            {st.items.length === 0 ? (
              <Empty>No items yet.</Empty>
            ) : (
              <ul className="border border-line bg-white">
                {st.items.map((it) => (
                  <li key={it.id} className="flex items-center gap-3 border-t border-line px-3 py-2.5 text-sm first:border-t-0">
                    <Thumb src={it.images[0]} className="w-9" />
                    <Link href={`/admin/items?q=${encodeURIComponent(it.title)}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">{it.title}</Link>
                    <span className="tabular-nums">{money(it.priceCents)}</span>
                    <ItemStatusPill status={it.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <SectionTitle>Orders</SectionTitle>
            {st.orders.length === 0 ? (
              <Empty>No orders yet.</Empty>
            ) : (
              <ul className="border border-line bg-white">
                {[...st.orders].sort((a, b) => b.paidAt.localeCompare(a.paidAt)).map((o) => (
                  <li key={o.id} className="border-t border-line first:border-t-0">
                    <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-soft">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{o.items[0].title}</span>
                        <span className="block text-muted">{o.id} · {fmtDate(o.paidAt)} · {o.fan.name}</span>
                      </span>
                      <span className="tabular-nums">{money(orderTotal(o))}</span>
                      <OrderStatusPill status={o.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <SectionTitle>Notes</SectionTitle>
            <form
              className="mb-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!note.trim()) return;
                adminActions.addNote(c.id, note.trim());
                setNote("");
              }}
            >
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Only you can see these" className={inputCls} size={1} />
              <Btn type="submit" variant="dark" disabled={!note.trim()}>Add</Btn>
            </form>
            {c.notes.length > 0 && (
              <ul className="flex flex-col gap-2">
                {c.notes.map((n, i) => (
                  <li key={i} className="border-l-2 border-accent bg-white px-3 py-2 text-sm">
                    {n.text}
                    <span className="block text-xs text-muted">{fmtDateTime(n.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <p className="mb-2 text-xs font-bold tracking-[0.08em] text-muted uppercase">Fee</p>
            {editFee ? (
              <CreatorFeeEditor creatorId={c.id} name={c.displayName} onDone={() => setEditFee(false)} />
            ) : (
              <>
                <p className="font-display text-3xl font-extrabold tabular-nums">{fmtFee(fee ? fee.feeBps : p.defaultFeeBps)}</p>
                <p className="mt-1 mb-3 text-[13px] text-muted">{fee ? `Their own rate${fee.note ? `: ${fee.note}` : ""}.` : "Platform fee."} Applies to new orders.</p>
                <Btn size="sm" variant="outline" onClick={() => setEditFee(true)}>{fee ? "Change" : "Give them their own fee"}</Btn>
              </>
            )}
          </Card>

          <Card>
            <p className="mb-3 text-xs font-bold tracking-[0.08em] text-muted uppercase">Profile</p>
            <dl className="flex flex-col gap-2 text-sm">
              <div><dt className="text-muted">Joined</dt><dd>{fmtDate(c.joinedAt)}</dd></div>
              <div><dt className="text-muted">Last active</dt><dd>{timeAgo(c.lastActiveAt)}</dd></div>
              <div><dt className="text-muted">Bank</dt><dd>{c.bankConnected ? "Connected via Stripe" : "Not connected yet"}</dd></div>
              <div>
                <dt className="text-muted">Bio</dt>
                <dd>{c.bio || <span className="text-muted italic">None</span>}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
              {c.avatarUrl && <Btn size="sm" variant="outline" icon="trash" onClick={() => setPending("avatar")}>Remove photo</Btn>}
              {c.bio && <Btn size="sm" variant="outline" icon="trash" onClick={() => setPending("bio")}>Remove bio</Btn>}
            </div>
          </Card>

          <Card>
            <p className="mb-1 text-xs font-bold tracking-[0.08em] text-muted uppercase">Link</p>
            <p className="text-sm font-semibold">straightfrom.co/{c.handle}</p>
            <p className="mt-1 mb-3 text-[13px] text-muted">Creators can&apos;t change this. Only for support cases like a typo or someone taking a name.</p>
            <Btn size="sm" variant="outline" onClick={() => setPending("handle")}>Change link</Btn>
          </Card>

          {c.status === "active" && (
            <Card>
              <p className="mb-3 text-xs font-bold tracking-[0.08em] text-muted uppercase">Page</p>
              <div className="flex flex-wrap gap-2">
                <Btn size="sm" variant="outline" icon="eye" onClick={() => setPending("hide")}>Hide page</Btn>
                <Btn size="sm" variant="primary" onClick={() => setPending("suspend")}>Suspend</Btn>
              </div>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={pending === "hide"}
        onClose={() => setPending(null)}
        title={`Hide ${first}'s page?`}
        confirmLabel="Hide page"
        danger
        reasonLabel="Reason"
        body={<>Fans won&apos;t see the page or any items. {first} can still sign in and ship open orders. You can restore it anytime.</>}
        onConfirm={(r) => { adminActions.setCreatorStatus(c.id, "hidden", r); toast("Page hidden"); }}
      />
      <ConfirmDialog
        open={pending === "suspend"}
        onClose={() => setPending(null)}
        title={`Suspend ${first}?`}
        confirmLabel="Suspend"
        danger
        reasonLabel="Reason"
        body={<>{first} can&apos;t sign in and the page is hidden.{openOrders > 0 && <> {openOrders} order{openOrders > 1 ? "s haven't" : " hasn't"} shipped yet, so refund {openOrders > 1 ? "them" : "it"} if they can&apos;t ship.</>}</>}
        onConfirm={(r) => { adminActions.setCreatorStatus(c.id, "suspended", r); toast(`${first} suspended`); }}
      />
      <ConfirmDialog
        open={pending === "restore"}
        onClose={() => setPending(null)}
        title={`Restore ${first}?`}
        confirmLabel="Restore"
        body={<>The page goes live again and {first} can sign in as normal.</>}
        onConfirm={() => { adminActions.setCreatorStatus(c.id, "active"); toast("Restored"); }}
      />
      <ConfirmDialog
        open={pending === "bio"}
        onClose={() => setPending(null)}
        title="Remove bio?"
        confirmLabel="Remove bio"
        danger
        body={<>The bio is deleted from {first}&apos;s page. {first} can write a new one.</>}
        onConfirm={() => { adminActions.removeBio(c.id); toast("Bio removed"); }}
      />
      <ConfirmDialog
        open={pending === "avatar"}
        onClose={() => setPending(null)}
        title="Remove profile photo?"
        confirmLabel="Remove photo"
        danger
        body={<>The photo is deleted from {first}&apos;s page. {first} can upload a new one.</>}
        onConfirm={() => { adminActions.removeAvatar(c.id); toast("Photo removed"); }}
      />
      <HandleDialog creator={c} open={pending === "handle"} onClose={() => setPending(null)} />
    </>
  );
}

export function ItemStatusPill({ status }: { status: string }) {
  const m: Record<string, [React.ComponentProps<typeof StatusPill>["tone"], string]> = {
    available: ["green", "Live"],
    draft: ["muted", "Draft"],
    hidden: ["red", "Hidden"],
    sold_out: ["ink", "Sold"],
    reserved: ["muted", "On hold"],
  };
  const [tone, label] = m[status] ?? ["muted", status];
  return <StatusPill tone={tone}>{label}</StatusPill>;
}

function HandleDialog({ creator: c, open, onClose }: { creator: AdminCreator; open: boolean; onClose: () => void }) {
  const s = useAdmin();
  const toast = useToast();
  const [v, setV] = useState("");
  const h = v.trim().toLowerCase();
  const base = checkHandle(h, c.handle);
  const taken = s.creators.some((x) => x.id !== c.id && x.handle === h);
  const error = !h ? null : !base.ok ? base.reason : taken ? "Already taken" : h === c.handle ? "That's the current link" : null;
  return (
    <ConfirmDialog
      key={String(open)}
      open={open}
      onClose={onClose}
      title="Change link?"
      confirmLabel="Change link"
      danger
      reasonLabel="Reason"
      body={
        <div className="flex flex-col gap-3">
          <p>straightfrom.co/{c.handle} stops working and anyone with the old link gets a not-found page. Only do this if {c.displayName.split(" ")[0]} asked, or someone took a name that isn&apos;t theirs.</p>
          <Field label="New link" htmlFor="new-handle" error={error}>
            <div className="flex items-center border-[1.5px] border-line bg-white focus-within:border-ink">
              <span className="pl-3.5 text-muted">straightfrom.co/</span>
              <input id="new-handle" value={v} onChange={(e) => setV(e.target.value)} className="h-12 w-0 flex-1 bg-transparent pr-3.5 outline-none" size={1} autoCapitalize="none" spellCheck={false} />
            </div>
          </Field>
        </div>
      }
      disabled={!h || !!error}
      onConfirm={(reason) => {
        adminActions.changeHandle(c.id, h, reason);
        toast(`Link changed to straightfrom.co/${h}`);
        setV("");
      }}
    />
  );
}
