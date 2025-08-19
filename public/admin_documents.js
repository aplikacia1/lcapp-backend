document.addEventListener("DOMContentLoaded", () => {
  fetchCategories();
});

function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") n.className = v;
    else if (k === "style") Object.assign(n.style, v);
    else if (k.startsWith("on") && typeof v === "function") n[k] = v;
    else n.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c == null) return;
    n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return n;
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function fetchCategories() {
  const container = document.getElementById("category-list");
  container.innerHTML = "Načítavam…";

  try {
    const categories = await fetchJSON("/api/categories");

    if (!categories?.length) {
      container.textContent = "Žiadne kategórie nenájdené.";
      return;
    }

    const table = el("table", { class: "table" }, [
      el("thead", {}, el("tr", {}, [
        el("th", {}, "Názov"),
        el("th", {}, "Obrázok"),
        el("th", {}, "Počet tovarov"),
        el("th", {}, "Upraviť"),
        el("th", {}, "Vymazať"),
      ])),
      el("tbody")
    ]);

    const tbody = table.querySelector("tbody");

    // Najprv vykreslíme riadky (aj s "…"), potom dopočítame počty produktov
    categories.forEach(cat => {
      const imgSrc = cat?.image ? `/uploads/${cat.image}` : "placeholder_cat.png";

      const nameCell  = el("td", {}, cat?.name || "Bez názvu");
      const imageCell = el("td", {}, el("img", {
        src: imgSrc, alt: cat?.name || "Kategória",
        onerror: () => { imageCell.querySelector("img").src = "placeholder_cat.png"; }
      }));
      const countCell = el("td", {}, "…");

      const editBtn = el("button", { onclick: () => {
        window.location.href = `/admin_add_product.html?id=${cat._id}`;
      }}, "Upraviť");

      const delBtn = el("button", {
        class: "danger",
        onclick: async () => {
          if (!confirm("Naozaj chcete vymazať túto kategóriu?")) return;
          try {
            const res = await fetch(`/api/categories/${cat._id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Chyba pri mazaní kategórie");
            fetchCategories(); // refresh
          } catch (e) {
            alert(e.message || "Chyba pri mazaní.");
          }
        }
      }, "Vymazať");

      const row = el("tr", {}, [
        nameCell, imageCell, countCell, el("td", {}, editBtn), el("td", {}, delBtn)
      ]);
      tbody.appendChild(row);

      // ⚠️ Počet produktov – podľa bežnej logiky aplikácie
      // (na products.html sa filtruje podľa categoryId)
      fetch(`/api/products?categoryId=${encodeURIComponent(cat._id)}`)
        .then(r => r.ok ? r.json() : Promise.reject(new Error("Chyba")))
        .then(items => { countCell.textContent = Array.isArray(items) ? items.length : 0; })
        .catch(() => { countCell.textContent = "0"; });
    });

    container.innerHTML = "";
    container.appendChild(table);

  } catch (err) {
    container.innerHTML = `<p style="color: #ffaaaa;">Chyba pri načítaní kategórií: ${err.message}</p>`;
    console.error(err);
  }
}
