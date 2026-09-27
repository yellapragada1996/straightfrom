"use client";

/* eslint-disable @next/next/no-img-element -- previews can be local data: URLs */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { creatorActions, newProductId, slugify, useCreatorState } from "@/lib/creator-store";
import { creatorEarns, feePercent, platformFee } from "@/lib/fees";
import { firstSentence, money } from "@/lib/format";
import type { Product } from "@/lib/types";
import { Icon } from "../icons";
import { MAX_PHOTOS, PhotoUploader } from "./photo-uploader";
import { Btn, Card, Field, inputCls, useToast } from "./ui";

const DEFAULT_SHIPPING = 2000; // pre-filled suggestion, creator can change it
const STORY_MAX = 1000;

const toCents = (v: string) => Math.round(parseFloat(v.replace(/[^0-9.]/g, "")) * 100) || 0;
const toDollars = (c: number) => (c ? (c / 100).toString() : "");

export function ItemEditor({ id }: { id?: string }) {
  const s = useCreatorState();
  const existing = id ? s.products.find((p) => p.id === id) : undefined;
  if (id && !existing) {
    return (
      <div className="flex flex-col items-start gap-3">
        <h1 className="font-display text-4xl font-extrabold uppercase">Piece not found</h1>
        <Btn href="/dashboard/items" variant="outline">Back to your pieces</Btn>
      </div>
    );
  }
  // key: reset the form if we navigate between pieces
  return <EditorForm key={id ?? "new"} existing={existing} handle={s.profile?.handle ?? ""} />;
}

