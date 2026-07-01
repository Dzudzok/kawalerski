/* =========================================================================
   Strona informacyjna wyjazdu: zaliczki, lot, domek, koszty + personalizacja.
   ========================================================================= */
(function () {
  "use strict";

  // ---------- Helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const firstName = (full) => full.split(" ")[0];
  const zl = (n) =>
    Number(n).toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " zł";

  // ---------- Supabase (wpłaty na żywo z panelu /admin) ----------
  const hasSupabase =
    window.SUPABASE_URL && !String(window.SUPABASE_URL).startsWith("WKLEJ") &&
    window.SUPABASE_ANON_KEY && !String(window.SUPABASE_ANON_KEY).startsWith("WKLEJ");
  const sb = hasSupabase ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) : null;
  const PAY_TABLE = "kawalerski_payments";

  // ---------- Finanse ----------
  const PAYERS = PARTICIPANTS.filter((p) => p.pays);
  const N_PAYERS = PAYERS.length;
  const minibusZl = COSTS.minibusEUR * TRIP.eurRate;
  const flightPer = COSTS.flightTotal / N_PAYERS;
  const aptPer = COSTS.apartmentTotal / N_PAYERS;
  const busPer = minibusZl / N_PAYERS;
  const committedTotal = COSTS.flightTotal + COSTS.apartmentTotal + minibusZl;
  const perPayer = committedTotal / N_PAYERS; // udział 1 osoby płacącej
  const remainingFor = (p) => Math.max(0, perPayer - (p.paid || 0));

  // Etapy wpłat (narastająco). total = kwota całej ekipy w danym etapie.
  const STAGE_DEFS = [
    { when: "TERAZ", sub: "zaliczka", desc: "✈️ Samolot + 🏠 domek (1. część)", total: COSTS.flightTotal + PAYMENTS.apartmentPaid },
    { when: "do 15.07", sub: "2026", desc: "🏠 Reszta za domek", total: PAYMENTS.apartmentDue },
    { when: "do 30.07", sub: "2026", desc: "🚐 Transport (minibus) + reszta", total: minibusZl },
  ];
  // Doliczamy per osobę + progi narastające
  let acc = 0;
  const STAGES = STAGE_DEFS.map((s) => {
    const per = s.total / N_PAYERS;
    acc += per;
    return Object.assign({}, s, { per: per, cum: acc });
  });
  const stageOf = (paid) => {
    // ile etapów w pełni opłaconych (0..STAGES.length)
    let done = 0;
    for (const s of STAGES) { if (paid + 0.01 >= s.cum) done++; else break; }
    return done;
  };

  // ---------- Tożsamość + bramka ----------
  const WHO_KEY = "kawalerski_whoami";
  let whoami = localStorage.getItem(WHO_KEY) || "";

  function fillSelect(sel) {
    sel.innerHTML = "";
    const ph = el("option", "", "— wybierz siebie —");
    ph.value = "";
    sel.appendChild(ph);
    PARTICIPANTS.forEach((p) => {
      const o = el("option", "", p.name + (p.tag ? ` (${p.tag})` : ""));
      o.value = p.name;
      if (p.name === whoami) o.selected = true;
      sel.appendChild(o);
    });
  }
  function updateGate() {
    $("#gate").classList.toggle("open", !whoami);
    document.body.style.overflow = whoami ? "" : "hidden";
  }
  function setWhoami(name) {
    whoami = name;
    localStorage.setItem(WHO_KEY, whoami);
    $("#whoami").value = whoami;
    $("#gateSelect").value = whoami;
    updateGate();
    renderMyStatus();
    renderProgress();
    renderTeam();
    if (window.KawalerskiChat) KawalerskiChat.refresh();
  }
  function renderIdentity() {
    fillSelect($("#whoami"));
    fillSelect($("#gateSelect"));
    $("#whoami").onchange = (e) => setWhoami(e.target.value);
    $("#gateSelect").onchange = (e) => setWhoami(e.target.value);
    updateGate();
    renderMyStatus();
  }

  function renderMyStatus() {
    const box = $("#myStatus");
    const me = PARTICIPANTS.find((p) => p.name === whoami);
    if (!me) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = "";
    if (!me.pays) {
      box.appendChild(el("p", "ms-line", `🤵 <strong>${firstName(me.name)}</strong>, jesteś Panem Młodym — <strong>nie płacisz nic. 0 zł 🎉</strong>`));
      return;
    }
    const paid = me.paid || 0;
    const zaliczka = STAGES[0].cum;                 // ile trzeba TERAZ
    const dueNow = Math.max(0, zaliczka - paid);    // brakuje na zaliczkę
    box.appendChild(el("div", "ms-grid", `
      <div class="ms-item"><span>Zaliczka (teraz)</span><b>${zl(zaliczka)}</b></div>
      <div class="ms-item"><span>Wpłacono</span><b class="ok">${zl(paid)}</b></div>
      <div class="ms-item big"><span>${dueNow > 0 ? "Brakuje na zaliczkę (teraz)" : "Zaliczka opłacona"}</span>
        <b class="${dueNow > 0 ? "due" : "ok"}">${dueNow > 0 ? zl(dueNow) : "✅ 0 zł"}</b></div>
    `));
    box.appendChild(segBar(paid));
    const laterTotal = Math.max(0, perPayer - Math.max(paid, zaliczka));
    box.appendChild(el("p", "ms-note",
      dueNow > 0
        ? `Najpierw dopłać zaliczkę. Później: do 15.07 jeszcze ${zl(STAGES[1].per)}, do 30.07 ${zl(STAGES[2].per)}.`
        : (laterTotal > 0
            ? `Zaliczka OK 👍 Dalej: do 15.07 ${zl(STAGES[1].per)}, do 30.07 ${zl(STAGES[2].per)}.`
            : "Wszystko wpłacone — dziękujemy! 🍻")));
  }

  // Kolorowy pasek etapowy (3 równe kroki) z datami pod kreskami.
  const STAGE_DATES = ["teraz", "15.07", "30.07"];
  function segBar(paid) {
    paid = paid || 0;
    let prev = 0;
    let segs = "", labs = "";
    STAGES.forEach((s, i) => {
      const frac = Math.max(0, Math.min(1, (paid - prev) / s.per));
      const cls = frac >= 1 ? "done" : (frac > 0 ? "part" : "todo");
      segs += `<div class="seg ${cls}"><div class="seg-fill" style="width:${frac * 100}%"></div></div>`;
      const done = paid + 0.01 >= s.cum;
      labs += `<div class="seg-lab"><span class="seg-date ${done ? "ok" : ""}">${done ? "✅ " : ""}${STAGE_DATES[i]}</span><span class="seg-amt">${zl(s.per)}</span></div>`;
      prev = s.cum;
    });
    const wrap = el("div", "segbar-wrap");
    wrap.innerHTML = `<div class="segbar">${segs}</div><div class="seg-labels">${labs}</div>`;
    return wrap;
  }

  // ---------- Wpłaty ----------
  function renderPayments() {
    const collected = PAYERS.reduce((s, p) => s + (p.paid || 0), 0);
    const collectedNowTarget = STAGES[0].cum * N_PAYERS; // ile powinno być teraz (zaliczki)
    $("#payTotals").innerHTML = `
      <div class="pt-card"><span>Zaliczka / os (teraz)</span><b>${zl(STAGES[0].cum)}</b><small>samolot + domek cz.1</small></div>
      <div class="pt-card"><span>Zebrane zaliczki</span><b class="ok">${zl(collected)}</b><small>z ${zl(collectedNowTarget)} potrzebnych</small></div>
      <div class="pt-card"><span>Koszt całości / os</span><b>${zl(perPayer)}</b><small>do 30.07</small></div>`;

    renderTimeline();
    renderProgress();

    $("#payFoot").innerHTML =
      `Etapy: <strong>teraz</strong> ${zl(STAGES[0].per)} (lot ${zl(flightPer)} + domek cz.1 ${zl(PAYMENTS.apartmentPaid / N_PAYERS)}), ` +
      `<strong>15.07</strong> ${zl(STAGES[1].per)} (reszta domku), <strong>30.07</strong> ${zl(STAGES[2].per)} (minibus). ` +
      `Pan Młody nie płaci. Alkohol, jedzenie i imprezy — osobno, na miejscu.`;
  }

  function renderTimeline() {
    const t = $("#timeline");
    t.innerHTML = "";
    STAGES.forEach((s, i) => {
      const node = el("div", "tl-node");
      node.innerHTML = `
        <div class="tl-dot">${i + 1}</div>
        <div class="tl-body">
          <div class="tl-when">${s.when} <span class="tl-sub">${s.sub}</span></div>
          <div class="tl-desc">${s.desc}</div>
          <div class="tl-amt"><b>${zl(s.per)}</b> / os<span class="tl-cum">razem do ${zl(s.cum)}</span></div>
        </div>`;
      t.appendChild(node);
    });
  }

  function renderProgress() {
    const box = $("#progress");
    box.innerHTML = "";
    PARTICIPANTS.forEach((p) => {
      const row = el("div", "pg-row" + (p.name === whoami ? " me" : ""));
      if (!p.pays) {
        row.innerHTML = `<div class="pg-head"><span class="pg-name">${p.name} 🤵</span><span class="pg-status ok">nie płaci</span></div>`;
        box.appendChild(row);
        return;
      }
      const paid = p.paid || 0;
      const done = stageOf(paid);
      const pct = Math.max(0, Math.min(100, (paid / perPayer) * 100));
      let status, cls;
      if (done >= STAGES.length) { status = "✅ wszystko"; cls = "ok"; }
      else {
        const need = STAGES[done].cum - paid;
        const labels = ["zaliczka (teraz)", "do 15.07", "do 30.07"];
        status = `brakuje ${zl(need)} — ${labels[done]}`;
        cls = done === 0 ? "due" : "warn";
      }
      row.innerHTML = `
        <div class="pg-head">
          <span class="pg-name">${p.name}${p.note ? ` <em>(${p.note})</em>` : ""}</span>
          <span class="pg-paid">${zl(paid)}</span>
        </div>`;
      row.appendChild(segBar(paid));
      row.appendChild(el("div", "pg-status " + cls, status));
      box.appendChild(row);
    });
  }

  // ---------- Lot ----------
  function renderFlight() {
    const c = $("#flightCard");
    const legRow = (leg, arrow, label) => `
      <div class="leg">
        <div class="leg-top"><span class="leg-label">${arrow} ${label}</span><span class="leg-no">${leg.no}</span></div>
        <div class="leg-body">
          <div class="leg-pt"><b>${leg.from}</b><span>${leg.dep}</span></div>
          <div class="leg-arrow">✈</div>
          <div class="leg-pt right"><b>${leg.to}</b><span>${leg.arr}</span></div>
        </div>
      </div>`;
    let bookings = FLIGHT.bookings.map((b) =>
      `<div class="bk"><span class="bk-code">${b.code}</span><span class="bk-who">${b.who}</span><span class="bk-amt">${zl(b.amount)}</span></div>`
    ).join("");
    c.innerHTML = `
      <p class="apt-name">🛬 ${FLIGHT.airline}</p>
      ${legRow(FLIGHT.out, "➡️", "Wylot")}
      ${legRow(FLIGHT.back, "⬅️", "Powrót")}
      <div class="mini-sum"><span>Razem za loty</span><b>${zl(FLIGHT.total)}</b></div>
      <div class="mini-sum"><span>Na osobę płacącą (${N_PAYERS})</span><b>${zl(flightPer)}</b></div>
      <p class="hl-title" style="margin-top:16px">Kody potwierdzenia (kto na jakim)</p>
      <div class="bookings">${bookings}</div>
      <p class="hl-title" style="margin-top:18px">🧳 Bagaż Wizz Air — ważne!</p>
      <ul class="rules">${WIZZ_BAG.map((b) => `<li>${b}</li>`).join("")}</ul>`;
  }

  // ---------- Domek ----------
  function renderApartment() {
    const a = APARTMENT;
    const c = $("#aptCard");
    c.innerHTML = "";

    c.appendChild(el("p", "apt-name", "🏠 " + a.name));
    c.appendChild(el("p", "loc-addr", "📍 " + a.area));

    // Galeria
    if (a.images && a.images.length) {
      const gal = el("div", "gallery gallery-2");
      a.images.forEach((src) => {
        const btn = el("button", "gal-item");
        btn.type = "button";
        const img = el("img");
        img.loading = "lazy"; img.src = src; img.alt = a.name;
        btn.appendChild(img);
        btn.onclick = () => openLightbox(src, a.name);
        gal.appendChild(btn);
      });
      c.appendChild(gal);
    }

    // Zameldowanie
    c.appendChild(el("div", "checks", `
      <div class="check"><span>Zameldowanie</span><b>${a.checkin}</b></div>
      <div class="check"><span>Wymeldowanie</span><b>${a.checkout}</b></div>
      <div class="check"><span>Wejście</span><b>${a.selfCheckin}</b></div>
      <div class="check"><span>Maks. gości</span><b>${a.maxGuests}</b></div>`));

    // Koszt domku
    c.appendChild(el("div", "mini-sum", `<span>Domek razem</span><b>${zl(COSTS.apartmentTotal)}</b>`));
    c.appendChild(el("div", "mini-sum", `<span>Zapłacono</span><b class="ok">${zl(PAYMENTS.apartmentPaid)}</b>`));
    c.appendChild(el("div", "mini-sum", `<span>Do dopłaty (${PAYMENTS.apartmentDueDate})</span><b class="due">${zl(PAYMENTS.apartmentDue)}</b>`));

    // Zasady
    const rules = el("div", "rules-wrap");
    rules.appendChild(el("p", "hl-title", "Zasady domku"));
    const ul = el("ul", "rules");
    a.rules.forEach((r) => ul.appendChild(el("li", "", r)));
    rules.appendChild(ul);
    c.appendChild(rules);

    const before = el("div", "rules-wrap");
    before.appendChild(el("p", "hl-title", "Przed wyjazdem (ważne!)"));
    const ul2 = el("ul", "rules");
    a.before.forEach((r) => ul2.appendChild(el("li", "", r)));
    before.appendChild(ul2);
    c.appendChild(before);

    // Mapa (zrzut) + linki
    if (a.mapImage) {
      const btn = el("button", "gal-item map-shot-btn");
      btn.type = "button";
      const img = el("img");
      img.loading = "lazy"; img.src = a.mapImage; img.alt = "Mapa domku";
      btn.appendChild(img);
      btn.onclick = () => openLightbox(a.mapImage, "Mapa domku");
      c.appendChild(btn);
    }
    const links = el("div", "links");
    if (a.link) links.appendChild(linkBtn(a.link, "🔗 Domek na Airbnb"));
    if (a.mapLink) links.appendChild(linkBtn(a.mapLink, "🗺️ Lokalizacja"));
    c.appendChild(links);
  }

  function linkBtn(href, label) {
    const x = el("a", "btn-link", label);
    x.href = href; x.target = "_blank"; x.rel = "noopener";
    return x;
  }

  // ---------- Transport & reszta ----------
  function renderExtras() {
    const c = $("#extrasCard");
    c.innerHTML = `
      <p class="apt-name">🚐 Prywatny minibus dla ekipy</p>
      <p class="muted">Transport lotnisko ⇄ domek (tam i z powrotem).</p>
      <div class="mini-sum"><span>Razem</span><b>${COSTS.minibusEUR} € <span class="muted">≈ ${zl(minibusZl)}</span></b></div>
      <div class="mini-sum"><span>Na osobę płacącą (${N_PAYERS})</span><b>${zl(busPer)}</b></div>
      <p class="hl-title" style="margin-top:18px">Do tego dochodzi jeszcze (osobno / na miejscu)</p>
      <ul class="rules">${EXTRAS.map((e) => `<li>${e}</li>`).join("")}</ul>`;
  }

  // ---------- Odliczanie ----------
  function renderCountdown(animate) {
    const box = $("#countdown");
    if (!box) return;
    const now = new Date();
    const days = (iso) => Math.max(0, Math.ceil((new Date(iso) - now) / 86400000));
    const dDep = days(KEY_DATES.departure);
    const dPay = days(KEY_DATES.payDeadline);
    box.innerHTML =
      `<div class="cd-item"><b data-n="${dDep}">${animate ? 0 : dDep}</b><span>dni do wylotu ✈️</span></div>` +
      `<div class="cd-item ${dPay <= 7 ? "warn" : ""}"><b data-n="${dPay}">${animate ? 0 : dPay}</b><span>dni do dopłaty (15.07)</span></div>`;
    if (animate) box.querySelectorAll("b[data-n]").forEach((b) => countUp(b, +b.getAttribute("data-n"), 900));
  }

  // ---------- Plan ----------
  function renderPlan() {
    $("#planCard").innerHTML =
      PLAN.map((d) => `
        <div class="plan-day">
          <div class="plan-head"><span class="plan-date">${d.day}</span><span class="plan-tag">${d.tag}</span></div>
          <ul class="plan-items">${d.items.map((i) => `<li>${i}</li>`).join("")}</ul>
        </div>`).join("") +
      `<p class="muted small">Plan roboczy — szczegóły dogadamy na czacie 😉</p>`;
  }

  // ---------- Ekipa ----------
  function renderTeam() {
    $("#teamCard").innerHTML =
      `<div class="team-grid">${PARTICIPANTS.map((p) => `
        <div class="team-item ${!p.pays ? "groom" : ""} ${p.name === whoami ? "me" : ""}">
          <span class="team-name">${firstName(p.name)}</span>
          <span class="team-role">${p.tag || "ekipa"}</span>
        </div>`).join("")}</div>`;
  }

  // ---------- Pakowanie (checklista) ----------
  function renderPacking() {
    const c = $("#packCard");
    const KEY = "kawalerski_pack";
    let state = {};
    try { state = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
    c.innerHTML =
      `<div class="pack-list">${PACKING.map((it, i) => `
        <label class="pack-item ${state[i] ? "checked" : ""}">
          <input type="checkbox" data-i="${i}" ${state[i] ? "checked" : ""}/>
          <span>${it}</span>
        </label>`).join("")}</div>
      <p class="muted small">✅ Zaznaczenia zapisują się w Twoim telefonie.</p>`;
    c.querySelectorAll("input[type=checkbox]").forEach((cb) => {
      cb.onchange = () => {
        state[cb.getAttribute("data-i")] = cb.checked;
        localStorage.setItem(KEY, JSON.stringify(state));
        cb.closest(".pack-item").classList.toggle("checked", cb.checked);
      };
    });
  }

  // ---------- Kontakt ----------
  function renderContact() {
    $("#contactCard").innerHTML =
      CONTACTS.map((k) => `
        <div class="payinfo-row">
          <div class="pi-left"><span class="pi-label">${k.who} — ${k.role}</span><span class="pi-val">${k.phone}</span></div>
          <a class="pi-copy" href="tel:${k.phone.replace(/\s/g, "")}">📞 Zadzwoń</a>
        </div>`).join("") +
      `<p class="muted small">W nagłych sprawach dzwoń do organizatora.</p>`;
  }

  // ---------- Scrollspy nawigacji ----------
  function setupNav() {
    const nav = $("#nav");
    if (!nav || !("IntersectionObserver" in window)) return;
    const links = Array.from(nav.querySelectorAll("a"));
    const map = {};
    links.forEach((a) => { map[a.getAttribute("href").slice(1)] = a; });
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          links.forEach((l) => l.classList.remove("active"));
          const a = map[en.target.id];
          if (a) { a.classList.add("active"); a.scrollIntoView({ inline: "center", block: "nearest" }); }
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(map).forEach((id) => { const s = document.getElementById(id); if (s) obs.observe(s); });
  }

  // ---------- Gdzie wpłacać ----------
  function renderPayInfo() {
    const c = $("#payInfoCard");
    const P = PAY_INFO;
    c.innerHTML = `
      <p class="muted small" style="margin-top:0">Odbiorca: <strong>${P.recipient}</strong></p>
      <div class="payinfo-row">
        <div class="pi-left"><span class="pi-label">📱 BLIK na telefon</span><span class="pi-val" id="piBlik">${P.blikPhone}</span></div>
        <button class="pi-copy" data-copy="${P.blikPhone.replace(/\s/g, "")}">Kopiuj</button>
      </div>
      <div class="payinfo-row">
        <div class="pi-left"><span class="pi-label">🏦 Konto ${P.bank}</span><span class="pi-val" id="piAcc">${P.account}</span></div>
        <button class="pi-copy" data-copy="${P.account.replace(/\s/g, "")}">Kopiuj</button>
      </div>
      <p class="muted small">W tytule wpisz swoje <strong>imię</strong> i etap (np. „Adam — zaliczka").</p>`;
    c.querySelectorAll(".pi-copy").forEach((b) => {
      b.onclick = () => {
        const val = b.getAttribute("data-copy");
        if (navigator.clipboard) navigator.clipboard.writeText(val).then(() => {
          const t = b.textContent; b.textContent = "Skopiowano ✓";
          setTimeout(() => (b.textContent = t), 1400);
        });
      };
    });
  }

  // ---------- Wpłaty z Supabase (panel /admin) ----------
  async function loadPayments() {
    if (!sb) return;
    const { data, error } = await sb.from(PAY_TABLE).select("name, paid");
    if (error || !data) return;
    const map = {};
    data.forEach((r) => (map[r.name] = Number(r.paid)));
    PARTICIPANTS.forEach((p) => { if (map[p.name] != null && !isNaN(map[p.name])) p.paid = map[p.name]; });
    renderPayments();
    renderMyStatus();
  }
  function subscribePayments() {
    if (!sb) return;
    sb.channel("pay-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: PAY_TABLE }, loadPayments)
      .subscribe();
    setInterval(loadPayments, 15000);
  }

  // ---------- Lightbox ----------
  function openLightbox(src, alt) {
    $("#lightboxImg").src = src;
    $("#lightboxImg").alt = alt || "Podgląd";
    $("#lightbox").hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    $("#lightbox").hidden = true;
    $("#lightboxImg").src = "";
    if (whoami) document.body.style.overflow = "";
  }

  // ---------- Widget czatu ----------
  function setupChatWidget() {
    if (!window.KawalerskiChat) return;
    KawalerskiChat.mount({ msgsEl: $("#cwMsgs"), formEl: $("#cwForm"), inputEl: $("#cwInput") });
    const fab = $("#chatFab"), widget = $("#chatWidget"), badge = $("#chatBadge");
    KawalerskiChat.setUnreadHandler((n) => { badge.hidden = !n; badge.textContent = n > 9 ? "9+" : String(n); });
    fab.onclick = () => {
      widget.hidden = false; fab.classList.add("hidden");
      KawalerskiChat.refresh(); KawalerskiChat.markSeen();
      setTimeout(() => $("#cwInput") && $("#cwInput").focus(), 50);
    };
    $("#chatWidgetClose").onclick = () => { widget.hidden = true; fab.classList.remove("hidden"); };
  }

  // ---------- Rotujące hasła ----------
  function startHype() {
    const lines = [
      "Ostatni wolny weekend Dawida 🫡",
      "Wpłać zaliczkę, zanim Drąszcz 😏",
      "Co się dzieje w Splicie, zostaje w Splicie 🤐",
      "Jacuzzi czeka 🛁🍾",
      "Nigdy nie wyłączaj jacuzzi — to zasada domu 😅",
      "Cisza po 22:00… teoretycznie 🔇",
    ];
    const h = $("#hype");
    if (!h) return;
    let i = 0;
    const tick = () => { h.textContent = lines[i % lines.length]; i++; };
    tick(); h.classList.add("show");
    setInterval(() => { h.classList.remove("show"); setTimeout(() => { tick(); h.classList.add("show"); }, 320); }, 4500);
  }

  // ---------- Animacje 🎬 ----------
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function countUp(node, to, dur) {
    if (reduceMotion) { node.textContent = Math.round(to); return; }
    const start = performance.now();
    (function step(t) {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      node.textContent = Math.round(to * e);
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }

  function setupReveal() {
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    const els = document.querySelectorAll(".card, .section-title");
    els.forEach((el) => el.classList.add("reveal"));
    const obs = new IntersectionObserver((entries, o) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); o.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    els.forEach((el) => obs.observe(el));
  }

  function spawnFloaties() {
    if (reduceMotion) return;
    const box = $("#floaties");
    if (!box) return;
    const emojis = ["🍺", "✈️", "🌴", "🍾", "🕶️", "🏖️", "🍹"];
    for (let i = 0; i < 9; i++) {
      const s = el("span", "floaty", emojis[i % emojis.length]);
      s.style.left = (Math.random() * 100).toFixed(1) + "%";
      s.style.animationDuration = (16 + Math.random() * 16).toFixed(1) + "s";
      s.style.animationDelay = (-Math.random() * 20).toFixed(1) + "s";
      s.style.fontSize = (18 + Math.random() * 20).toFixed(0) + "px";
      box.appendChild(s);
    }
  }

  // ---------- Init ----------
  $("#heroTitle").innerHTML = `${TRIP.title} ${TRIP.country.split(" ").pop()}`;
  $("#heroDates").textContent = TRIP.datesLong;
  $("#lightbox").onclick = closeLightbox;
  $("#lightboxClose").onclick = closeLightbox;
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });

  renderIdentity();
  renderCountdown(true);
  setInterval(() => renderCountdown(false), 60000);
  renderPayments();
  renderPayInfo();
  renderFlight();
  renderApartment();
  renderExtras();
  renderTeam();
  renderPacking();
  renderContact();
  setupChatWidget();
  setupNav();
  setupReveal();
  spawnFloaties();
  startHype();
  loadPayments();
  subscribePayments();
})();
