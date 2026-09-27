"use client";

import { fmtDateTime, useAdmin } from "@/lib/admin-store";
import { PageTitle } from "../creator/ui";
import { Empty } from "./bits";

/** Everything the admin changed, newest first. Real app: an append-only table. */
export function AdminActivity() {
  const s = useAdmin();
  return (
    <>
      <PageTitle title="Activity" />
      <p className="-mt-3 mb-5 text-sm text-muted">Every change made from admin, newest first. It can&apos;t be edited.</p>
      {s.log.length === 0 ? (
        <Empty>Nothing yet.</Empty>
      ) : (
        <ol className="border border-line bg-white">
          {s.log.map((l) => (
            <li key={l.id} className="flex flex-col gap-0.5 border-t border-line px-4 py-3 first:border-t-0 sm:flex-row sm:gap-4">
              <span className="w-36 shrink-0 text-[13px] text-muted tabular-nums">{fmtDateTime(l.at)}</span>
              <span className="text-sm">{l.text}</span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
