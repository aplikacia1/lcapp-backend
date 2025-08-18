<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Produkty</title>
  <link rel="stylesheet" href="style.css" />
  <style>
    :root{
      --gap:16px; --max-w:1120px; --card-w:280px;
      --bg:#061c47; --panel:#0c1f4b; --border:#ffffff22;
      --pill:#eef6ff; --pill-b:#bcd6ff;
    }
    html,body{margin:0;background:var(--bg);color:#fff;font-family:Arial, sans-serif;}
    /* Header */
    .header{position:sticky;top:0;z-index:10;background:#0c1f4b;border-bottom:1px solid rgba(255,255,255,.12)}
    .header-in{max-width:var(--max-w);margin:0 auto;height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 var(--gap)}
    .logo{height:34px}
    .nav{display:flex;gap:10px}
    .btn{height:36px;padding:0 12px;border-radius:10px;border:1px solid #ffffff55;background:#fff;color:#0c1f4b;cursor:pointer}
    .btn--danger{background:#ff6b6b;color:#fff;border:none}
    /* Page */
    .wrap{max-width:var(--max-w);margin:18px auto;padding:0 var(--gap) 90px}
    .title{font-size:24px;font-weight:800;margin:10px 0}
    .search{
      height:40px;border-radius:12px;border:1px solid var(--pill-b);
      background:var(--pill);color:#0c1f4b;padding:0 12px;width:320px
    }
    .grid{
      display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--card-w),1fr));
      gap:16px;margin-top:18px
    }
    .card{background:#05163d;border:1px solid var(--border);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 2px 10px rgba(0,0,0,.08)}
    .card-img{width:100%;height:180px;object-fit:contain;background:#091a3a}
    .card-body{padding:12px}
    .card-title{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .price{margin-top:6px;opacity:.9}
    .rating{margin-top:4px;opacity:.7;font-size:12px}
    .empty{margin:24px 0;padding:16px;border-radius:12px;background:#0c1f4b;border:1px solid var(--border)}
  </style>
</head>
<body>
  <!-- HLAVIČKA -->
  <header class="header">
    <div class="header-in">
      <img class="logo" src="logo_lc.jpg" alt="Logo" />
      <div class="nav">
        <button class="btn" onclick="history.back()">Späť do katalógu</button>
        <a class="btn" href="listobook.html">Listobook</a>
        <button class="btn btn--danger" onclick="location.href='index.html'">Odhlásiť sa</button>
      </div>
    </div>
  </header>

  <!-- OBSAH -->
  <main class="wrap">
    <h1 id="catTitle" class="title">Produkty</h1>

    <input id="searchInput" class="search" type="search" placeholder="Hľadať podľa názvu alebo kódu…">

    <div id="emptyState" class="empty" style="display:none">Nenašli sa žiadne produkty.</div>

    <div id="productGrid" class="grid"></div>
  </main>

  <!-- Skripty: najprv config, potom logika -->
  <script src="/js/config.js"></script>
  <script src="products.js"></script>
</body>
</html>
