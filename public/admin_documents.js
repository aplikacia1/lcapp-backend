document.addEventListener("DOMContentLoaded", () => {
  fetchCategories();
});

function fetchCategories() {
  fetch("/api/categories")
    .then(res => {
      if (!res.ok) throw new Error(`Chyba pri načítaní kategórií: ${res.status}`);
      return res.json();
    })
    .then(categories => {
      const container = document.getElementById("category-list");
      container.innerHTML = ""; // Vyčistiť

      if (categories.length === 0) {
        container.textContent = "Žiadne kategórie nenájdené.";
        return;
      }

      const table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";
      table.innerHTML = `
        <thead>
          <tr>
            <th>Názov</th>
            <th>Obrázok</th>
            <th>Počet tovarov</th>
            <th>Upraviť</th>
            <th>Vymazať</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;

      const tbody = table.querySelector("tbody");

      categories.forEach(cat => {
        fetch(`/api/categories/items/${cat._id}`)
          .then(res => res.json())
          .then(items => {
            const row = document.createElement("tr");
            row.style.borderBottom = "1px solid #ccc";
            row.style.textAlign = "center";
            row.style.color = "white";

            const nameCell = document.createElement("td");
            nameCell.textContent = cat.name;

            const imageCell = document.createElement("td");
            const img = document.createElement("img");
            img.src = `/uploads/${cat.image}`;
            img.alt = cat.name;
            img.style.width = "150px";
            img.style.cursor = "pointer";
            img.onclick = () => window.open(`/uploads/${cat.image}`, "_blank");
            imageCell.appendChild(img);

            const countCell = document.createElement("td");
            countCell.textContent = items.length;

            const editCell = document.createElement("td");
            const editBtn = document.createElement("button");
            editBtn.textContent = "Upraviť";
            editBtn.onclick = () => {
              window.location.href = `/admin_add_product.html?id=${cat._id}`;
            };
            editCell.appendChild(editBtn);

            const deleteCell = document.createElement("td");
            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "Vymazať";
            deleteBtn.onclick = () => {
              if (confirm("Naozaj chcete vymazať túto kategóriu?")) {
                fetch(`/api/categories/${cat._id}`, { method: "DELETE" })
                  .then(res => {
                    if (!res.ok) throw new Error("Chyba pri mazaní kategórie");
                    fetchCategories();
                  })
                  .catch(err => alert(err.message));
              }
            };
            deleteCell.appendChild(deleteBtn);

            row.appendChild(nameCell);
            row.appendChild(imageCell);
            row.appendChild(countCell);
            row.appendChild(editCell);
            row.appendChild(deleteCell);

            tbody.appendChild(row);
          });
      });

      container.appendChild(table);
    })
    .catch(err => {
      const container = document.getElementById("category-list");
      container.innerHTML = `<p style="color: red;">${err.message}</p>`;
      console.error(err);
    });
}