function EditorForm({ existing, handle }: { existing?: Product; handle: string }) {
  const router = useRouter();
  const toast = useToast();
  const sold = existing?.status === "sold_out";

  const [photos, setPhotos] = useState<string[]>(existing?.images ?? []);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [story, setStory] = useState(existing?.description ?? "");
  const [price, setPrice] = useState(toDollars(existing?.priceCents ?? 0));
  const [shipping, setShipping] = useState(toDollars(existing?.shippingCents ?? DEFAULT_SHIPPING));
  const [quantity, setQuantity] = useState(existing?.quantity ?? 1);
  const [showAdvanced, setShowAdvanced] = useState((existing?.quantity ?? 1) > 1);
  const [tried, setTried] = useState(false);

  const priceC = toCents(price);
  const shipC = toCents(shipping);
  const errors = {
    photos: photos.length === 0 ? "Add at least one photo." : null,
    title: !title.trim() ? "Give it a title." : null,
    price: priceC < 100 ? "Set a price of at least $1." : null,
    shipping: shipping.trim() === "" ? "Set a shipping price (it can be $0)." : null,
  };
  const valid = !Object.values(errors).some(Boolean);

  function save(status: Product["status"]) {
    if (status === "available") {
      setTried(true);
      if (!valid) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
    const p: Product = {
      id: existing?.id ?? newProductId(),
      creatorId: existing?.creatorId ?? "me",
      slug: existing?.slug ?? slugify(title),
      title: title.trim(),
      description: story.trim(),
      priceCents: priceC,
      shippingCents: shipC,
      quantity: Math.max(1, quantity),
      status,
      images: photos,
      createdAt: existing?.createdAt ?? new Date().toISOString().slice(0, 10),
    };
    creatorActions.saveProduct(p);
    toast(status === "available" ? (existing?.status === "available" ? "Changes saved" : "Published! It's on your page.") : "Saved as a draft");
    router.push("/dashboard/items");
  }

  if (sold) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/dashboard/items" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><Icon name="back" className="size-4" /> Your pieces</Link>
        <h1 className="font-display text-[40px] leading-[0.9] font-extrabold uppercase">{existing!.title}</h1>
        <p className="text-ink-2">This piece has sold, so it can&apos;t be edited. It stays on your page as SOLD.</p>
        <Btn href="/dashboard/orders" variant="outline" className="self-start">See the order</Btn>
      </div>
    );
  }

  const isLive = existing?.status === "available" || existing?.status === "reserved";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard/items" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><Icon name="back" className="size-4" /> Your pieces</Link>
        <h1 className="mt-2 font-display text-[40px] leading-[0.88] font-extrabold tracking-[-0.045em] uppercase md:text-[56px]">
          {existing ? "Edit piece" : "New piece"}
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="flex flex-col gap-5">
          <Card>
            <h2 className="mb-1 font-display text-lg font-extrabold uppercase">Photos</h2>
            <p className="mb-4 text-[13px] text-muted">Up to {MAX_PHOTOS}. Drag or use the arrows to reorder.</p>
            <PhotoUploader photos={photos} onChange={setPhotos} error={tried ? errors.photos : null} />
          </Card>

          <Card className="flex flex-col gap-5">
            <h2 className="-mb-1 font-display text-lg font-extrabold uppercase">The piece</h2>
            <Field label="Title" htmlFor="title" error={tried ? errors.title : null} hint="Name it after the moment fans remember.">
              <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className={inputCls} placeholder="e.g. The rain jacket from the Japan vlog" />
            </Field>
            <Field
              label="The story"
              htmlFor="story"
              optional
              aside={<span className="text-xs text-muted">{story.length}/{STORY_MAX}</span>}
              hint="This is what makes it worth owning. Include size and condition if it's clothing."
            >
              <textarea
                id="story"
                value={story}
                onChange={(e) => setStory(e.target.value.slice(0, STORY_MAX))}
                rows={5}
                className={`${inputCls} h-auto py-3 leading-relaxed`}
                placeholder="Where's this from? When did you wear or use it? Any moment fans would remember?"
              />
            </Field>
          </Card>

          <Card className="flex flex-col gap-5">
            <h2 className="-mb-1 font-display text-lg font-extrabold uppercase">Price & shipping</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Price" htmlFor="price" error={tried ? errors.price : null}>
                <MoneyInput id="price" value={price} onChange={setPrice} placeholder="0" />
              </Field>
              <Field label="Shipping" htmlFor="shipping" error={tried ? errors.shipping : null} hint="Roughly what it'll cost you to ship. Fans see it before they buy.">
                <MoneyInput id="shipping" value={shipping} onChange={setShipping} placeholder="20" />
              </Field>
            </div>
            <p className="-mt-2 text-[13px] leading-snug text-muted">
              If a fan buys several of your pieces together, they pay the highest shipping price once, since it&apos;s one package.
            </p>

            <div className="border-t border-line pt-4">
              <button type="button" onClick={() => setShowAdvanced((v) => !v)} aria-expanded={showAdvanced} className="flex items-center gap-1.5 text-sm font-semibold">
                <Icon name={showAdvanced ? "minus" : "plus"} className="size-4" /> More than one of these?
              </button>
              {showAdvanced && (
                <div className="mt-3 max-w-[220px]">
                  <Field label="How many do you have?" htmlFor="qty" hint="e.g. a pack of signed polaroids. Most pieces are one of one.">
                    <input
                      id="qty"
                      type="number"
                      min={1}
                      max={50}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                      className={inputCls}
                    />
                  </Field>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Preview + earnings + actions (sticky on desktop) */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-8">
          <Card className="p-4">
            <p className="mb-3 text-xs font-bold tracking-[0.08em] text-muted uppercase">How fans see it</p>
            <div className="relative aspect-[4/5] overflow-hidden bg-tile">
              {photos[0] ? <img src={photos[0]} alt="" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-muted"><Icon name="camera" className="size-8" /></span>}
              {quantity > 1 && <span className="absolute top-2.5 right-2.5 rotate-3 bg-white px-1.5 font-hand text-lg leading-tight font-semibold text-accent">{quantity} left!</span>}
              <span className="absolute bottom-0 left-0 bg-ink px-2.5 pt-2 pb-1.5 font-display text-lg leading-none font-extrabold text-white">{money(priceC)}</span>
            </div>
            <p className="mt-2.5 line-clamp-2 text-[15px] leading-snug font-semibold">{title || "Your title"}</p>
            {story && <p className="mt-1 line-clamp-2 font-serif text-[17px] leading-tight text-ink-2 italic">“{firstSentence(story)}”</p>}
          </Card>

          <Card className="p-4">
            <p className="text-xs font-bold tracking-[0.08em] text-muted uppercase">You&apos;ll earn</p>
            <p className="mt-1 font-display text-[34px] leading-none font-extrabold tracking-tight">{money(creatorEarns(priceC, shipC))}</p>
            <dl className="mt-3 flex flex-col gap-1 text-[13px]">
              <div className="flex justify-between"><dt className="text-muted">Price</dt><dd className="tabular-nums">{money(priceC)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">StraightFrom fee ({feePercent})</dt><dd className="tabular-nums">−{money(platformFee(priceC))}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Shipping (all yours)</dt><dd className="tabular-nums">+{money(shipC)}</dd></div>
            </dl>
            <p className="mt-3 text-[12.5px] leading-snug text-muted">Paid to your bank 7 days after you add tracking.</p>
          </Card>

          <div className="flex flex-col gap-2">
            <Btn size="lg" full onClick={() => save("available")} icon={isLive ? "check" : undefined}>
              {isLive ? "Save changes" : "Publish"}
            </Btn>
            {!isLive && (
              <Btn size="lg" variant="outline" full onClick={() => save("draft")}>Save as draft</Btn>
            )}
            {isLive && (
              <Btn size="md" variant="ghost" full onClick={() => save("draft")}>Unpublish</Btn>
            )}
            {existing && !isLive && (
              <button
                type="button"
                onClick={() => {
                  creatorActions.deleteDraft(existing.id);
                  toast("Deleted");
                  router.push("/dashboard/items");
                }}
                className="mt-1 inline-flex items-center justify-center gap-1.5 text-[13px] text-muted hover:text-accent"
              >
                <Icon name="trash" className="size-4" /> Delete this draft
              </button>
            )}
            {tried && !valid && <p className="text-center text-[13px] text-accent">Fill in the highlighted fields to publish.</p>}
            {handle && isLive && existing && (
              <p className="text-center text-[12.5px] text-muted">straightfrom.co/{handle}/{existing.slug}</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function MoneyInput({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex items-stretch border-[1.5px] border-line bg-white focus-within:border-ink">
      <span className="flex items-center pl-3.5 text-[16px] font-semibold text-muted">$</span>
      <input
        id={id}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        placeholder={placeholder}
        className="h-12 min-w-0 flex-1 bg-transparent px-2 text-[16px] font-semibold outline-none placeholder:font-normal placeholder:text-[#9a9a9a]"
      />
      <span className="flex items-center pr-3.5 text-[13px] text-muted">USD</span>
    </div>
  );
}
