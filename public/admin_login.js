// public/admin_login.js
(function () {
  const API_BASE = (window.API_BASE || "").replace(/\/+$/, "");

  const emailInput = document.getElementById("email");
  const passInput  = document.getElementById("password");
  const loginBtn   = document.getElementById("adminLoginBtn");
  const forgotBtn  = document.getElementById("adminForgotBtn");
  const errEl      = document.getElementById("errorMessage");
  const infoEl     = document.getElementById("infoMessage");

  function setError(msg)  { if (errEl)  errEl.textContent  = msg || ""; }
  function setInfo(msg)   { if (infoEl) infoEl.textContent = msg || ""; }

  async function adminLogin() {
    const email = emailInput.value.trim();
    const password = passInput.value;

    setError("");
    setInfo("");

    if (!email || !password) {
      setError("Zadajte email aj heslo.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Prihlásenie zlyhalo.");
        return;
      }

      alert("✅ Prihlásenie úspešné!");
      window.location.href = "admin_dashboard.html";
    } catch (err) {
      console.error("❗ Chyba pri prihlásení:", err);
      setError("Chyba servera.");
    }
  }

  async function adminForgot() {
    const email = emailInput.value.trim() || "bratislava@listovecentrum.sk";

    setError("");
    setInfo("");

    if (!confirm("Poslať odkaz na obnovenie admin hesla na " + email + " ?")) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/password/forgot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      await res.json().catch(() => ({}));
      // vždy zobrazíme rovnakú správu
      setInfo("Ak admin účet existuje, poslali sme odkaz na obnovenie hesla.");
    } catch (err) {
      console.error("❗ Chyba pri odosielaní resetu:", err);
      setError("Chyba servera pri odosielaní resetu.");
    }
  }

  if (loginBtn)  loginBtn.addEventListener("click", adminLogin);
  if (passInput) passInput.addEventListener("keydown", e => {
    if (e.key === "Enter") adminLogin();
  });
  if (forgotBtn) forgotBtn.addEventListener("click", adminForgot);
})();
