/* =========================================================================
   Logika strony: render ofert, koszty, głosowanie (Supabase) i wyniki.
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

  const PAYERS = PARTICIPANTS.filter((p) => p.pays).length;
  const TOTAL_PEOPLE = PARTICIPANTS.length;

  // Suma na osobę (baza) + Twoja realna cena (Pan Młody nie płaci -> dzielone na płacących)
  function totals(option) {
    const base = (option.costs || []).reduce((s, c) => s + (c.amount || 0), 0);
    const yours = PAYERS > 0 ? base * (TOTAL_PEOPLE / PAYERS) : base;
    return { base, yours };
  }

  function optionReady(option) {
    return (option.costs || []).length > 0;
  }

  // ---------- Stan głosującego ----------
  const WHO_KEY = "kawalerski_whoami";
  let whoami = localStorage.getItem(WHO_KEY) || "";

  // ---------- Render: identity ----------
  function renderIdentity() {
    const sel = $("#whoami");
    sel.innerHTML = "";
    sel.appendChild(el("option", "", "— wybierz siebie —")).value = "";
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
      ? `Cześć ${me.name.split(" ")[0]}! Poniżej widzisz ile dokładnie zapłacisz w każdej opcji.`
      : `${me.name} — Pan Młody nie płaci 🤵 Twoja część jest dzielona między pozostałych.`;
  }

  // ---------- Render: opcje ----------
  let currentVotes = {}; // { name: optionId }

  function renderOptions() {
    const wrap = $("#options");
    wrap.innerHTML = "";
    const myVote = currentVotes[whoami];

    OPTIONS.forEach((opt) => {
      const { base, yours } = totals(opt);
      const ready = optionReady(opt);
      const card = el("article", "card option" + (myVote === opt.id ? " chosen" : ""));

      // Nagłówek
      const head = el("div", "opt-head");
      head.appendChild(el("h2", "", opt.title));
      if (opt.subtitle) head.appendChild(el("p", "muted", opt.subtitle));
      if (opt.flight) head.appendChild(el("p", "flight", opt.flight));
      card.appendChild(head);

      // Galeria zdjęć
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

      // Koszty
      if (ready) {
        const table = el("div", "costs");
        opt.costs.forEach((c) => {
          const row = el("div", "cost-row");
          const left = el("div", "cost-label");
          left.appendChild(el("span", "", c.label));
          if (c.note) left.appendChild(el("span", "cost-note", c.note));
          row.appendChild(left);
          row.appendChild(el("div", "cost-amt", zl(c.amount)));
          table.appendChild(row);
        });
        card.appendChild(table);

        // Podsumowanie cen
        const sum = el("div", "summary");
        sum.appendChild(rowKV("Suma na osobę (baza)", zl(base)));
        const yourRow = rowKV("👉 Twoja cena (Pan Młody nie płaci)", zl(yours));
        yourRow.classList.add("your-price");
        sum.appendChild(yourRow);
        const overBudget = yours > BUDGET_TARGET;
        const badge = el(
          "div",
          "budget-badge " + (overBudget ? "over" : "ok"),
          overBudget
            ? `⚠️ ${zl(yours - BUDGET_TARGET)} ponad budżet ${zl(BUDGET_TARGET)}`
            : `✅ mieści się w budżecie (${zl(BUDGET_TARGET - yours)} zapasu)`
        );
        sum.appendChild(badge);
        card.appendChild(sum);
      } else {
        card.appendChild(el("p", "todo", "🚧 Szczegóły i koszty wkrótce — uzupełniane."));
      }

      // Highlights
      if (opt.highlights && opt.highlights.length) {
        const ul = el("ul", "highlights");
        opt.highlights.forEach((h) => ul.appendChild(el("li", "", h)));
        card.appendChild(ul);
      }

      // Linki
      const links = el("div", "links");
      if (opt.bookingLink)
        links.appendChild(linkBtn(opt.bookingLink, "🔗 Zobacz na Booking"));
      if (links.children.length) card.appendChild(links);

      // Głosowanie
      const voteWrap = el("div", "vote");
      const btn = el(
        "button",
        "vote-btn" + (myVote === opt.id ? " active" : ""),
        myVote === opt.id ? "✅ Twój głos" : "🗳️ Głosuj na tę opcję"
      );
      btn.disabled = !whoami;
      btn.title = whoami ? "" : "Najpierw wybierz kim jesteś (na górze)";
      btn.onclick = () => castVote(opt.id);
      voteWrap.appendChild(btn);
      card.appendChild(voteWrap);

      wrap.appendChild(card);
    });
  }

  function rowKV(k, v) {
    const r = el("div", "kv");
    r.appendChild(el("span", "k", k));
    r.appendChild(el("span", "v", v));
    return r;
  }
  function linkBtn(href, label) {
    const a = el("a", "btn-link", label);
    a.href = href; a.target = "_blank"; a.rel = "noopener";
    return a;
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
      if (error) {
        alert("Nie udało się zapisać głosu: " + error.message);
      }
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
      try {
        currentVotes = JSON.parse(localStorage.getItem("kawalerski_votes_local")) || {};
      } catch (e) { currentVotes = {}; }
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

    OPTIONS.forEach((o) => {
      const c = counts[o.id].length;
      const row = el("div", "bar-row");
      const head = el("div", "bar-head");
      head.appendChild(el("span", "", o.title));
      head.appendChild(el("span", "bar-count", `${c} głos${plural(c)}`));
      row.appendChild(head);
      const track = el("div", "bar-track");
      const fill = el("div", "bar-fill" + (leaders.includes(o) ? " lead" : ""));
      fill.style.width = (c / maxCount) * 100 + "%";
      track.appendChild(fill);
      row.appendChild(track);
      if (counts[o.id].length) {
        row.appendChild(el("div", "bar-voters", counts[o.id].map(firstName).join(", ")));
      }
      bars.appendChild(row);
    });

    if (totalVotes === 0) {
      summary.textContent = "Jeszcze nikt nie głosował — bądź pierwszy!";
    } else if (leaders.length === 1) {
      summary.innerHTML = `Oddano <strong>${totalVotes}/${TOTAL_PEOPLE}</strong> głosów. Prowadzi: <strong>${leaders[0].title}</strong>. (większość wygrywa)`;
    } else {
      summary.innerHTML = `Oddano <strong>${totalVotes}/${TOTAL_PEOPLE}</strong> głosów. Remis: ${leaders.map((l) => l.title).join(" vs ")}.`;
    }
  }

  const plural = (n) => (n === 1 ? "" : n >= 2 && n <= 4 ? "y" : "ów");
  const firstName = (full) => full.split(" ")[0];

  // ---------- Banner konfiguracji ----------
  function renderBanner() {
    if (hasSupabase) return;
    const b = $("#configBanner");
    b.hidden = false;
    b.innerHTML =
      "⚙️ <strong>Tryb podglądu</strong>: Supabase nie jest jeszcze skonfigurowany (plik <code>config.js</code>), więc głosy zapisują się tylko lokalnie. Patrz README.md aby włączyć wspólne głosowanie.";
  }

  // ---------- Realtime / polling ----------
  function subscribe() {
    if (!sb) return;
    sb.channel("votes-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, loadVotes)
      .subscribe();
    // bezpiecznik: odświeżaj co 8s na wypadek braku realtime
    setInterval(loadVotes, 8000);
  }

  // ---------- Init ----------
  renderIdentity();
  renderBanner();
  loadVotes();
  subscribe();
})();
