document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("adminLogoutBtn");
  const timelineBtn = document.getElementById("adminTimelineBtn");
  const refreshBtn = document.getElementById("refreshStatsBtn");

  // ===== helpers =====
  const getApiBase = () => {
    // Skúsime nájsť API base z configu, ak existuje.
    // (Neviem presnú štruktúru tvojho /js/config.js, preto fallbacky.)
    const w = window;

    // najčastejšie varianty:
    if (typeof w.API_BASE_URL === "string" && w.API_BASE_URL.trim()) return w.API_BASE_URL.trim();
    if (w.CONFIG && typeof w.CONFIG.API_BASE_URL === "string" && w.CONFIG.API_BASE_URL.trim()) return w.CONFIG.API_BASE_URL.trim();
    if (w.CONFIG && typeof w.CONFIG.apiBaseUrl === "string" && w.CONFIG.apiBaseUrl.trim()) return w.CONFIG.apiBaseUrl.trim();
    if (typeof w.apiBaseUrl === "string" && w.apiBaseUrl.trim()) return w.apiBaseUrl.trim();

    // fallback: rovnaký origin (Render / produkcia)
    return "";
  };

  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = (val === 0 || val) ? String(val) : "—";
  };

  // ===== logout =====
  logoutBtn.addEventListener("click", () => {
    // nechávam kompatibilitu: ak config existuje, použije sa; inak fallback na localhost (ako doteraz)
    const base = getApiBase();
    const url = base ? `${base}/api/admin/logout` : "http://localhost:5000/api/admin/logout";

    fetch(url, {
      method: "POST",
      credentials: "include",
    })
      .then(() => {
        window.location.href = "admin_login.html";
      })
      .catch((error) => {
        console.error("Chyba pri odhlasovaní admina:", error);
      });
  });

  // ===== open timeline in admin mode =====
  timelineBtn.addEventListener("click", () => {
    const email = prompt(
      "Zadajte e-mail, pod ktorým chcete otvoriť Lištobook (stačí ľubovoľný):",
      ""
    );
    if (!email) return;
    const url = `timeline.html?email=${encodeURIComponent(email)}&admin=1`;
    window.location.href = url;
  });

  // ===== stats =====
  const loadDashboardStats = async () => {
    // reset na "—" pri načítaní
    setText("statRatingsToday", "…");
    setText("statRatingsTotal", "…");
    setText("statTimelineToday", "…");
    setText("statTimelineTotal", "…");
    setText("statOrdersToday", "…");
    setText("statOrdersTotal", "…");
    setText("statClicksToday", "…");
    setText("statClicksTotal", "…");

    const base = getApiBase();
    const statsUrl = `${base}/api/admin/dashboard-stats`;

    try {
      const res = await fetch(statsUrl, { credentials: "include" });

      if (!res.ok) {
        // endpoint ešte nemusí existovať – ukážeme "—" a necháme konzolu
        console.warn("dashboard-stats endpoint nevrátil OK:", res.status);
        setText("statRatingsToday", "—");
        setText("statRatingsTotal", "—");
        setText("statTimelineToday", "—");
        setText("statTimelineTotal", "—");
        setText("statOrdersToday", "—");
        setText("statOrdersTotal", "—");
        setText("statClicksToday", "—");
        setText("statClicksTotal", "—");
        return;
      }

      const data = await res.json();

      // očakávaný tvar:
      // {
      //   ratings: { today: number, total: number },
      //   timeline: { today: number, total: number }, // príspevky+komentáre
      //   orders: { today: number, total: number },   // admin_orders
      //   clicks: { today: number, total: number }    // kliky na hodnotenie (po doplnení logu)
      // }

      setText("statRatingsToday", data?.ratings?.today);
      setText("statRatingsTotal", data?.ratings?.total);

      setText("statTimelineToday", data?.timeline?.today);
      setText("statTimelineTotal", data?.timeline?.total);

      setText("statOrdersToday", data?.orders?.today);
      setText("statOrdersTotal", data?.orders?.total);

      setText("statClicksToday", data?.clicks?.today);
      setText("statClicksTotal", data?.clicks?.total);

    } catch (err) {
      console.error("Chyba pri načítaní admin štatistík:", err);
      setText("statRatingsToday", "—");
      setText("statRatingsTotal", "—");
      setText("statTimelineToday", "—");
      setText("statTimelineTotal", "—");
      setText("statOrdersToday", "—");
      setText("statOrdersTotal", "—");
      setText("statClicksToday", "—");
      setText("statClicksTotal", "—");
    }
  };

  if (refreshBtn) refreshBtn.addEventListener("click", loadDashboardStats);

  // načítaj hneď po otvorení stránky
  loadDashboardStats();
});
