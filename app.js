/* =========================================================================
   Logika: render ofert, koszty, mapa, głosowanie (Supabase) i wyniki.
   ========================================================================= */
(function () {
  "use strict";

  // ---------- Supabase / fallback ----------
  const hasSupabase =
    window.SUPABASE_URL &&
    !String(window.SUPABASE_URL).startsWith("WKLEJ") &&
    window.SUPABASE_ANON_KEY &&
    !String(window.SUPABASE_ANON_KEY).startsWith("WKLEJ");

  const TABLE = "kawalerski_votes";
  const CHAT_TABLE = "kawalerski_chat";
  const sb = hasSupabase
    ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
    : null;

  // ---------- Helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const zl = (n) => Math.round(n).toLocaleString("pl-PL") + " zł";
  const firstName = (full) => full.split(" ")[0];

  const TOTAL_PEOPLE = PARTICIPANTS.length;
  // Cała ekipa: G = wszyscy, P = płacący (Pan Młody nie płaci)
  const FULL = { G: PARTICIPANTS.length, P: PARTICIPANTS.filter((p) => p.pays).length };

  // Kto już zaakceptował (oddał głos) = idzie na wyjazd
  function goingNow() {
    const voted = currentVotes;
    const set = PARTICIPANTS.filter((p) => voted[p.name]);
    return { G: set.length, P: set.filter((p) => p.pays).length };
  }

  // Cena na 1 osobę płacącą przy liczebności going = {G, P}
  function pricePerPayer(option, going) {
    let pp = 0, shared = 0;
    (option.costs || []).forEach((c) => {
      if (c.shared) shared += c.amount || 0; else pp += c.amount || 0;
    });
    const total = pp * going.G + shared;       // koszt całej grupy
    return going.P > 0 ? total / going.P : null; // dzielony na płacących
  }

  function groupTotal(option, going) {
    let pp = 0, shared = 0;
    (option.costs || []).forEach((c) => {
      if (c.shared) shared += c.amount || 0; else pp += c.amount || 0;
    });
    return pp * going.G + shared;
  }

  function totals(option) {
    return { full: pricePerPayer(option, FULL), now: pricePerPayer(option, goingNow()) };
  }
  const optionReady = (o) => (o.costs || []).length > 0;

  // ---------- Stan głosującego ----------
  const WHO_KEY = "kawalerski_whoami";
  let whoami = localStorage.getItem(WHO_KEY) || "";
  let currentVotes = {}; // { name: optionId }
  // Które karty są rozwinięte (domyślnie wszystko zwinięte).
  const expanded = {};
  OPTIONS.forEach((o) => (expanded[o.id] = false));
  let counterOpen = false; // czy rozwinięty panel "kto co wybrał"

  // ---------- Identity + bramka ----------
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
    updateWhoamiNote();
    renderOptions();
    if (window.KawalerskiChat) KawalerskiChat.refresh();
  }

  function renderIdentity() {
    fillSelect($("#whoami"));
    fillSelect($("#gateSelect"));
    $("#whoami").onchange = (e) => setWhoami(e.target.value);
    $("#gateSelect").onchange = (e) => setWhoami(e.target.value);
    updateGate();
    updateWhoamiNote();
  }

  function updateWhoamiNote() {
    const note = $("#whoamiNote");
    const me = PARTICIPANTS.find((p) => p.name === whoami);
    if (!me) { note.textContent = ""; return; }
    note.textContent = me.pays
      ? `Cześć ${firstName(me.name)}! Poniżej widzisz dokładnie ile zapłacisz w każdej opcji.`
      : `${me.name} — Pan Młody nie płaci 🤵 Twoja część jest dzielona między pozostałych.`;
  }

  // ---------- Opcje ----------
  function renderOptions() {
    const wrap = $("#options");
    wrap.innerHTML = "";
    const myVote = currentVotes[whoami];

    const now = goingNow();
    const me = PARTICIPANTS.find((p) => p.name === whoami);
    const mePays = me ? me.pays : true;
    OPTIONS.forEach((opt) => {
      const { full, now: nowPrice } = totals(opt);
      const yourFull = mePays ? full : 0;     // Pan Młody nie płaci => 0 zł
      const yourNow = mePays ? nowPrice : 0;
      const ready = optionReady(opt);
      const isOpen = !!expanded[opt.id];
      const over = yourFull > BUDGET_TARGET;
      const card = el("article",
        "card option" + (opt.favorite ? " favorite" : "") +
        (myVote === opt.id ? " chosen" : "") + (isOpen ? "" : " collapsed"));
      if (opt.favorite) card.appendChild(el("div", "fav-ribbon", "⭐ FAWORYT"));

      // --- Summary (zawsze widoczne, klikalne) ---
      const head = el("button", "opt-head");
      head.type = "button";
      head.setAttribute("aria-expanded", isOpen ? "true" : "false");
      const titleRow = el("div", "title-row");
      titleRow.appendChild(el("span", "opt-emoji", opt.emoji || "📍"));
      const tcol = el("div", "title-col");
      tcol.appendChild(el("h2", "", `${opt.title} <span class="country">${opt.country || ""}</span>`));
      if (opt.subtitle) tcol.appendChild(el("p", "muted opt-sub", opt.subtitle));
      titleRow.appendChild(tcol);
      head.appendChild(titleRow);

      const sumRight = el("div", "head-right");
      if (ready) {
        const price = el("div", "head-price");
        price.appendChild(el("span", "hp-label", "Twoja cena"));
        price.appendChild(el("span", "hp-amt" + (over ? " over" : ""), zl(yourFull)));
        price.appendChild(el("span", "hp-now", !mePays
          ? "Pan Młody nie płaci 🎉"
          : (nowPrice ? `teraz: ${zl(yourNow)} (${now.G})` : "teraz: — (0 zgłoszeń)")));
        sumRight.appendChild(price);
        sumRight.appendChild(el("span", "head-budget " + (over ? "over" : "ok"),
          !mePays ? "gratis 🎉" : (over ? "ponad budżet" : "w budżecie")));
      } else {
        sumRight.appendChild(el("span", "head-soon", "wkrótce"));
      }
      sumRight.appendChild(el("span", "chevron", "▾"));
      head.appendChild(sumRight);

      head.onclick = () => { expanded[opt.id] = !expanded[opt.id]; renderOptions(); };
      card.appendChild(head);

      // --- Body (zwijane) ---
      const body = el("div", "opt-body");

      if (opt.badges && opt.badges.length) {
        const b = el("div", "badges");
        opt.badges.forEach((x) => b.appendChild(el("span", "badge", x)));
        body.appendChild(b);
      }

      if (opt.warning) {
        body.appendChild(el("div", "opt-warning", "⚠️ " + opt.warning));
      }

      // --- Galeria ---
      if (opt.images && opt.images.length) {
        const gal = el("div", "gallery");
        opt.images.forEach((src) => {
          const btn = el("button", "gal-item");
          btn.type = "button";
          const img = el("img");
          img.loading = "lazy"; img.src = src; img.alt = opt.title;
          btn.appendChild(img);
          btn.onclick = () => openLightbox(src, opt.title);
          gal.appendChild(btn);
        });
        body.appendChild(gal);
      }

      // --- Loty ---
      if (opt.flightThere || opt.flightBack) {
        const fl = el("div", "flights");
        if (opt.flightThere) fl.appendChild(flightRow("➡️", opt.flightThere));
        if (opt.flightBack) fl.appendChild(flightRow("⬅️", opt.flightBack));
        if (opt.flightNote) {
          const fn = el("div", "flight-note", opt.flightNote);
          fl.appendChild(fn);
        }
        body.appendChild(fl);
      }

      // --- Lokalizacja + mapa ---
      if (opt.address || opt.mapQuery) {
        const loc = el("section", "loc");
        if (opt.place) loc.appendChild(el("p", "loc-place", opt.place));
        if (opt.address) loc.appendChild(el("p", "loc-addr", "📍 " + opt.address));
        if (opt.mapQuery) {
          const iframe = document.createElement("iframe");
          iframe.className = "map";
          iframe.loading = "lazy";
          iframe.referrerPolicy = "no-referrer-when-downgrade";
          iframe.src = `https://www.google.com/maps?q=${encodeURIComponent(opt.mapQuery)}&z=13&output=embed`;
          loc.appendChild(iframe);
          const mapsLink = el("a", "btn-link sm", "🗺️ Otwórz w Mapach Google");
          mapsLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(opt.mapQuery)}`;
          mapsLink.target = "_blank"; mapsLink.rel = "noopener";
          loc.appendChild(mapsLink);
        }
        if (opt.nearby && opt.nearby.length) {
          const nb = el("ul", "nearby");
          opt.nearby.forEach((n) =>
            nb.appendChild(el("li", "", `<span>${n.name}</span><span class="nb-dist">${n.dist}</span>`))
          );
          loc.appendChild(nb);
        }
        if (opt.mapImage) {
          const det = el("details", "map-shot");
          det.appendChild(el("summary", "", "📸 Podgląd okolicy (Booking)"));
          const im = el("img");
          im.loading = "lazy"; im.src = opt.mapImage; im.alt = "Mapa okolicy " + opt.title;
          det.appendChild(im);
          loc.appendChild(det);
        }
        body.appendChild(loc);
      }

      // --- Koszty ---
      if (ready) {
        const table = el("div", "costs");
        opt.costs.forEach((c) => {
          const row = el("div", "cost-row");
          const left = el("div", "cost-label");
          left.appendChild(el("span", "cost-main", `${c.icon || "•"} ${c.label}`));
          if (c.note) left.appendChild(el("span", "cost-note", c.note));
          row.appendChild(left);
          row.appendChild(el("div", "cost-amt",
            zl(c.amount) + `<span class="cost-per">/ ${c.shared ? "ekipa" : "os"}</span>`));
          table.appendChild(row);
        });
        body.appendChild(table);

        const sum = el("div", "summary");
        sum.appendChild(rowKV(`Koszt całej ekipy (${FULL.G} os)`, zl(groupTotal(opt, FULL)), false));
        sum.appendChild(rowKV(`÷ ${FULL.P} płacących (Pan Młody gratis 🤵)`, zl(full) + " / os", false));
        sum.appendChild(rowKV("👉 Twoja cena", !mePays ? "0 zł 🎉" : zl(yourFull), true));
        const nowRow = rowKV(`Teraz wg zgłoszeń (${now.G}/${FULL.G} chętnych)`,
          !mePays ? "0 zł" : (nowPrice ? zl(yourNow) : "— brak zgłoszeń"), false);
        nowRow.classList.add("now-row");
        sum.appendChild(nowRow);
        sum.appendChild(el(
          "div", "budget-badge " + (over ? "over" : "ok"),
          !mePays ? "🎉 Pan Młody nie płaci — gratis!"
                  : (over ? `⚠️ ${zl(yourFull - BUDGET_TARGET)} ponad budżet`
                          : `✅ w budżecie • ${zl(BUDGET_TARGET - yourFull)} zapasu`)
        ));
        body.appendChild(sum);
      } else {
        body.appendChild(el("p", "todo", "🚧 Szczegóły i koszty wkrótce — uzupełniane."));
      }

      // --- Highlights ---
      if (opt.highlights && opt.highlights.length) {
        const h = el("div", "highlights-wrap");
        h.appendChild(el("p", "hl-title", "Co w cenie / atrakcje"));
        const ul = el("ul", "highlights");
        opt.highlights.forEach((x) => ul.appendChild(el("li", "", x)));
        h.appendChild(ul);
        body.appendChild(h);
      }

      // --- Linki ---
      if (opt.bookingLink) {
        const links = el("div", "links");
        const a = el("a", "btn-booking",
          '<span class="bk-logo">Booking.com</span><span class="bk-text">Zobacz pełną ofertę i zdjęcia →</span>');
        a.href = opt.bookingLink; a.target = "_blank"; a.rel = "noopener";
        links.appendChild(a);
        body.appendChild(links);
      }

      // --- Głosowanie ---
      const voteWrap = el("div", "vote");
      const voted = myVote === opt.id;
      const votedOther = myVote && myVote !== opt.id;
      let label, cls;
      if (voted) { label = "✅ Twój wybór"; cls = " active"; }
      else if (votedOther) { label = "🔁 Zmień głos na tę opcję"; cls = " change"; }
      else { label = "🗳️ Głosuj na tę opcję"; cls = ""; }
      const btn = el("button", "vote-btn" + cls, label);
      btn.disabled = !whoami || voted;
      btn.title = whoami ? "" : "Najpierw wybierz kim jesteś (na górze)";
      btn.onclick = (e) => castVote(opt.id, e);
      voteWrap.appendChild(btn);
      if (whoami && voted) {
        voteWrap.appendChild(el("p", "vote-hint", "Możesz zmienić wybór klikając inną opcję — w każdej chwili."));
      }
      body.appendChild(voteWrap);

      card.appendChild(body);
      wrap.appendChild(card);
    });
  }

  function flightRow(arrow, text) {
    const r = el("div", "flight-row");
    r.appendChild(el("span", "fl-arrow", arrow));
    r.appendChild(el("span", "fl-text", text));
    return r;
  }
  function rowKV(k, v, big) {
    const r = el("div", "kv" + (big ? " your-price" : ""));
    r.appendChild(el("span", "k", k));
    r.appendChild(el("span", "v", v));
    return r;
  }

  // ---------- Konfetti 🎉 ----------
  function popConfetti(x, y) {
    const emojis = ["🍺", "🎉", "🥳", "🔥", "✈️", "🏖️", "🍻"];
    for (let i = 0; i < 18; i++) {
      const s = el("span", "confetti", emojis[Math.floor(Math.random() * emojis.length)]);
      const ang = (Math.random() - 0.5) * 2; // -1..1
      s.style.left = x + "px";
      s.style.top = y + "px";
      s.style.setProperty("--dx", (ang * 220).toFixed(0) + "px");
      s.style.setProperty("--dy", (-160 - Math.random() * 160).toFixed(0) + "px");
      s.style.setProperty("--rot", (Math.random() * 720 - 360).toFixed(0) + "deg");
      s.style.fontSize = 14 + Math.random() * 16 + "px";
      s.style.animationDelay = (Math.random() * 0.08).toFixed(2) + "s";
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 1300);
    }
  }

  // ---------- Głosowanie ----------
  async function castVote(optionId, ev) {
    if (!whoami) return;
    const changed = currentVotes[whoami] !== optionId;
    currentVotes[whoami] = optionId; // optimistic
    if (changed && ev && ev.clientX) popConfetti(ev.clientX, ev.clientY);
    renderOptions();
    renderResults();
    renderCounter();

    if (sb) {
      const { error } = await sb
        .from(TABLE)
        .upsert({ name: whoami, option_id: optionId, updated_at: new Date().toISOString() }, { onConflict: "name" });
      if (error) alert("Nie udało się zapisać głosu: " + error.message);
      await loadVotes();
    } else {
      localStorage.setItem("kawalerski_votes_local", JSON.stringify(currentVotes));
    }
  }

  async function loadVotes() {
    if (sb) {
      const { data, error } = await sb.from(TABLE).select("name, option_id");
      if (!error && data) {
        currentVotes = {};
        data.forEach((r) => (currentVotes[r.name] = r.option_id));
      }
    } else {
      try { currentVotes = JSON.parse(localStorage.getItem("kawalerski_votes_local")) || {}; }
      catch (e) { currentVotes = {}; }
    }
    renderOptions();
    renderResults();
    renderCounter();
  }

  // ---------- Wyniki ----------
  function renderResults() {
    const bars = $("#resultsBars");
    const summary = $("#resultsSummary");
    bars.innerHTML = "";

    const counts = {};
    OPTIONS.forEach((o) => (counts[o.id] = []));
    Object.entries(currentVotes).forEach(([name, oid]) => {
      if (counts[oid]) counts[oid].push(name);
    });

    const totalVotes = Object.values(currentVotes).length;
    const maxCount = Math.max(1, ...OPTIONS.map((o) => counts[o.id].length));
    const leadCount = Math.max(0, ...OPTIONS.map((o) => counts[o.id].length));
    const leaders = OPTIONS.filter((o) => counts[o.id].length === leadCount && leadCount > 0);
    const notVoted = PARTICIPANTS.filter((p) => !currentVotes[p.name]).map((p) => firstName(p.name));

    OPTIONS.forEach((o) => {
      const c = counts[o.id].length;
      const row = el("div", "bar-row");
      const h = el("div", "bar-head");
      h.appendChild(el("span", "", `${o.emoji || ""} ${o.title}`));
      h.appendChild(el("span", "bar-count", `${c} głos${plural(c)}`));
      row.appendChild(h);
      const track = el("div", "bar-track");
      const fill = el("div", "bar-fill" + (leaders.includes(o) ? " lead" : ""));
      fill.style.width = (c / maxCount) * 100 + "%";
      track.appendChild(fill);
      row.appendChild(track);
      if (c) row.appendChild(el("div", "bar-voters", counts[o.id].map(firstName).join(", ")));
      bars.appendChild(row);
    });

    if (totalVotes === 0) {
      summary.textContent = "Jeszcze nikt nie głosował — bądź pierwszy!";
    } else if (leaders.length === 1) {
      summary.innerHTML = `Oddano <strong>${totalVotes}/${TOTAL_PEOPLE}</strong> głosów. Prowadzi: <strong>${leaders[0].emoji} ${leaders[0].title}</strong> 🏆`;
    } else {
      summary.innerHTML = `Oddano <strong>${totalVotes}/${TOTAL_PEOPLE}</strong> głosów. Remis: ${leaders.map((l) => l.title).join(" vs ")}.`;
    }
    if (notVoted.length && totalVotes > 0) {
      bars.appendChild(el("p", "muted small not-voted", "Nie głosowali jeszcze: " + notVoted.join(", ")));
    }
  }

  const plural = (n) => (n === 1 ? "" : n >= 2 && n <= 4 ? "y" : "ów");

  // ---------- Sticky licznik (kto co wybrał) ----------
  function renderCounter() {
    const bar = $("#liveBar");
    bar.hidden = false;

    const counts = {};
    OPTIONS.forEach((o) => (counts[o.id] = []));
    Object.entries(currentVotes).forEach(([name, oid]) => {
      if (counts[oid]) counts[oid].push(name);
    });
    const total = Object.values(currentVotes).length;
    const leadCount = Math.max(0, ...OPTIONS.map((o) => counts[o.id].length));

    // Chipsy: emoji + liczba
    const chips = $("#lbChips");
    chips.innerHTML = "";
    OPTIONS.forEach((o) => {
      const c = counts[o.id].length;
      const chip = el("span", "lb-chip" + (c === leadCount && leadCount > 0 ? " lead" : ""));
      chip.innerHTML = `${o.emoji || "📍"} <b>${c}</b>`;
      chip.title = o.title;
      chips.appendChild(chip);
    });
    $("#lbTotal").textContent = `${total}/${TOTAL_PEOPLE}`;

    // Szczegóły: kto co wybrał
    const detail = $("#lbDetail");
    detail.hidden = !counterOpen;
    $("#lbCaret").style.transform = counterOpen ? "rotate(180deg)" : "";
    if (counterOpen) {
      detail.innerHTML = "";
      OPTIONS.forEach((o) => {
        const names = counts[o.id];
        const row = el("div", "lbd-row");
        row.appendChild(el("span", "lbd-opt", `${o.emoji || "📍"} ${o.title}`));
        row.appendChild(el("span", "lbd-names", names.length ? names.map(firstName).join(", ") : "—"));
        detail.appendChild(row);
      });
      const notVoted = PARTICIPANTS.filter((p) => !currentVotes[p.name]).map((p) => firstName(p.name));
      if (notVoted.length) {
        const nv = el("div", "lbd-row lbd-novote");
        nv.appendChild(el("span", "lbd-opt", "⏳ Brak głosu"));
        nv.appendChild(el("span", "lbd-names", notVoted.join(", ")));
        detail.appendChild(nv);
      }
    }
  }

  // ---------- Lightbox zdjęć ----------
  function openLightbox(src, alt) {
    const lb = $("#lightbox");
    $("#lightboxImg").src = src;
    $("#lightboxImg").alt = alt || "Podgląd";
    lb.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    $("#lightbox").hidden = true;
    $("#lightboxImg").src = "";
    if (whoami) document.body.style.overflow = "";
  }

  // ---------- Pływający widget czatu ----------
  function setupChatWidget() {
    if (!window.KawalerskiChat) return;
    KawalerskiChat.mount({ msgsEl: $("#cwMsgs"), formEl: $("#cwForm"), inputEl: $("#cwInput") });
    const fab = $("#chatFab");
    const widget = $("#chatWidget");
    const badge = $("#chatBadge");
    KawalerskiChat.setUnreadHandler((n) => {
      badge.hidden = !n;
      badge.textContent = n > 9 ? "9+" : String(n);
    });
    const openW = () => {
      widget.hidden = false; fab.classList.add("hidden");
      KawalerskiChat.refresh();
      KawalerskiChat.markSeen();
      setTimeout(() => $("#cwInput") && $("#cwInput").focus(), 50);
    };
    const closeW = () => { widget.hidden = true; fab.classList.remove("hidden"); };
    fab.onclick = openW;
    $("#chatWidgetClose").onclick = closeW;
  }

  // ---------- Banner ----------
  function renderBanner() {
    if (hasSupabase) return;
    const b = $("#configBanner");
    b.hidden = false;
    b.innerHTML =
      "⚙️ <strong>Tryb podglądu</strong>: Supabase nie jest jeszcze skonfigurowany (<code>config.js</code>) — głosy zapisują się tylko lokalnie. Patrz README.md.";
  }

  // ---------- Realtime ----------
  function subscribe() {
    if (!sb) return;
    sb.channel("votes-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, loadVotes)
      .subscribe();
    setInterval(loadVotes, 8000);
  }

  // ---------- Init ----------
  $("#lbToggle").onclick = () => {
    counterOpen = !counterOpen;
    $("#lbToggle").setAttribute("aria-expanded", counterOpen ? "true" : "false");
    renderCounter();
  };
  $("#lightbox").onclick = closeLightbox;
  $("#lightboxClose").onclick = closeLightbox;
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });

  renderIdentity();
  renderBanner();
  renderCounter();
  setupChatWidget();
  loadVotes();
  subscribe();
})();
