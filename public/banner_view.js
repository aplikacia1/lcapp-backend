(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const params = new URLSearchParams(location.search);

  const bannerId = params.get("id");               // ak je, zobrazujeme tento konkrétny banner
  const sec = Math.min(60, Math.max(2, Number(params.get("sec") || params.get("s") || 6))); // 2..60 s
  const INTERVAL_MS = sec * 1000;

  let rotateTimer = null;     // timer pre rotáciu alebo single refresh
  let refreshListTimer = null; // periodické obnovenie zoznamu (pri rotácii)
  let list = [];              // zoznam aktívnych bannerov
  let idx = 0;                // index rotácie

  function renderBanner(b) {
    if (!b) {
      $("#bTitle").textContent = "Banner";
      $("#bImg").removeAttribute("src");
      $("#bImg").alt = "";
      $("#bDesc").textContent = "";
      return;
    }
    $("#bTitle").textContent = b.title || "Banner";
    $("#bImg").src = "/uploads/" + (b.image || "");
    $("#bImg").alt = b.title || "Banner";
    $("#bDesc").textContent = b.description || "";
  }

  async function fetchOne(id) {
    try {
      const res = await fetch(`/api/banners/${id}`);
      if (!res.ok) throw new Error();
      const b = await res.json();
      renderBanner(b);
    } catch {
      $("#bTitle").textContent = "Banner nenájdený";
    }
  }

  async function fetchActiveList() {
    try {
      const res = await fetch(`/api/banners`);
      if (!res.ok) throw new Error();
      const items = await res.json();
      // len aktívne bannery, najnovšie navrchu
      list = (items || []).filter(b => b.isActive).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      if (idx >= list.length) idx = 0;
    } catch {
      list = [];
    }
  }

  function stopTimers() {
    if (rotateTimer) { clearInterval(rotateTimer); rotateTimer = null; }
    if (refreshListTimer) { clearInterval(refreshListTimer); refreshListTimer = null; }
  }

  async function startSingleMode() {
    stopTimers();
    await fetchOne(bannerId); // hneď načítať
    rotateTimer = setInterval(() => fetchOne(bannerId), INTERVAL_MS); // pravidelne obnovovať rovnaký banner
  }

  async function startRotateMode() {
    stopTimers();
    await fetchActiveList();
    if (!list.length) {
      $("#bTitle").textContent = "Žiadne aktívne bannery";
      $("#bImg").removeAttribute("src");
      $("#bDesc").textContent = "";
      return;
    }
    idx = 0;
    renderBanner(list[idx]);

    rotateTimer = setInterval(() => {
      if (!list.length) return;
      idx = (idx + 1) % list.length;
      renderBanner(list[idx]);
    }, INTERVAL_MS);

    // každú minútu obnov zoznam (aby sa prejavili zmeny z adminu)
    refreshListTimer = setInterval(fetchActiveList, 60000);
  }

  // pauzovanie rotácie, keď je karta skrytá
  document.addEventListener("visibilitychange", async () => {
    if (document.hidden) {
      stopTimers();
    } else {
      if (bannerId) await startSingleMode();
      else await startRotateMode();
    }
  });

  // voliteľne: manuálne šípky ← →
  document.addEventListener("keydown", (e) => {
    if (bannerId || !list.length) return;
    if (e.key === "ArrowRight") {
      idx = (idx + 1) % list.length;
      renderBanner(list[idx]);
    } else if (e.key === "ArrowLeft") {
      idx = (idx - 1 + list.length) % list.length;
      renderBanner(list[idx]);
    }
  });

  async function init() {
    if (bannerId) {
      await startSingleMode();
    } else {
      await startRotateMode();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
