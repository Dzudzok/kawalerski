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

  // ---------- Finanse ----------
  const PAYERS = PARTICIPANTS.filter((p) => p.pays);
  const N_PAYERS = PAYERS.length;
  const minibusZl = COSTS.minibusEUR * TRIP.eurRate;
  const flightPer = COSTS.flightTotal / N_PAYERS;
  const aptPer = COSTS.apartmentTotal / N_PAYERS;
  const busPer = minibusZl / N_PAYERS;
  const committedTotal = COSTS.flightTotal + COSTS.apartmentTotal + minibusZl;
  const perPayer = committedTotal / N_PAYERS; // udział 1 osoby płacącej
  const collected = PAYERS.reduce((s, p) => s + (p.paid || 0), 0);
  const remainingTotal = PAYERS.reduce((s, p) => s + Math.max(0, perPayer - (p.paid || 0)), 0);

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
    box.appendChild(personBar(me));
    const laterTotal = Math.max(0, perPayer - Math.max(paid, zaliczka));
    box.appendChild(el("p", "ms-note",
      dueNow > 0
        ? `Najpierw dopłać zaliczkę. Później: do 15.07 jeszcze ${zl(STAGES[1].per)}, do 30.07 ${zl(STAGES[2].per)}.`
        : (laterTotal > 0
            ? `Zaliczka OK 👍 Dalej: do 15.07 ${zl(STAGES[1].per)}, do 30.07 ${zl(STAGES[2].per)}.`
            : "Wszystko wpłacone — dziękujemy! 🍻")));
  }

  // Pasek postępu jednej osoby względem 3 etapów
  function personBar(p) {
    const paid = p.paid || 0;
    const pct = Math.max(0, Math.min(100, (paid / perPayer) * 100));
    const ticks = STAGES.slice(0, -1).map((s) =>
      `<span class="tick" style="left:${(s.cum / perPayer) * 100}%"></span>`).join("");
    const wrap = el("div", "pbar-wrap");
    wrap.innerHTML =
      `<div class="pbar"><div class="pbar-fill" style="width:${pct}%"></div>${ticks}</div>` +
      `<div class="pbar-scale"><span>0</span><span>zaliczka ${zl(STAGES[0].cum)}</span><span>15.07</span><span>${zl(perPayer)}</span></div>`;
    return wrap;
  }

  // ---------- Wpłaty ----------
  function renderPayments() {
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
      const ticks = STAGES.slice(0, -1).map((s) =>
        `<span class="tick" style="left:${(s.cum / perPayer) * 100}%"></span>`).join("");
      row.innerHTML = `
        <div class="pg-head">
          <span class="pg-name">${p.name}${p.note ? ` <em>(${p.note})</em>` : ""}</span>
          <span class="pg-paid">${zl(paid)}</span>
        </div>
        <div class="pbar"><div class="pbar-fill" style="width:${pct}%"></div>${ticks}</div>
        <div class="pg-status ${cls}">${status}</div>`;
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
      <div class="bookings">${bookings}</div>`;
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

  // ---------- Init ----------
  $("#heroTitle").innerHTML = `${TRIP.title} ${TRIP.country.split(" ").pop()}`;
  $("#heroDates").textContent = TRIP.datesLong;
  $("#lightbox").onclick = closeLightbox;
  $("#lightboxClose").onclick = closeLightbox;
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });

  renderIdentity();
  renderPayments();
  renderFlight();
  renderApartment();
  renderExtras();
  setupChatWidget();
  startHype();
})();
