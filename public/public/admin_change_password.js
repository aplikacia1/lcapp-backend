document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const currentPassword = document.getElementById('currentPassword').value.trim();
  const newPassword = document.getElementById('newPassword').value.trim();
  const confirmPassword = document.getElementById('confirmPassword').value.trim();
  const messageDiv = document.getElementById('message');

  if (newPassword !== confirmPassword) {
    messageDiv.textContent = '❌ Nové heslá sa nezhodujú.';
    messageDiv.style.color = 'red';
    return;
  }

  try {
    const response = await fetch('/api/admin/password', {
      method: 'PUT', // OPRAVA: PUT miesto POST
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await response.json();

    if (response.ok) {
      messageDiv.textContent = '✅ Heslo bolo úspešne zmenené.';
      messageDiv.style.color = 'green';
    } else {
      messageDiv.textContent = `❌ ${data.message || 'Chyba pri zmene hesla.'}`;
      messageDiv.style.color = 'red';
    }
  } catch (err) {
    messageDiv.textContent = '❌ Chyba spojenia so serverom.';
    messageDiv.style.color = 'red';
  }
});
