// ===== LCAPP – Unread badge pre tlačidlo "Správy" =====
(function(){
  function getEmailFromURL() {
    const p = new URLSearchParams(location.search);
    return (p.get("email") || "").trim().toLowerCase();
  }

  // nie všade musí byť rovnaký mount path – skúsime viac možností a prvú funkčnú si zapamätáme
  const BASES = ["/messages", "/api/messages", "/message", "/api/message"];
  let resolvedBase = null;

  async function resolveBase() {
    if (resolvedBase) return resolvedBase;
    for (const b of BASES) {
      try {
        const r = await fetch(b + "/admin-address", { headers: { Accept: "application/json" } });
        if (r.ok) { resolvedBase = b; break; }
      } catch (_) {}
    }
    if (!resolvedBase) resolvedBase = "/messages"; // fallback
    return resolvedBase;
  }

  async function fetchUnread(email) {
    const base = await resolveBase();
    const res = await fetch(`${base}/unread-count/${encodeURIComponent(email)}`, {
      credentials: "include",
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    return (typeof data.count === "number") ? data.count : 0;
  }

  function updateBadge(count) {
    const badge = document.getElementById("msgBadge");
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count > 99 ? "99+" : String(count);
      badge.style.display = "inline-flex";
    } else {
      badge.style.display = "none";
    }
  }

  const POLL_MS = 6000;
  let timer = null;

  async function tick(email){
    try {
      const n = await fetchUnread(email);
      updateBadge(n);
    } catch (_) {
      // ticho – nech to nekazí konzolu
    } finally {
      timer = setTimeout(() => tick(email), POLL_MS);
    }
  }

  // jemné háčiky pre budúce "live" updaty bez straty rozpísaných textov
  const draftKeepers = new Map();
  function rememberDrafts(){
    document.querySelectorAll("[data-preserve]").forEach(el => {
      draftKeepers.set(el, {
        value: el.value,
        selStart: el.selectionStart,
        selEnd: el.selectionEnd
      });
    });
  }
  function restoreDrafts(){
    draftKeepers.forEach((d, el) => {
      if (!document.contains(el)) return;
      el.value = d.value;
      if (typeof d.selStart === "number" && typeof d.selEnd === "number") {
        try { el.setSelectionRange(d.selStart, d.selEnd); } catch(_) {}
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const email = getEmailFromURL();
    if (!email) return; // bez emailu nevieme rátať

    // (voliteľné) – pripravené pre budúci čiastočný prerender
    rememberDrafts();
    restoreDrafts();

    tick(email);
  });
})();
