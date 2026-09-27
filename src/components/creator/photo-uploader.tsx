"use client";

/* eslint-disable @next/next/no-img-element -- local previews (blob: URLs) aren't served through next/image */

import { useRef, useState } from "react";
import { resizeImage } from "@/lib/image-resize";
import { Icon } from "../icons";

export const MAX_PHOTOS = 8;

/**
 * 1–8 photos. First one is the cover. Reorder by dragging (desktop) or the
 * arrow buttons (phones), tap "Make cover" to jump one to the front.
 * Photos are resized in the browser first (the real app then uploads them).
 */
export function PhotoUploader({ photos, onChange, error }: { photos: string[]; onChange: (p: string[]) => void; error?: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(0);
  const room = MAX_PHOTOS - photos.length;

  async function addFiles(files: FileList | null) {
    if (!files) return;
    const picked = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, room);
    if (!picked.length) return;
    setBusy(picked.length);
    const urls = await Promise.all(picked.map((f) => resizeImage(f).catch(() => null)));
    setBusy(0);
    onChange([...photos, ...urls.filter((u): u is string => !!u)]);
  }
  const move = (from: number, to: number) => {
    if (to < 0 || to >= photos.length || from === to) return;
    const next = [...photos];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onChange(next);
  };
  const remove = (i: number) => onChange(photos.filter((_, j) => j !== i));

  return (
    <div>
      <div
        className={`grid grid-cols-3 gap-2 md:grid-cols-4 ${over ? "outline-2 outline-offset-4 outline-accent outline-dashed" : ""}`}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setOver(true);
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          if (e.dataTransfer.files.length) {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }
          setOver(false);
        }}
      >
        {photos.map((src, i) => (
          <div
            key={src}
            draggable
            onDragStart={() => setDragFrom(i)}
            onDragOver={(e) => dragFrom !== null && e.preventDefault()}
            onDrop={(e) => {
              if (dragFrom !== null) {
                e.preventDefault();
                e.stopPropagation();
                move(dragFrom, i);
              }
              setDragFrom(null);
            }}
            onDragEnd={() => setDragFrom(null)}
            className={`group relative aspect-[4/5] cursor-grab overflow-hidden bg-tile active:cursor-grabbing ${dragFrom === i ? "opacity-40" : ""}`}
          >
            <img src={src} alt={`Photo ${i + 1}`} className="size-full object-cover" />
            {i === 0 ? (
              <span className="absolute top-1.5 left-1.5 bg-ink px-1.5 py-1 text-[10px] font-bold tracking-[0.08em] text-white uppercase">Cover</span>
            ) : (
              <button
                type="button"
                onClick={() => move(i, 0)}
                aria-label={`Make photo ${i + 1} the cover`}
                title="Make cover"
                className="absolute top-1.5 left-1.5 grid size-7 place-items-center bg-white/95 hover:bg-white"
              >
                <Icon name="star" className="size-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Remove photo ${i + 1}`}
              className="absolute top-1.5 right-1.5 grid size-7 place-items-center bg-white/95 hover:bg-white"
            >
              <Icon name="close" className="size-3.5" />
            </button>
            <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between">
              <button
                type="button"
                onClick={() => move(i, i - 1)}
                disabled={i === 0}
                aria-label="Move earlier"
                className="grid size-7 place-items-center bg-white/95 disabled:invisible"
              >
                <Icon name="chevronLeft" className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => move(i, i + 1)}
                disabled={i === photos.length - 1}
                aria-label="Move later"
                className="grid size-7 place-items-center bg-white/95 disabled:invisible"
              >
                <Icon name="chevronRight" className="size-4" />
              </button>
            </div>
          </div>
        ))}

        {Array.from({ length: busy }).map((_, i) => (
          <div key={`busy${i}`} className="grid aspect-[4/5] animate-pulse place-items-center bg-tile text-[12px] text-muted">Preparing…</div>
        ))}

        {room > 0 && !busy && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex aspect-[4/5] flex-col items-center justify-center gap-1.5 border-[1.5px] border-dashed border-muted bg-soft px-2 text-center text-[13px] font-semibold text-ink-2 hover:border-ink hover:text-ink"
          >
            <Icon name="camera" className="size-6" />
            {photos.length ? "Add more" : "Add photos"}
            <span className="text-[11px] font-normal text-muted">{photos.length}/{MAX_PHOTOS}</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
      {error ? (
        <p className="mt-2 text-[13px] text-accent" role="alert">{error}</p>
      ) : (
        <p className="mt-2 text-[13px] leading-snug text-muted">
          First photo is the cover. A photo of you wearing or using it is the best proof it&apos;s really yours. Portrait photos look best.
        </p>
      )}
    </div>
  );
}

/** Round profile photo picker, previewed inside the red story ring. */
export function AvatarPicker({ src, onChange, name }: { src: string; onChange: (url: string) => void; name: string }) {
  const input = useRef<HTMLInputElement>(null);
  const initials = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  return (
    <div className="flex items-center gap-4">
      <button type="button" onClick={() => input.current?.click()} className="relative block size-[88px] shrink-0 rounded-full bg-accent p-[3px]" aria-label="Choose profile photo">
        {src ? (
          <img src={src} alt="" className="size-full rounded-full border-[3px] border-white object-cover" />
        ) : (
          <span className="grid size-full place-items-center rounded-full border-[3px] border-white bg-tile font-display text-2xl font-extrabold text-ink-2">{initials}</span>
        )}
        <span className="absolute -right-0.5 -bottom-0.5 grid size-8 place-items-center rounded-full border-2 border-white bg-ink text-white">
          <Icon name="camera" className="size-4" />
        </span>
      </button>
      <div className="text-[13px] leading-snug text-muted">
        <button type="button" onClick={() => input.current?.click()} className="mb-1 block text-sm font-semibold text-ink underline underline-offset-4">
          {src ? "Change photo" : "Add a photo"}
        </button>
        Use the same photo as your Instagram or YouTube so fans recognise you instantly.
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) resizeImage(f, 600).then(onChange).catch(() => {});
          e.target.value = "";
        }}
      />
    </div>
  );
}
