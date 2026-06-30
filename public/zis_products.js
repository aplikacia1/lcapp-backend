const params = new URLSearchParams(window.location.search);

const search =
  params.get("search") || "";

const category =
  params.get("category") || "";

const email =
  params.get("email") || "";
  loadProducts();

async function loadProducts() {

  const res =
    await fetch(
      `/api/zis/cards/${encodeURIComponent(search)}/${encodeURIComponent(category)}`
    );

  const cards =
    await res.json();

  const result =
  document.getElementById("result");

result.innerHTML = "";

cards.forEach(card => {

  const product =
    card.productId;

  const div =
    document.createElement("div");

  div.className =
    "product-card";

    
  div.innerHTML = `
<img
    src="${product.image}"
    class="product-image">

<div class="product-title">
    ${product.name}
</div>
`;

div.onclick = () => {

  let url =
    "zis_detail.html?id=" + card._id;

  if (email) {
    url +=
      "&email=" +
      encodeURIComponent(email);
  }

  window.location.href = url;

};

  result.appendChild(div);

});

}