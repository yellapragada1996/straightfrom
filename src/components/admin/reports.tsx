"use client";

import { useState } from "react";
import { adminActions, fmtDateTime, reportTargetName, timeAgo, useAdmin, type Report } from "@/lib/admin-store";
import { Btn, Field, inputCls, PageTitle, StatusPill, Tabs, useToast } from "../creator/ui";
import { Empty } from "./bits";

// Fans report an item or a page from a link on it. Real app: a small form that
// saves a row here and emails the admin.

export function AdminReports() {
  const s = useAdmin();
  const [tab, setTab] = useState<"open" | "resolved">("open");
  const list = s.reports.filter((r) => r.status === tab).sort((a, b) => b.at.localeCompare(a.at));
  const open = s.reports.filter((r) => r.status === "open").length;

  return (
    <>
      <PageTitle title="Reports" />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "open", label: "Open", count: open },
          { value: "resolved", label: "Closed" },
        ]}
      />
      {list.length === 0 ? (
        <Empty>{tab === "open" ? "No open reports." : "Nothing closed yet."}</Empty>
      ) : (
        <ul className="flex flex-col gap-4">
          {list.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </ul>
      )}
    </>
  );
}

const QUICK = ["No action needed", "Talked to the creator", "Hid the item", "Hid the page"];

function ReportCard({ report: r }: { report: Report }) {
  const s = useAdmin();
  const toast = useToast();
  const [closing, setClosing] = useState(false);
  const [note, setNote] = useState("");
  const target = reportTargetName(s, r);
  const item = r.target.kind === "item" ? s.items.find((p) => p.id === r.target.id) : undefined;
  const creatorId = r.target.kind === "creator" ? r.target.id : item?.creatorId;
  const creator = s.creators.find((c) => c.id === creatorId);

  return (
    <li className="border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <span className="text-sm text-muted">
          <b className="font-semibold text-ink">{r.id}</b> · {timeAgo(r.at)} · from {r.reporterEmail}
        </span>
        <StatusPill tone={r.status === "open" ? "red" : "muted"}>{r.reason}</StatusPill>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <p className="text-sm">
          <span className="text-muted">{r.target.kind === "item" ? "Item: " : "Page: "}</span>
          <b>{target}</b>
          {item && creator && <span className="text-muted"> by {creator.displayName}</span>}
        </p>
        <p className="border-l-2 border-line pl-3 text-[15px] leading-relaxed text-ink-2">{r.message}</p>

        {r.status === "resolved" ? (
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3 text-sm">
            <p className="min-w-0 flex-1 text-muted">Closed {r.resolvedAt && fmtDateTime(r.resolvedAt)}: {r.resolution}</p>
            <button type="button" onClick={() => adminActions.reopenReport(r.id)} className="underline underline-offset-2">Reopen</button>
          </div>
        ) : closing ? (
          <form
            className="flex flex-col gap-3 border-t border-line pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!note.trim()) return;
              adminActions.resolveReport(r.id, note.trim());
              toast("Report closed");
            }}
          >
            <div className="flex flex-wrap gap-1.5">
              {QUICK.map((q) => (
                <button key={q} type="button" onClick={() => setNote(q)} className={`h-8 border-[1.5px] px-2.5 text-[13px] font-semibold ${note === q ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}>
                  {q}
                </button>
              ))}
            </div>
            <Field label="What did you do?" htmlFor={`res-${r.id}`}>
              <input id={`res-${r.id}`} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} size={1} />
            </Field>
            <div className="flex gap-2">
              <Btn type="submit" size="sm" variant="dark" disabled={!note.trim()}>Close report</Btn>
              <Btn size="sm" variant="ghost" onClick={() => setClosing(false)}>Cancel</Btn>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2 border-t border-line pt-3">
            {item && <Btn size="sm" variant="outline" href={`/admin/items?q=${encodeURIComponent(item.title)}`}>Open item</Btn>}
            {creator && <Btn size="sm" variant="outline" href={`/admin/creators/${creator.id}`}>Open creator</Btn>}
            <Btn size="sm" variant="outline" href={`mailto:${r.reporterEmail}`} icon="mail">Reply</Btn>
            <Btn size="sm" variant="dark" onClick={() => setClosing(true)}>Close report</Btn>
          </div>
        )}
      </div>
    </li>
  );
}
