document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("adminLogoutBtn");
  const timelineBtn = document.getElementById("adminTimelineBtn");

  // Odhlásenie admina
  logoutBtn.addEventListener("click", () => {
    fetch("http://localhost:5000/api/admin/logout", {
      method: "POST",
      credentials: "include",
    })
      .then(() => {
        window.location.href = "admin_login.html";
      })
      .catch((error) => {
        console.error("Chyba pri odhlasovaní admina:", error);
      });
  });

  // Spusti Lištobook v admin móde
  timelineBtn.addEventListener("click", () => {
    // necháme admina zadať email, pod ktorým sa timeline otvorí
    // (nemusí byť v users – admin mód to zvládne)
    const email = prompt("Zadajte e-mail, pod ktorým chcete otvoriť Lištobook (stačí ľubovoľný):", "");
    if (!email) return;
    const url = `timeline.html?email=${encodeURIComponent(email)}&admin=1`;
    window.location.href = url;
  });
});
