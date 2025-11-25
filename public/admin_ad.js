// public/admin_ad.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("adForm");
  const imageInput = document.getElementById("adImage");
  const targetUrlInput = document.getElementById("targetUrl");
  const isActiveInput = document.getElementById("isActive");
  const statusMsg = document.getElementById("statusMsg");
  const adsListBox = document.getElementById("adsList");

  const API_BASE_URL = (
    window.API_BASE_URL ||
    window.location.origin ||
    ""
  ).replace(/\/+$/, "");

  const setStatus = (msg, isError = false) => {
    if (!statusMsg) return;
    statusMsg.textContent = msg;
    statusMsg.style.color = isError ? "#ff8080" : "#80ff80";
  };

  const escapeHTML = (str = "") =>
    String(str).replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[m]));

  if (!form) return;

  // 🔹 ULOŽENIE / VYTVORENIE REKLAMY
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const file = imageInput.files[0];
    if (!file) {
      setStatus("Prosím, vyberte obrázok reklamy.", true);
      return;
    }

    try {
      setStatus("Ukladám reklamu...");

      const fd = new FormData();
      fd.append("image", file); // MUSÍ byť "image" – adRoutes čaká toto pole
      fd.append("targetUrl", targetUrlInput.value.trim());
      fd.append("isActive", isActiveInput.checked ? "true" : "false");

      const res = await fetch(`${API_BASE_URL}/api/ads`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));
      console.log("Ad save response:", res.status, data);

      if (!res.ok || data?.ok !== true) {
        const msg =
          data?.message || `Ukladanie reklamy zlyhalo (HTTP ${res.status}).`;
        throw new Error(msg);
      }

      setStatus("Reklama bola úspešne uložená. 🎉");
      // form.reset(); // ak chceš, môžeš odkomentovať

      // po úspechu obnovíme zoznam reklám
      await loadAdsList();
    } catch (err) {
      console.error("Chyba pri ukladaní reklamy:", err);
      setStatus(
        "Pri ukladaní reklamy nastala chyba. " +
          (err.message || "Skúste to prosím znova."),
        true
      );
    }
  });

  // 🔹 NAČÍTANIE ZOZNAMU REKLÁM
  async function loadAdsList() {
    if (!adsListBox) return;

    adsListBox.innerHTML = "<p>Načítavam reklamy...</p>";

    try {
      const res = await fetch(`${API_BASE_URL}/api/ads`, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : [];

      if (!list.length) {
        adsListBox.innerHTML = "<p>Zatiaľ nie sú uložené žiadne reklamy.</p>";
        return;
      }

      // zoradíme od najnovšej
      list.sort((a, b) => {
        const da = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const db = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return db - da;
      });

      adsListBox.innerHTML = list
        .map((ad) => {
          const id = ad._id || ad.id || "";
          const imageUrl =
            ad.imageUrl || ad.image || ad.imagePath || ad.url || "";
          const targetUrl = ad.targetUrl || ad.link || "";
          const isActive = !!ad.isActive;
          const created = ad.createdAt || ad.updatedAt || "";
          const createdText = created
            ? new Date(created).toLocaleString("sk-SK")
            : "";

          return `
            <article class="ad-item" data-id="${escapeHTML(id)}"
              style="
                border:1px solid rgba(255,255,255,.2);
                border-radius:12px;
                padding:10px 12px;
                margin:10px 0;
                display:flex;
                gap:12px;
                align-items:flex-start;
                background:rgba(0,0,0,.15);
              "
            >
              <div class="ad-thumb" style="flex:0 0 140px;">
                ${
                  imageUrl
                    ? `<img src="${escapeHTML(
                        imageUrl.startsWith("http")
                          ? imageUrl
                          : "/uploads/" + imageUrl.replace(/^\\/+/, "")
                      )}" alt="Reklama" style="max-width:140px; max-height:90px; border-radius:8px; object-fit:contain; background:#001133;" />`
                    : "<div style='width:140px;height:90px;border-radius:8px;background:#001133;display:flex;align-items:center;justify-content:center;font-size:12px;opacity:.7;'>Bez obrázka</div>"
                }
              </div>
              <div class="ad-info" style="flex:1 1 auto; font-size:14px;">
                <div>
                  <strong>Odkaz:</strong>
                  ${
                    targetUrl
                      ? `<a href="${escapeHTML(
                          targetUrl
                        )}" target="_blank" rel="noopener noreferrer" style="color:#cfe2ff;">${escapeHTML(
                          targetUrl
                        )}</a>`
                      : "<span class='muted'>bez odkazu</span>"
                  }
                </div>
                <div>
                  <strong>Stav:</strong>
                  ${
                    isActive
                      ? "<span style='color:#80ff80;'>Aktívna</span>"
                      : "<span class='muted'>Neaktívna</span>"
                  }
                </div>
                ${
                  createdText
                    ? `<div><strong>Vytvorená:</strong> ${escapeHTML(
                        createdText
                      )}</div>`
                    : ""
                }
                <div style="margin-top:8px;">
                  <button
                    type="button"
                    class="btn-delete-ad"
                    data-id="${escapeHTML(id)}"
                    style="
                      padding:4px 10px;
                      border-radius:999px;
                      border:1px solid rgba(255,128,128,.7);
                      background:rgba(80,0,0,.7);
                      color:#ffecec;
                      font-size:13px;
                      cursor:pointer;
                    "
                  >
                    🗑️ Vymazať túto reklamu
                  </button>
                </div>
              </div>
            </article>
          `;
        })
        .join("");
    } catch (err) {
      console.error("Chyba pri načítaní reklám:", err);
      adsListBox.innerHTML =
        "<p style='color:#ff8080;'>Nepodarilo sa načítať uložené reklamy.</p>";
    }
  }

  // 🔹 MAZANIE REKLAMY
  if (adsListBox) {
    adsListBox.addEventListener("click", async (e) => {
      const btn = e.target.closest(".btn-delete-ad");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      if (!id) return;

      if (
        !confirm("Naozaj chcete túto reklamu vymazať? Táto akcia je nezvratná.")
      ) {
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/ads/${encodeURIComponent(id)}`, {
          method: "DELETE",
          credentials: "include",
        });

        const data = await res.json().catch(() => ({}));
        console.log("Ad delete response:", res.status, data);

        if (!res.ok || data?.ok !== true) {
          const msg =
            data?.message || `Mazanie reklamy zlyhalo (HTTP ${res.status}).`;
          throw new Error(msg);
        }

        setStatus("Reklama bola vymazaná. 🗑️");
        await loadAdsList();
      } catch (err) {
        console.error("Chyba pri mazaní reklamy:", err);
        setStatus(
          "Pri mazaní reklamy nastala chyba. " +
            (err.message || "Skúste to prosím znova."),
          true
        );
      }
    });
  }

  // pri načítaní stránky hneď zobrazíme zoznam reklám
  loadAdsList();
});
