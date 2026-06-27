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

  const PAYERS = PARTICIPANTS.filter((p) => p.pays).length;
  const TOTAL_PEOPLE = PARTICIPANTS.length;

  function totals(option) {
    const base = (option.costs || []).reduce((s, c) => s + (c.amount || 0), 0);
    const yours = PAYERS > 0 ? base * (TOTAL_PEOPLE / PAYERS) : base;
    return { base, yours };
  }
  const optionReady = (o) => (o.costs || []).length > 0;

  // ---------- Stan głosującego ----------
  const WHO_KEY = "kawalerski_whoami";
  let whoami = localStorage.getItem(WHO_KEY) || "";
  let currentVotes = {}; // { name: optionId }

  // ---------- Identity ----------
  function renderIdentity() {
    const sel = $("#whoami");
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
    sel.onchange = () => {
      whoami = sel.value;
      localStorage.setItem(WHO_KEY, whoami);
      updateWhoamiNote();
      renderOptions();
    };
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

    OPTIONS.forEach((opt) => {
      const { base, yours } = totals(opt);
      const ready = optionReady(opt);
      const card = el("article", "card option" + (myVote === opt.id ? " chosen" : ""));

      // --- Header ---
      const head = el("div", "opt-head");
      const titleRow = el("div", "title-row");
      titleRow.appendChild(el("span", "opt-emoji", opt.emoji || "📍"));
      const tcol = el("div");
      tcol.appendChild(el("h2", "", `${opt.title} <span class="country">${opt.country || ""}</span>`));
      if (opt.subtitle) tcol.appendChild(el("p", "muted opt-sub", opt.subtitle));
      titleRow.appendChild(tcol);
      head.appendChild(titleRow);

      if (opt.badges && opt.badges.length) {
        const b = el("div", "badges");
        opt.badges.forEach((x) => b.appendChild(el("span", "badge", x)));
        head.appendChild(b);
      }
      card.appendChild(head);

      // --- Galeria ---
      if (opt.images && opt.images.length) {
        const gal = el("div", "gallery");
        opt.images.forEach((src) => {
          const a = el("a");
          a.href = src; a.target = "_blank"; a.rel = "noopener";
          const img = el("img");
          img.loading = "lazy"; img.src = src; img.alt = opt.title;
          a.appendChild(img);
          gal.appendChild(a);
        });
        card.appendChild(gal);
      }

      // --- Loty ---
      if (opt.flightThere || opt.flightBack) {
        const fl = el("div", "flights");
        if (opt.flightThere) fl.appendChild(flightRow("➡️", opt.flightThere));
        if (opt.flightBack) fl.appendChild(flightRow("⬅️", opt.flightBack));
        card.appendChild(fl);
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
        card.appendChild(loc);
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
          row.appendChild(el("div", "cost-amt", zl(c.amount)));
          table.appendChild(row);
        });
        card.appendChild(table);

        const sum = el("div", "summary");
        sum.appendChild(rowKV("Suma na osobę (baza)", zl(base), false));
        sum.appendChild(rowKV("👉 Twoja cena (Pan Młody nie płaci)", zl(yours), true));
        const over = yours > BUDGET_TARGET;
        sum.appendChild(el(
          "div", "budget-badge " + (over ? "over" : "ok"),
          over ? `⚠️ ${zl(yours - BUDGET_TARGET)} ponad budżet`
               : `✅ w budżecie • ${zl(BUDGET_TARGET - yours)} zapasu`
        ));
        card.appendChild(sum);
      } else {
        card.appendChild(el("p", "todo", "🚧 Szczegóły i koszty wkrótce — uzupełniane."));
      }

      // --- Highlights ---
      if (opt.highlights && opt.highlights.length) {
        const h = el("div", "highlights-wrap");
        h.appendChild(el("p", "hl-title", "Co w cenie / atrakcje"));
        const ul = el("ul", "highlights");
        opt.highlights.forEach((x) => ul.appendChild(el("li", "", x)));
        h.appendChild(ul);
        card.appendChild(h);
      }

      // --- Linki ---
      if (opt.bookingLink) {
        const links = el("div", "links");
        const a = el("a", "btn-link", "🔗 Zobacz ofertę na Booking");
        a.href = opt.bookingLink; a.target = "_blank"; a.rel = "noopener";
        links.appendChild(a);
        card.appendChild(links);
      }

      // --- Głosowanie ---
      const voteWrap = el("div", "vote");
      const voted = myVote === opt.id;
      const btn = el("button", "vote-btn" + (voted ? " active" : ""),
        voted ? "✅ To Twój wybór" : "🗳️ Głosuj na tę opcję");
      btn.disabled = !whoami;
      btn.title = whoami ? "" : "Najpierw wybierz kim jesteś (na górze)";
      btn.onclick = () => castVote(opt.id);
      voteWrap.appendChild(btn);
      card.appendChild(voteWrap);

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

  // ---------- Głosowanie ----------
  async function castVote(optionId) {
    if (!whoami) return;
    currentVotes[whoami] = optionId; // optimistic
    renderOptions();
    renderResults();

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
  renderIdentity();
  renderBanner();
  loadVotes();
  subscribe();
})();
