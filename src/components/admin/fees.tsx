"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdmin } from "@/lib/admin-store";
import { fmtDate } from "@/lib/creator-store";
import { feeFor, fmtFee } from "@/lib/fees";
import { money } from "@/lib/format";
import { usePlatform } from "@/lib/platform-store";
import { Btn, Card, Field, inputCls, PageTitle } from "../creator/ui";
import { CreatorAvatar, Empty, SectionTitle } from "./bits";
import { CreatorFeeEditor, PlatformFeeEditor } from "./fee-controls";

export function AdminFees() {
  const s = useAdmin();
  const p = usePlatform();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState("");
  const custom = s.creators.filter((c) => p.creatorFees[c.id]);
  const others = s.creators.filter((c) => !p.creatorFees[c.id]);
  const example = 10000;

  return (
    <>
      <PageTitle title="Fees" />

      <Card className="mb-8">
        <PlatformFeeEditor key={p.defaultFeeBps} />
        <p className="mt-4 border-t border-line pt-4 text-sm text-ink-2">
          On a {money(example)} item, the creator gets <b>{money(example - feeFor(example, p.defaultFeeBps))}</b> plus the shipping they charge.
          A new rate applies to new orders only. Orders already placed keep the fee they were bought at.
        </p>
      </Card>

      <section>
        <SectionTitle>Creators with their own fee</SectionTitle>
        <p className="-mt-1 mb-4 text-sm text-muted">These creators pay their own rate instead of the platform fee. Nobody else sees it.</p>

        {custom.length === 0 ? (
          <Empty>Everyone is on the platform fee.</Empty>
        ) : (
          <ul className="mb-5 border border-line bg-white">
            {custom.map((c) => {
              const f = p.creatorFees[c.id];
              return (
                <li key={c.id} className="border-t border-line px-4 py-3 first:border-t-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <CreatorAvatar c={c} />
                    <span className="min-w-0 flex-1">
                      <Link href={`/admin/creators/${c.id}`} className="block font-semibold hover:underline">{c.displayName}</Link>
                      <span className="block text-[13px] text-muted">{f.note || "No note"} · since {fmtDate(f.setAt)}</span>
                    </span>
                    <span className="font-display text-2xl font-extrabold tabular-nums">{fmtFee(f.feeBps)}</span>
                    {editing !== c.id && <Btn size="sm" variant="outline" onClick={() => setEditing(c.id)}>Change</Btn>}
                  </div>
                  {editing === c.id && (
                    <div className="mt-4 border-t border-line pt-4">
                      <CreatorFeeEditor creatorId={c.id} name={c.displayName} onDone={() => setEditing(null)} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {others.length > 0 && (
          <Card>
            <Field label="Give a creator their own fee" htmlFor="add-fee">
              <select id="add-fee" value={adding} onChange={(e) => setAdding(e.target.value)} className={inputCls}>
                <option value="">Choose a creator…</option>
                {others.map((c) => (
                  <option key={c.id} value={c.id}>{c.displayName} (@{c.handle})</option>
                ))}
              </select>
            </Field>
            {adding && (
              <div className="mt-4">
                <CreatorFeeEditor key={adding} creatorId={adding} name={s.creators.find((c) => c.id === adding)!.displayName} onDone={() => setAdding("")} />
              </div>
            )}
          </Card>
        )}
      </section>
    </>
  );
}
