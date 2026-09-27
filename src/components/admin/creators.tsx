"use client";

import Link from "next/link";
import { useState } from "react";
import { adminActions, creatorNextStep, matchesCreator, creatorStats, fmtDateTime, orderLabel, orderTotal, payoutState, timeAgo, useAdmin, type AdminCreator } from "@/lib/admin-store";
import { fmtDate } from "@/lib/creator-store";
import { fmtFee } from "@/lib/fees";
import { money } from "@/lib/format";
import { checkHandle } from "@/lib/handles";
import { creators as samplePages } from "@/lib/mock-data";
import { usePlatform } from "@/lib/platform-store";
import { Icon } from "../icons";
import { Btn, Card, Field, inputCls, Tabs, useToast } from "../creator/ui";
import { AdminTitle, ConfirmDialog, CreatorAvatar, Empty, SearchBox, SectionTitle, Stat, StatusText, Table } from "./bits";
import { CreatorFeeEditor } from "./fee-controls";
import { ItemRow } from "./items";

export function AdminCreators() {
  const s = useAdmin();
  const p = usePlatform();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "hidden">("all");
  const list = s.creators
    .filter((c) => (tab === "all" || c.status === "hidden") && matchesCreator(c, q))
    .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
  const hidden = s.creators.filter((c) => c.status === "hidden").length;

  return (
    <>
      <AdminTitle title="Creators" />
      <SearchBox value={q} onChange={setQ} placeholder="Name, @handle or email" />
      {hidden > 0 && (
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "all", label: "All", count: s.creators.length },
            { value: "hidden", label: "Hidden", count: hidden },
          ]}
        />
      )}
      {list.length === 0 ? (
        <Empty>No creators match.</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Creator</th>
              <th>Next step</th>
              <th className="text-right">Sold</th>
              <th className="text-right">Sales</th>
              <th>Own fee</th>
              <th>Last active</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => {
              const st = creatorStats(s, c.id);
              const next = creatorNextStep(s, c);
              const own = p.creatorFees[c.id];
              return (
                <tr key={c.id} className="hover:bg-soft">
                  <td>
                    <Link href={`/admin/creators/${c.id}`} className="flex items-center gap-2.5">
                      <CreatorAvatar c={c} size="size-8" />
                      <span>
                        <span className="block font-semibold underline-offset-2 hover:underline">{c.displayName}</span>
                        <span className="block text-xs text-muted">@{c.handle}{c.status === "hidden" && " · page hidden"}</span>
                      </span>
                    </Link>
                  </td>
                  <td className={next ? "text-ink-2" : "text-muted"}>{next ? next.text : "All set"}</td>
                  <td className="text-right tabular-nums">{st.sales}</td>
                  <td className="text-right tabular-nums">{money(st.salesCents)}</td>
                  <td className="font-semibold tabular-nums">{own ? fmtFee(own.feeBps) : ""}</td>
                  <td className="text-muted">{timeAgo(c.lastActiveAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}

type Pending = null | "hide" | "unhide" | "bio" | "avatar" | "handle";

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
  const steps = [
    { label: "Signed up", done: true, when: fmtDate(c.joinedAt) },
    { label: "Put an item live", done: st.items.some((i) => i.status === "available" || i.status === "sold_out") },
    { label: "Made a sale", done: st.sales > 0 },
    { label: "Connected a bank", done: c.bankConnected },
  ];

  return (
    <>
      <Link href="/admin/creators" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <Icon name="back" className="size-4" /> Creators
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <CreatorAvatar c={c} size="size-14" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[30px] leading-none font-extrabold tracking-[-0.035em] uppercase md:text-[36px]">{c.displayName}</h1>
          <p className="mt-1 text-sm text-muted">@{c.handle} · {c.email}</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          {hasPublicPage && c.status === "active" && <Btn href={`/${c.handle}`} variant="outline" size="sm" icon="eye">View page</Btn>}
          <Btn href={`mailto:${c.email}`} variant="outline" size="sm" icon="mail">Email</Btn>
        </div>
      </div>

      {c.status === "hidden" && (
        <div className="mb-5 flex flex-wrap items-center gap-3 border-[1.5px] border-ink bg-white p-4">
          <Icon name="eye" className="size-5" />
          <p className="min-w-0 flex-1 text-sm">
            <b>Page hidden.</b> Fans can&apos;t see {first}&apos;s page or items. {first} can still sign in and ship open orders.
          </p>
          <Btn size="sm" variant="dark" onClick={() => setPending("unhide")}>Unhide</Btn>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Live items" value={String(st.liveItems)} sub={`${st.items.length} total`} />
        <Stat label="Sold" value={String(st.sales)} sub={`${st.orders.length - st.sales} refunded`} />
        <Stat label="Sales" value={money(st.salesCents)} sub="Paid by fans" />
        <Stat
          label="Owed to them"
          value={money(owed.reduce((n, o) => n + o.payoutCents, 0))}
          sub={held.length ? `${money(held.reduce((n, o) => n + o.payoutCents, 0))} waiting on a bank` : "Not paid out yet"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section>
            <SectionTitle>Items</SectionTitle>
            {st.items.length === 0 ? (
              <Empty>No items yet.</Empty>
            ) : (
              <ul className="border border-line bg-white">
                {st.items.map((it) => (
                  <ItemRow key={it.id} item={it} creatorHandle={c.handle} />
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
                        <span className="block text-xs text-muted">{o.id} · {fmtDate(o.paidAt)} · {o.fan.name}</span>
                      </span>
                      <span className="tabular-nums">{money(orderTotal(o))}</span>
                      <StatusText {...orderLabel(o, s)} />
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
                  <li key={i} className="border-l-2 border-ink bg-white px-3 py-2 text-sm">
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
            <p className="mb-3 text-xs font-bold tracking-[0.08em] text-muted uppercase">Setup</p>
            <ol className="flex flex-col gap-2 text-sm">
              {steps.map((x) => (
                <li key={x.label} className={`flex items-center gap-2 ${x.done ? "" : "text-muted"}`}>
                  <span className={`grid size-5 place-items-center rounded-full ${x.done ? "bg-ink text-white" : "border-[1.5px] border-line"}`}>
                    {x.done && <Icon name="check" className="size-3" />}
                  </span>
                  {x.label}
                  {x.when && <span className="ml-auto text-xs text-muted">{x.when}</span>}
                </li>
              ))}
            </ol>
            <p className="mt-3 border-t border-line pt-3 text-[13px] text-muted">Last active {timeAgo(c.lastActiveAt)}</p>
          </Card>

          <Card>
            <p className="mb-2 text-xs font-bold tracking-[0.08em] text-muted uppercase">Fee</p>
            {editFee ? (
              <CreatorFeeEditor creatorId={c.id} name={c.displayName} onDone={() => setEditFee(false)} />
            ) : (
              <>
                <p className="font-display text-3xl font-extrabold tabular-nums">{fmtFee(fee ? fee.feeBps : p.defaultFeeBps)}</p>
                <p className="mt-1 mb-3 text-[13px] text-muted">
                  {fee ? `Their own rate${fee.note ? `: ${fee.note}` : ""}.` : "The platform fee."} Applies to new orders.
                </p>
                <Btn size="sm" variant="outline" onClick={() => setEditFee(true)}>{fee ? "Change" : "Set their own fee"}</Btn>
              </>
            )}
          </Card>

          <Card>
            <p className="mb-3 text-xs font-bold tracking-[0.08em] text-muted uppercase">Page</p>
            <p className="text-sm">
              <span className="text-muted">Bio: </span>
              {c.bio || <span className="text-muted italic">none</span>}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {c.avatarUrl && <Btn size="sm" variant="outline" icon="trash" onClick={() => setPending("avatar")}>Remove photo</Btn>}
              {c.bio && <Btn size="sm" variant="outline" icon="trash" onClick={() => setPending("bio")}>Remove bio</Btn>}
              {c.status === "active" && <Btn size="sm" variant="outline" icon="eye" onClick={() => setPending("hide")}>Hide page</Btn>}
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-sm font-semibold">straightfrom.co/{c.handle}</p>
              <p className="mt-1 mb-2 text-[13px] text-muted">Creators can&apos;t change their link. Only for support cases, like a typo or someone using a name that isn&apos;t theirs.</p>
              <button type="button" onClick={() => setPending("handle")} className="text-sm underline underline-offset-2">Change link</button>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={pending === "hide"}
        onClose={() => setPending(null)}
        title={`Hide ${first}'s page?`}
        confirmLabel="Hide page"
        danger
        reasonLabel="Reason"
        body={<>Fans won&apos;t see the page or any items. {first} can still sign in and ship open orders. You can unhide it anytime.</>}
        onConfirm={(r) => { adminActions.setCreatorStatus(c.id, "hidden", r); toast("Page hidden"); }}
      />
      <ConfirmDialog
        open={pending === "unhide"}
        onClose={() => setPending(null)}
        title={`Unhide ${first}'s page?`}
        confirmLabel="Unhide"
        body={<>The page and live items are visible to fans again.</>}
        onConfirm={() => { adminActions.setCreatorStatus(c.id, "active"); toast("Page is live again"); }}
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
      open={open}
      onClose={() => {
        setV("");
        onClose();
      }}
      title="Change link?"
      confirmLabel="Change link"
      danger
      reasonLabel="Reason"
      disabled={!h || !!error}
      body={
        <div className="flex flex-col gap-3">
          <p>straightfrom.co/{c.handle} stops working, and anyone with the old link gets a not-found page.</p>
          <Field label="New link" htmlFor="new-handle" error={error}>
            <div className="flex items-center border-[1.5px] border-line bg-white focus-within:border-ink">
              <span className="pl-3.5 text-muted">straightfrom.co/</span>
              <input id="new-handle" value={v} onChange={(e) => setV(e.target.value)} className="h-12 w-0 flex-1 bg-transparent pr-3.5 outline-none" size={1} autoCapitalize="none" spellCheck={false} />
            </div>
          </Field>
        </div>
      }
      onConfirm={(reason) => {
        adminActions.changeHandle(c.id, h, reason);
        toast(`Link changed to straightfrom.co/${h}`);
        setV("");
      }}
    />
  );
}
