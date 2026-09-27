"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdmin } from "@/lib/admin-store";
import { fmtDate } from "@/lib/creator-store";
import { feeFor, fmtFee } from "@/lib/fees";
import { money } from "@/lib/format";
import { usePlatform } from "@/lib/platform-store";
import { Btn, Card } from "../creator/ui";
import { AdminTitle, CreatorAvatar, SectionTitle } from "./bits";
import { CreatorFeeEditor, CustomRateAdder, PendingFeeEditor, PlatformFeeEditor } from "./fee-controls";

export function AdminFees() {
  const s = useAdmin();
  const p = usePlatform();
  const [editing, setEditing] = useState<string | null>(null);
  const custom = s.creators.filter((c) => p.creatorFees[c.id]);
  const waiting = Object.entries(p.pendingFees);
  const example = 10000;

  return (
    <>
      <AdminTitle title="Fees" />

      <Card className="mb-8">
        <PlatformFeeEditor key={p.defaultFeeBps} />
        <p className="mt-4 border-t border-line pt-4 text-sm text-ink-2">
          On a {money(example)} item, the creator gets <b>{money(example - feeFor(example, p.defaultFeeBps))}</b> plus the shipping they charge.
          A new rate applies to new orders only.
        </p>
      </Card>

      <section>
        <SectionTitle>Creators with their own fee</SectionTitle>
        <p className="-mt-1 mb-4 text-sm text-muted">They pay this instead of the platform fee. Other creators never see it.</p>

        {(custom.length > 0 || waiting.length > 0) && (
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
            {waiting.map(([email, f]) => (
              <li key={email} className="border-t border-line px-4 py-3 first:border-t-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full border-[1.5px] border-dashed border-muted text-muted">@</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{email}</span>
                    <span className="block text-[13px] text-muted">Applies when they sign up · {f.note || "No note"}</span>
                  </span>
                  <span className="font-display text-2xl font-extrabold tabular-nums">{fmtFee(f.feeBps)}</span>
                  {editing !== email && <Btn size="sm" variant="outline" onClick={() => setEditing(email)}>Change</Btn>}
                </div>
                {editing === email && (
                  <div className="mt-4 border-t border-line pt-4">
                    <PendingFeeEditor email={email} onDone={() => setEditing(null)} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <Card>
          <CustomRateAdder />
        </Card>
      </section>
    </>
  );
}
