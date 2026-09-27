// StraightFrom mockup — sample data and rendering for creator.html and item.html.
// Photos are hot-linked from Unsplash for mockup purposes only.

(function () {
  const IMG = (id, w = 600, ratio = 1.25) =>
    `https://images.unsplash.com/photo-${id}?w=${w}&h=${Math.round(w * ratio)}&fit=crop&auto=format&q=70`;

  const CREATOR = {
    first: "Maya",
    last: "Okafor",
    handle: "mayaokafor",
    avatar: "1580489944761-15a19d654956",
    bio: "Travel vlogs, too many jackets, and the gear that made it all happen. Everything here is mine, and now it can be yours.",
    socials: [
      { key: "youtube", label: "YouTube" },
      { key: "instagram", label: "Instagram" },
      { key: "tiktok", label: "TikTok" },
    ],
  };
  CREATOR.name = `${CREATOR.first} ${CREATOR.last}`;

  const SHIPS_TO = "Ships to US & Canada";

  // Available first (newest first), sold at the end.
  const ITEMS = [
    {
      id: "yellow-rain-jacket", title: "Yellow rain jacket", price: 180, ship: 15, qty: 1,
      imgs: ["1622630893218-52686fbdde23", "1527192250228-1ece59813102", "1635968691555-cb542a102cc9", "1622630982116-33931c755f94"],
      story: "Bought this the morning it poured in Kyoto and basically never took it off. It's in almost every shot of the Japan vlog. Size M. There's a tiny scuff on the left cuff, which honestly adds character. It deserves more trips than my closet can give it.",
    },
    {
      id: "qa-hoodie", title: "The hoodie from every Q&A", price: 95, ship: 12, qty: 1,
      imgs: ["1556821840-3a63f95609a7"],
      story: "If you've watched a single Q&A, you've seen this hoodie. Washed a hundred times, softest thing I own. Size L, oversized on me.",
    },
    {
      id: "leather-boots", title: "Leather boots, two continents in", price: 120, ship: 18, qty: 1,
      imgs: ["1575987116913-e96e7d490b8a"],
      story: "Iceland, Portugal, and one very muddy week in Scotland. Resoled once. Women's US 8.",
    },
    {
      id: "vintage-denim-jacket", title: "Vintage denim jacket", price: 150, ship: 15, qty: 1,
      imgs: ["1611312449408-fcece27cdbb7"],
      story: "Found it at a flea market in Porto and wore it through the whole Portugal series. Size S, fits like an M.",
    },
    {
      id: "gifted-sneakers", title: "Gifted sneakers, never worn", price: 85, ship: 15, qty: 2,
      imgs: ["1600185365483-26d7a4cc7519"],
      story: "A brand sent me doubles of these. Brand new, still in the box. US 9, two pairs available.",
    },
    {
      id: "canon-ae1", title: "Canon AE-1 film camera", price: 240, ship: 15, qty: 0, sold: true,
      imgs: ["1491796014055-e6835cdcd4c6"],
      story: "The camera behind every film photo on my Instagram. Works perfectly.",
    },
    {
      id: "canvas-tote", title: "Canvas tote from Lisbon", price: 45, ship: 8, qty: 0, sold: true,
      imgs: ["1548863227-3af567fc3b27"],
      story: "My everyday bag for two years.",
    },
    {
      id: "first-ring-light", title: "My very first ring light", price: 60, ship: 20, qty: 0, sold: true,
      imgs: ["1673196649671-eb09066ad6c1"],
      story: "Every video from my first year was lit by this.",
    },
  ];

  // ---------- Icons ----------
  const P = {
    share: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8"/>',
    youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5v5l4.5-2.5z"/>',
    tiktok: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.4 2.6 2.4 4.6 5 5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  };
  const ic = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${P[name]}</svg>`;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const money = (n) => `$${n}`;
  const firstSentence = (s) => {
    const f = s.split(/(?<=[.!?])\s/)[0];
    return f.length > 80 ? f.slice(0, 78).trim() + "…" : f;
  };

  // ---------- Shared pieces ----------
  const wm = () => `<span class="wm"><b>straight</b><i>from</i></span>`;
  const ring = (size = 240) => `<span class="ring"><img src="${IMG(CREATOR.avatar, size, 1)}" alt=""></span>`;

  const card = (it, { feature = false } = {}) => `
    <a class="card${feature ? " feature" : ""}${it.sold ? " is-sold" : ""}" href="item.html?id=${it.id}">
      <div class="ph">
        <img src="${IMG(it.imgs[0], feature ? 900 : 500)}" alt="${it.title}" loading="lazy">
        ${it.sold ? '<span class="sold-tag">Sold</span>' : ""}
        ${feature && !it.sold ? '<span class="tag-new">Just listed</span>' : ""}
        ${!it.sold && it.qty > 1 ? `<span class="tag-qty">${it.qty} available</span>` : ""}
        <span class="tag-price">${money(it.price)}</span>
      </div>
      <p class="card-title">${it.title}</p>
      ${it.sold ? "" : `<p class="snip">“${firstSentence(it.story)}”</p>`}
    </a>`;

  const footer = () => `
    <footer class="foot">
      <div class="wrap">
        <p class="foot-cta">Got stuff your fans want?</p>
        <a class="btn-red" href="#">Start selling, it's free ${ic("arrow")}</a>
        <div class="foot-giant">${wm()}</div>
        <div class="foot-legal">
          <span>straightfrom.co</span>
          <nav aria-label="Legal"><a href="#">Terms</a><a href="#">Privacy</a></nav>
        </div>
      </div>
    </footer>
    <div class="toast" role="status" aria-live="polite"></div>`;

  let toastTimer;
  function toast(msg) {
    const t = $(".toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
  }

  function wireShare() {
    $$("[data-share]").forEach((b) =>
      b.addEventListener("click", async () => {
        const url = location.href;
        try {
          if (navigator.share) await navigator.share({ url });
          else { await navigator.clipboard.writeText(url); toast("Link copied"); }
        } catch (_) { toast("Link copied"); }
      })
    );
  }

  // ---------- Creator page ----------
  function creator() {
    const available = ITEMS.filter((i) => !i.sold);
    const sold = ITEMS.filter((i) => i.sold);
    document.title = `${CREATOR.name} (@${CREATOR.handle}) · StraightFrom`;

    const tickerItems = [
      `${available.length} available now`,
      `${sold.length} already gone`,
      `Packed & shipped by ${CREATOR.first}`,
      `Real stuff from a real closet`,
    ];
    const tickerRun = tickerItems.map((t) => `<span>${t}</span><span class="star">✦</span>`).join("");

    $("#app").innerHTML = `
      <header class="topbar">
        <div class="wrap">
          <a href="#" aria-label="StraightFrom">${wm()}</a>
          <button class="icon-btn" type="button" data-share aria-label="Share this page">${ic("share")}</button>
        </div>
      </header>

      <main>
        <section class="wrap hero">
          <h1 class="hero-name"><span>${CREATOR.first}</span><span>${CREATOR.last}</span></h1>
          <div class="hero-side">
            ${ring(280)}
            <p class="hero-handle">@${CREATOR.handle}</p>
            <p class="hero-bio">${CREATOR.bio}</p>
            <div class="links">
              ${CREATOR.socials.map((s) => `<a class="social" href="#">${ic(s.key)}${s.label}</a>`).join("")}
            </div>
          </div>
        </section>

        <div class="ticker" aria-label="${available.length} available, ${sold.length} sold">
          <div class="ticker-track" aria-hidden="true">${tickerRun}${tickerRun}${tickerRun}${tickerRun}</div>
        </div>

        <section class="wrap sec" aria-labelledby="closet-h">
          <div class="sec-head">
            <h2 class="sec-title" id="closet-h">The closet<sup>${available.length}</sup></h2>
          </div>
          <div class="grid">
            ${available.map((it, i) => card(it, { feature: i === 0 })).join("")}
          </div>
        </section>

        <section class="wrap sec sold-sec" aria-labelledby="sold-h">
          <div class="sec-head">
            <h2 class="sec-title" id="sold-h">Already gone<sup>${sold.length}</sup></h2>
          </div>
          <div class="grid">${sold.map((it) => card(it)).join("")}</div>
        </section>
      </main>
      ${footer()}`;

    wireShare();
  }

  // ---------- Item page ----------
  function item() {
    const q = new URLSearchParams(location.search);
    const it = ITEMS.find((i) => i.id === q.get("id")) || ITEMS[0];
    const state = it.sold ? "sold" : q.get("state") || "available"; // available | reserved | sold
    const total = it.price + it.ship;
    const more = ITEMS.filter((i) => i.id !== it.id && !i.sold).slice(0, 4);
    document.title = `${it.title} · straight from @${CREATOR.handle}`;

    const chip = state === "sold" ? "" : it.qty > 1 ? `<span class="chip red">${it.qty} available</span>` : `<span class="chip">One of one</span>`;

    const buyArea = {
      available: `
        <div>
          <button class="btn-buy" type="button" data-buy><span>Buy it · ${money(total)}</span>${ic("arrow")}</button>
          <p class="fine">Includes ${money(it.ship)} shipping. No account needed.</p>
        </div>`,
      reserved: `
        <div>
          <button class="btn-buy" type="button" disabled>${ic("clock")}<span>Someone's checking out</span></button>
          <p class="notice">Someone is paying for this right now. If they don't finish, it's back on sale within 30 minutes.</p>
        </div>`,
      sold: `
        <div class="sold-box">
          <p class="sold-label">Sold<em>.</em> It's gone.</p>
          <p>This one has found a new home.</p>
          <a class="btn-secondary" href="creator.html"><span>See what else ${CREATOR.first} has</span>${ic("arrow")}</a>
        </div>`,
    }[state];

    const hasBar = state !== "sold";
    document.body.classList.toggle("has-buybar", hasBar);

    $("#app").innerHTML = `
      <header class="topbar">
        <div class="wrap">
          <a class="creator-chip" href="creator.html" aria-label="Back to ${CREATOR.name}'s page">
            ${ic("back")}
            ${ring(96)}
            <b>@${CREATOR.handle}</b>
          </a>
          <button class="icon-btn" type="button" data-share aria-label="Share this item">${ic("share")}</button>
        </div>
      </header>

      <main class="wrap item">
        <div class="gallery">
          <div class="stage${state === "sold" ? " is-sold" : ""}">
            <div class="carousel" tabindex="0" aria-label="Photos of ${it.title}">
              ${it.imgs.map((id, i) => `<img src="${IMG(id, 900)}" alt="${it.title}, photo ${i + 1}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}>`).join("")}
            </div>
            ${state === "sold" ? '<span class="sold-tag">Sold</span>' : ""}
            ${it.imgs.length > 1 ? `<span class="counter">1/${it.imgs.length}</span>` : ""}
          </div>
          ${it.imgs.length > 1 ? `
          <div class="thumbs">
            ${it.imgs.map((id, i) => `<button class="thumb" type="button" aria-label="Show photo ${i + 1}" aria-current="${i === 0}"><img src="${IMG(id, 160)}" alt=""></button>`).join("")}
          </div>` : ""}
        </div>

        <div class="info">
          <div>
            <p class="sigline"><i>straight from</i><b>@${CREATOR.handle}</b></p>
            <h1 class="title">${it.title}</h1>
          </div>
          <div class="price-row">
            <span class="price-lg${state === "sold" ? " is-sold" : ""}">${money(it.price)}</span>
            ${chip}
          </div>
          <p class="ship">+ ${money(it.ship)} shipping · ${SHIPS_TO}</p>

          ${buyArea}

          <section class="story" aria-labelledby="story-h">
            <h2 class="eyebrow" id="story-h">The story</h2>
            <span class="qmark" aria-hidden="true">“</span>
            <blockquote>${it.story}</blockquote>
            <p class="sig"><img src="${IMG(CREATOR.avatar, 96, 1)}" alt="">${CREATOR.first}</p>
          </section>

          <ul class="how" aria-label="How buying works">
            <li><span class="n">01</span><strong>${CREATOR.first} ships it personally</strong><span class="d">Straight from their place to yours.</span></li>
            <li><span class="n">02</span><strong>Tracking in your inbox</strong><span class="d">As soon as it's on its way.</span></li>
            <li><span class="n">03</span><strong>Ships in 7 days or you're refunded</strong><span class="d">Automatically. No need to ask.</span></li>
            <li><span class="n">04</span><strong>Secure checkout by Stripe</strong><span class="d">Card, Link and more. No account.</span></li>
          </ul>

          <a class="report" href="mailto:report@straightfrom.co?subject=Report%20straightfrom.co%2F${CREATOR.handle}%2F${it.id}">Report this item</a>
        </div>
      </main>

      <section class="wrap sec" aria-labelledby="more-h">
        <div class="sec-head">
          <h2 class="sec-title" id="more-h">More from ${CREATOR.first}</h2>
          <a href="creator.html">See all</a>
        </div>
        <div class="grid">${more.map((m) => card(m)).join("")}</div>
      </section>

      ${footer()}

      ${hasBar ? `
      <div class="buybar" aria-hidden="true">
        <img src="${IMG(it.imgs[0], 120)}" alt="">
        <div class="bb-text">
          <p class="bb-title">${it.title}</p>
          <p class="bb-price">${money(total)} <span>incl. shipping</span></p>
        </div>
        ${state === "available"
          ? `<button class="btn-buy" type="button" data-buy tabindex="-1"><span>Buy it</span></button>`
          : `<button class="btn-buy" type="button" disabled tabindex="-1"><span>On hold</span></button>`}
      </div>` : ""}`;

    // Gallery: swipe + thumbnails + counter stay in sync
    const car = $(".carousel");
    const thumbs = $$(".thumb");
    const counter = $(".counter");
    const n = it.imgs.length;
    car.addEventListener("scroll", () => {
      const i = Math.round(car.scrollLeft / car.clientWidth);
      if (counter) counter.textContent = `${i + 1}/${n}`;
      thumbs.forEach((t, j) => t.setAttribute("aria-current", String(j === i)));
    }, { passive: true });
    thumbs.forEach((t, j) => t.addEventListener("click", () => car.scrollTo({ left: j * car.clientWidth, behavior: "smooth" })));

    // Pinned buy bar appears once the main Buy button scrolls out of view
    const mainBtn = $(".info .btn-buy");
    const bar = $(".buybar");
    if (mainBtn && bar) {
      new IntersectionObserver(([e]) => {
        bar.classList.toggle("show", !e.isIntersecting && e.boundingClientRect.top < 0);
      }).observe(mainBtn);
    }

    $$("[data-buy]").forEach((b) => b.addEventListener("click", () => toast("In the real app, this opens Stripe Checkout")));
    wireShare();
  }

  window.SF = { creator, item };
})();
