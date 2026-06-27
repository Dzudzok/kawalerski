/* =========================================================================
   Współdzielony komunikator czatu (używany przez widget na stronie głównej
   ORAZ przez podstronę chat.html). Wymaga: config.js, data.js, supabase-js.
   ========================================================================= */
window.KawalerskiChat = (function () {
  "use strict";

  const cfgOk =
    window.SUPABASE_URL && !String(window.SUPABASE_URL).startsWith("WKLEJ") &&
    window.SUPABASE_ANON_KEY && !String(window.SUPABASE_ANON_KEY).startsWith("WKLEJ");
  const sb = cfgOk ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) : null;

  const TABLE = "kawalerski_chat";
  const WHO_KEY = "kawalerski_whoami";
  const SEEN_KEY = "kawalerski_chat_seen";

  let messages = [];
  const targets = [];          // [{ msgsEl, inputEl }]
  let onUnread = null;
  let lastSeen = parseInt(localStorage.getItem(SEEN_KEY) || "0", 10);

  const who = () => localStorage.getItem(WHO_KEY) || "";
  const first = (f) => (f || "?").split(" ")[0];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const time = (iso) => {
    try { return new Date(iso).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }); }
    catch (e) { return ""; }
  };
  const ts = (iso) => { const t = new Date(iso).getTime(); return isNaN(t) ? 0 : t; };

  function renderInto(msgsEl) {
    const me = who();
    const nearBottom = msgsEl.scrollHeight - msgsEl.scrollTop - msgsEl.clientHeight < 90;
    msgsEl.innerHTML = "";
    if (!messages.length) {
      const p = document.createElement("p");
      p.className = "chat-empty";
      p.textContent = "Jeszcze cisza… napisz pierwszy! 🍻";
      msgsEl.appendChild(p);
    }
    messages.forEach((m) => {
      const mine = m.name === me;
      const row = document.createElement("div");
      row.className = "chat-msg" + (mine ? " mine" : "");
      const nm = document.createElement("span");
      nm.className = "chat-name";
      nm.textContent = mine ? `${first(m.name)} (Ty)` : first(m.name);
      row.appendChild(nm);
      const b = document.createElement("div");
      b.className = "chat-bubble";
      b.innerHTML = `<span class="chat-text">${esc(m.text || "")}</span><span class="chat-time">${time(m.created_at)}</span>`;
      row.appendChild(b);
      msgsEl.appendChild(row);
    });
    if (nearBottom) msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function refreshInput(inputEl) {
    if (!inputEl) return;
    const ok = !!who();
    inputEl.disabled = !ok;
    inputEl.placeholder = ok ? `Piszesz jako ${first(who())}…` : "Najpierw wybierz kim jesteś";
  }

  function unread() {
    const me = who();
    return messages.filter((m) => ts(m.created_at) > lastSeen && m.name !== me).length;
  }
  function updateBadge() { if (onUnread) onUnread(unread()); }

  function renderAll() {
    targets.forEach((t) => { renderInto(t.msgsEl); refreshInput(t.inputEl); });
    updateBadge();
  }

  async function load() {
    if (sb) {
      const { data, error } = await sb
        .from(TABLE).select("name, text, created_at")
        .order("created_at", { ascending: true }).limit(400);
      if (!error && data) messages = data;
    } else {
      try { messages = JSON.parse(localStorage.getItem("kawalerski_chat_local")) || []; }
      catch (e) { messages = []; }
    }
    renderAll();
  }

  async function send(text) {
    const me = who();
    if (!me || !text.trim()) return false;
    if (sb) {
      const { error } = await sb.from(TABLE).insert({ name: me, text: text.trim() });
      if (error) { alert("Nie udało się wysłać: " + error.message); return false; }
      await load();
    } else {
      messages.push({ name: me, text: text.trim(), created_at: new Date().toISOString() });
      localStorage.setItem("kawalerski_chat_local", JSON.stringify(messages));
      renderAll();
    }
    markSeen();
    return true;
  }

  function markSeen() {
    lastSeen = Date.now();
    localStorage.setItem(SEEN_KEY, String(lastSeen));
    updateBadge();
  }

  // opts: { msgsEl, formEl, inputEl }
  function mount(opts) {
    targets.push({ msgsEl: opts.msgsEl, inputEl: opts.inputEl });
    if (opts.formEl) {
      opts.formEl.addEventListener("submit", async (e) => {
        e.preventDefault();
        const t = opts.inputEl.value;
        opts.inputEl.value = "";
        await send(t);
      });
    }
    renderInto(opts.msgsEl);
    refreshInput(opts.inputEl);
  }

  function subscribe() {
    if (!sb) return;
    sb.channel("chat-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: TABLE }, load)
      .subscribe();
    setInterval(load, 8000);
  }

  load();
  subscribe();

  return {
    mount,
    reload: load,
    refresh: renderAll,
    markSeen,
    setUnreadHandler: (fn) => { onUnread = fn; updateBadge(); },
    configured: !!sb,
  };
})();
