document.getElementById("adminLoginBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  console.log("👉 Pokus o prihlásenie ako admin:", email); // DEBUG

  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    console.log("📦 Odpoveď servera:", data); // DEBUG

    if (response.ok) {
      alert("✅ Prihlásenie úspešné!");
      // ⏩ Presmerovanie na admin dashboard
      window.location.href = "admin_dashboard.html";
    } else {
      document.getElementById("errorMessage").textContent = data.message || "Prihlásenie zlyhalo.";
    }
  } catch (error) {
    console.error("❗ Chyba pri prihlásení:", error);
    document.getElementById("errorMessage").textContent = "Chyba servera.";
  }
});
