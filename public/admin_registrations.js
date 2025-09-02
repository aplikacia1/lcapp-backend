document.addEventListener("DOMContentLoaded", () => {
  const list = document.getElementById("userList");
  const countUsers = document.getElementById("userCount");
  const countOnline = document.getElementById("onlineCount");
  const searchInput = document.getElementById("searchInput");
  const authWarn = document.getElementById("authWarn");

  const API = (window.API_BASE || "").replace(/\/$/, ""); // ak nemáš config.js, nechaj prázdne => relatívne

  let allUsers = [];

  async function api(url, options = {}) {
    const resp = await fetch(url, {
      credentials: "include",
      headers: { "Accept": "application/json", ...(options.headers || {}) },
      ...options
    });
    if (resp.status === 401 || resp.status === 403) {
      if (authWarn) authWarn.style.display = "block";
    }
    return resp;
  }

  function updateUserCount() {
    if (countUsers) countUsers.textContent = `Registrovaných zákazníkov: ${allUsers.length}`;
  }

  function renderUsers(users) {
    list.innerHTML = "";
    users.forEach((user, index) => {
      const div = document.createElement("div");
      div.className = "user-box";
      const safeNote = (user.note || "").replace(/"/g, "&quot;");

      div.innerHTML = `
        <p><strong>${index + 1}. ${user.email || "(bez e-mailu)"}${user.role === "admin" ? " • ADMIN" : ""}</strong></p>
        ${user.name ? `<p>Meno / prezývka: ${user.name}</p>` : ""}
        <label>Poznámka: <input type="text" value="${safeNote}" data-id="${user._id}" class="note-input"/></label>
        <button class="delete-button" data-id="${user._id}" ${user.role === "admin" ? "disabled title='Nedá sa vymazať admin účty'" : ""}>❌ Vymazať</button>
      `;
      list.appendChild(div);
    });

    // Uloženie poznámky
    document.querySelectorAll(".note-input").forEach(input => {
      input.addEventListener("change", (e) => {
        const userId = e.target.dataset.id;
        const note = e.target.value;
        api(`${API}/api/admin/users/${userId}/note`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note })
        }).catch(err => console.error("Chyba pri ukladaní poznámky:", err));
      });
    });

    // Mazanie používateľa
    document.querySelectorAll(".delete-button").forEach(button => {
      button.addEventListener("click", () => {
        const id = button.dataset.id;
        if (!id) return;
        if (!confirm("Naozaj chceš vymazať tohto používateľa a všetku jeho aktivitu v Lištobooku?")) return;

        api(`${API}/api/admin/users/${id}`, { method: "DELETE" })
          .then(async res => {
            if (!res.ok && res.status !== 204) {
              const t = await res.text();
              throw new Error(t || `HTTP ${res.status}`);
            }
            allUsers = allUsers.filter(u => u._id !== id);
            const q = (searchInput?.value || "").toLowerCase();
            const filtered = q
              ? allUsers.filter(user =>
                  (user.email && user.email.toLowerCase().includes(q)) ||
                  (user.name && user.name.toLowerCase().includes(q)) ||
                  (user.note && user.note.toLowerCase().includes(q))
                )
              : allUsers;
            updateUserCount();
            renderUsers(filtered);
          })
          .catch(err => {
            console.error("Chyba pri mazaní:", err);
            alert("Mazanie zlyhalo.");
          });
      });
    });
  }

  // Načítaj používateľov
  api(`${API}/api/admin/users`)
    .then(res => res.ok ? res.json() : Promise.reject(res))
    .then(users => { allUsers = users || []; updateUserCount(); renderUsers(allUsers); })
    .catch(err => {
      list.innerHTML = "<p style='color: #ffb3b3;'>Nepodarilo sa načítať používateľov.</p>";
      console.error("Chyba pri načítaní používateľov:", err);
    });

  // Online count
  api(`${API}/api/admin/online`)
    .then(res => res.ok ? res.json() : Promise.reject(res))
    .then(data => {
      if (countOnline) {
        const c = (data && typeof data.count === "number") ? data.count : 0;
        countOnline.textContent = `Aktuálne prihlásení: ${c}`;
      }
    })
    .catch(err => console.error("Chyba pri zisťovaní online stavu:", err));

  // Vyhľadávanie
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const q = (searchInput.value || "").toLowerCase();
      const filtered = allUsers.filter(user =>
        (user.email && user.email.toLowerCase().includes(q)) ||
        (user.name && user.name.toLowerCase().includes(q)) ||
        (user.note && user.note.toLowerCase().includes(q))
      );
      renderUsers(filtered);
    });
  }
});
