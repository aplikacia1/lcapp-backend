// public/admin_reset_password.js
(function () {
  const API_BASE = (window.API_BASE || "").replace(/\/+$/, "");

  function getToken() {
    const p = new URLSearchParams(location.search);
    return p.get("token") || "";
  }

  const token = getToken();
  const formWrap = document.getElementById("formWrap");
  const tokenProblem = document.getElementById("tokenProblem");
  const statusEl = document.getElementById("status");
  const pwd1 = document.getElementById("pwd1");
  const pwd2 = document.getElementById("pwd2");
  const btn = document.getElementById("setPwdBtn");

  if (!token) {
    if (formWrap) formWrap.style.display = "none";
    if (tokenProblem) tokenProblem.style.display = "block";
    return;
  }

  function setStatus(msg, ok) {
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    statusEl.style.color = ok ? "#a4ffba" : "#ff9a9a";
  }

  async function submitNewPassword() {
    const p1 = (pwd1 && pwd1.value) || "";
    const p2 = (pwd2 && pwd2.value) || "";

    setStatus("", true);

    if (!p1 || !p2) {
      setStatus("Vyplňte obe polia.", false);
      return;
    }
    if (p1 !== p2) {
      setStatus("Heslá sa nezhodujú.", false);
      return;
    }
    if (p1.length < 8) {
      setStatus("Heslo musí mať aspoň 8 znakov.", false);
      return;
    }

    try {
      btn.disabled = true;

      const res = await fetch(`${API_BASE}/api/admin/password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: p1 })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setStatus(data.message || "Odkaz je neplatný alebo exspirovaný.", false);
        return;
      }

      setStatus("Heslo bolo úspešne zmenené. Teraz sa môžete prihlásiť.", true);
      setTimeout(() => {
        window.location.href = "admin_login.html";
      }, 2500);
    } catch (err) {
      console.error("Admin reset error:", err);
      setStatus("Chyba servera pri zmene hesla.", false);
    } finally {
      btn.disabled = false;
    }
  }

  if (btn) btn.addEventListener("click", submitNewPassword);
})();
