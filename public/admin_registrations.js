document.addEventListener("DOMContentLoaded", () => {
  const list = document.getElementById("userList");
  const countUsers = document.getElementById("userCount");
  const countOnline = document.getElementById("onlineCount");
  const searchInput = document.getElementById("searchInput");
  let allUsers = [];

  // Získanie všetkých používateľov
  fetch("http://localhost:5000/api/admin/users")
    .then(res => res.json())
    .then(users => {
      allUsers = users;
      updateUserCount();
      renderUsers(users);
    })
    .catch(err => {
      list.innerHTML = "<p style='color: red;'>Nepodarilo sa načítať používateľov.</p>";
      console.error("Chyba pri načítaní používateľov:", err);
    });

  // Získanie počtu online používateľov
  fetch("http://localhost:5000/api/admin/online")
    .then(res => res.json())
    .then(data => {
      if (countOnline) {
        countOnline.textContent = `Aktuálne prihlásení: ${data.count}`;
      }
    })
    .catch(err => {
      console.error("Chyba pri zisťovaní online stavu:", err);
    });

  // Vyhľadávanie
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const query = searchInput.value.toLowerCase();
      const filtered = allUsers.filter(user =>
        (user.email && user.email.toLowerCase().includes(query)) ||
        (user.nickname && user.nickname.toLowerCase().includes(query)) ||
        (user.name && user.name.toLowerCase().includes(query)) ||
        (user.companyName && user.companyName.toLowerCase().includes(query)) ||
        (user.billingAddress && user.billingAddress.toLowerCase().includes(query)) ||
        (user.shippingAddress && user.shippingAddress.toLowerCase().includes(query)) ||
        (user.adminNote && user.adminNote.toLowerCase().includes(query))
      );
      renderUsers(filtered);
    });
  }

  // Funkcia na vykreslenie používateľov
  function renderUsers(users) {
    list.innerHTML = "";
    users.forEach((user, index) => {
      const div = document.createElement("div");
      div.className = "user-box";

      div.innerHTML = `
        <p><strong>${index + 1}. ${user.email}</strong></p>
        ${user.nickname || user.name ? `<p>Meno / prezývka: ${user.nickname || user.name}</p>` : ""}
        ${user.companyName ? `<p>Firma: ${user.companyName}</p>` : ""}
        ${user.billingAddress ? `<p>Fakturačná adresa: ${user.billingAddress}</p>` : ""}
        ${user.shippingAddress ? `<p>Dodacia adresa: ${user.shippingAddress}</p>` : ""}
        <label>Poznámka: <input type="text" value="${user.adminNote || ""}" data-id="${user._id}" class="note-input"/></label>
        <button class="delete-button" data-id="${user._id}">❌ Vymazať</button>
      `;

      list.appendChild(div);
    });

    // Poznámky
    document.querySelectorAll(".note-input").forEach(input => {
      input.addEventListener("change", (e) => {
        const userId = e.target.dataset.id;
        const note = e.target.value;
        fetch(`http://localhost:5000/api/users/${userId}/note`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note })
        });
      });
    });

    // Mazanie
    document.querySelectorAll(".delete-button").forEach(button => {
      button.addEventListener("click", () => {
        const id = button.dataset.id;
        if (confirm("Naozaj chceš vymazať tohto používateľa?")) {
          fetch(`http://localhost:5000/api/users/${id}`, {
            method: "DELETE"
          })
            .then(() => {
              // Odstrániť zo zoznamu a aktualizovať
              allUsers = allUsers.filter(u => u._id !== id);
              const query = searchInput?.value.toLowerCase() || "";
              const filtered = query
                ? allUsers.filter(user =>
                    (user.email && user.email.toLowerCase().includes(query)) ||
                    (user.nickname && user.nickname.toLowerCase().includes(query)) ||
                    (user.name && user.name.toLowerCase().includes(query)) ||
                    (user.companyName && user.companyName.toLowerCase().includes(query)) ||
                    (user.billingAddress && user.billingAddress.toLowerCase().includes(query)) ||
                    (user.shippingAddress && user.shippingAddress.toLowerCase().includes(query)) ||
                    (user.adminNote && user.adminNote.toLowerCase().includes(query))
                  )
                : allUsers;
              updateUserCount();
              renderUsers(filtered);
            })
            .catch(err => console.error("Chyba pri mazaní:", err));
        }
      });
    });
  }

  function updateUserCount() {
    if (countUsers) {
      countUsers.textContent = `Registrovaných zákazníkov: ${allUsers.length}`;
    }
  }
});
