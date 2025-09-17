(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const params = new URLSearchParams(location.search);

  const bannerId = params.get("id");
  const sec = Math.min(60, Math.max(2, Number(params.get("sec") || params.get("s") || 6)));
  const INTERVAL_MS = sec * 1000;

  let rotateTimer = null;
  let refreshListTimer = null;
  let list = [];
  let idx = 0;

  function renderBanner(b) {
    if (!b) {
      $("#bTitle").textContent = "Banner";
      $("#bImg").removeAttribute("src");
      $("#bImg").alt = "";
      $("#bDesc").textContent = "";
      return;
    }
    $("#bTitle").textContent = b.title || "Banner";
    // ✅ ak je v DB už /uploads/…, nepridávaj znova prefix
    const src = (b.image || "").startsWith("/uploads/") ? b.image : `/uploads/${b.image || ""}`;
    $("#bImg").src = src;
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
    await fetchOne(bannerId);
    rotateTimer = setInterval(() => fetchOne(bannerId), INTERVAL_MS);
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

    refreshListTimer = setInterval(fetchActiveList, 60000);
  }

  document.addEventListener("visibilitychange", async () => {
    if (document.hidden) {
      stopTimers();
    } else {
      if (bannerId) await startSingleMode();
      else await startRotateMode();
    }
  });

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
    if (bannerId) await startSingleMode();
    else await startRotateMode();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
