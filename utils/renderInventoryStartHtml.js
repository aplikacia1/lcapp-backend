module.exports = function renderInventoryStartHtml({

  warehouse,
  records,
  generatedAt,
  inventoryDate

}) {

  const rows = records.map((item, index) => {

    return `

      <tr>
        <td>${index + 1}</td>

        <td>
          ${item.productCode || "-"}
        </td>

        <td>
          ${item.productName || "-"}
        </td>

        <td class="qty">
          ${item.systemStock ?? 0}
        </td>
      </tr>

    `;

  }).join("");

  return `

<!DOCTYPE html>
<html lang="sk">

<head>

<meta charset="UTF-8" />

<style>

body{
  font-family:Arial,sans-serif;
  margin:0;
  color:#111;
  background:white;
}

/* =========================
   TITULNÁ STRANA
========================= */

.cover{

  min-height:85vh;

  display:flex;

  flex-direction:column;

  justify-content:center;

  align-items:center;

  text-align:center;

  background:
    linear-gradient(
      180deg,
      #13204a 0%,
      #1d2347 100%
    );

  color:white;

  padding:60px;

  page-break-after:always;
}

.cover img{
  width:220px;
  margin-bottom:40px;
}

.cover h1{
  font-size:48px;
  margin-bottom:18px;
}

.cover h2{
  font-size:26px;
  color:#7ee0a7;
  margin-bottom:40px;
}

.cover-box{

  background:rgba(255,255,255,.08);

  border:1px solid rgba(255,255,255,.15);

  border-radius:18px;

  padding:30px;

  width:520px;

  max-width:100%;
}

.cover-box p{
  margin:10px 0;
  font-size:18px;
}

.content{
  padding:30px 30px 50px 30px;
}

.table-title{
  font-size:24px;
  margin-bottom:20px;
  color:#13204a;
}

table{
  width:100%;
  border-collapse:collapse;
}

thead{
  background:#13204a;
  color:white;
}

th{
  padding:12px;
  font-size:13px;
  text-align:left;
}

td{
  padding:10px 12px;
  border-bottom:1px solid #e6ebf2;
  font-size:12px;
}

tbody tr:nth-child(even){
  background:#f6f8fc;
}

.qty{
  text-align:right;
  font-weight:700;
  color:#18a558;
}

</style>

</head>

<body>

<!-- TITULKA -->

<section class="cover">

  <img
    src="http://localhost:3000/logo_lc.jpg"
  />

  <h1>
    INVENTÚRNY VÝSTUP
  </h1>

  <h2>
    Sklad ${warehouse}
  </h2>

  <div class="cover-box">

    <p>
      <strong>Dátum inventúry:</strong><br>
      ${inventoryDate}
    </p>

    <p>
      <strong>Dátum exportu:</strong><br>
      ${generatedAt}
    </p>

    <p>
      <strong>Počet produktov:</strong><br>
      ${records.length}
    </p>

    <p>
      Lištobook skladový systém
    </p>

  </div>

</section>

 
<!-- CONTENT -->

<main class="content">

  <div class="table-title">
    Počiatočný stav skladu
  </div>

  <table>

    <thead>

      <tr>

        <th>#</th>

        <th>Kód</th>

        <th>Názov produktu</th>

        <th>Stav</th>

      </tr>

    </thead>

    <tbody>

      ${rows}

    </tbody>

  </table>

</main>

<div class="page-number"></div>

</body>
</html>

  `;

};