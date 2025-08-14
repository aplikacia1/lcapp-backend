document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(sessionStorage.getItem("loggedInUser"));
  if (!user || !user.email) {
    window.location.href = "index.html";
    return;
  }

  document.getElementById("userGreeting").textContent = `Prihlásený: ${user.name || user.email}`;

  const ordersContainer = document.querySelector(".main-content");
  ordersContainer.innerHTML = ""; // vyčisti pred načítaním

  try {
    const response = await fetch("/api/orders");
    const allOrders = await response.json();

    const userOrders = allOrders.filter(order => order.customerEmail === user.email);

    if (userOrders.length === 0) {
      ordersContainer.innerHTML = `
        <div class="order-box">
          <div class="order-header">Žiadne objednávky zatiaľ neboli vytvorené.</div>
        </div>
      `;
      return;
    }

    userOrders.forEach(order => {
      // 🟢🟡⚪ podľa stavu
      let statusText = "";
      let statusColor = "";
      if (order.status === "new") {
        statusText = "Nová";
        statusColor = "green";
      } else if (order.status === "in_progress") {
        statusText = "Rozpracovaná";
        statusColor = "gold";
      } else if (order.status === "completed") {
        statusText = "Vybavená";
        statusColor = "gray";
      }

      const box = document.createElement("div");
      box.className = "order-box";

      const header = document.createElement("div");
      header.className = "order-header";
      header.innerHTML = `Objednávka č. ${order._id.slice(-6).toUpperCase()} – <span style="color:${statusColor}">${statusText}</span>`;
      box.appendChild(header);

      const detail = document.createElement("div");
      detail.className = "order-detail";
      detail.style.display = "none";

      order.items.forEach(item => {
        const row = document.createElement("div");
        row.textContent = `– ${item.name} (${item.quantity} ks)`;
        detail.appendChild(row);
      });

      box.appendChild(detail);
      ordersContainer.appendChild(box);

      // Kliknutie zobrazí/skrýva detaily
      header.addEventListener("click", () => {
        detail.style.display = detail.style.display === "none" ? "block" : "none";
      });
    });

  } catch (error) {
    console.error("❌ Chyba pri načítaní objednávok:", error);
    ordersContainer.innerHTML = `
      <div class="order-box">
        <div class="order-header">Chyba pri načítaní objednávok.</div>
      </div>
    `;
  }
});
