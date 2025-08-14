// dashboard.js – žiadny localStorage, iba ?email= v URL

function $(s, r=document){ return r.querySelector(s); }
function getEmail(){
  const p = new URLSearchParams(window.location.search);
  return p.get('email') || '';
}

document.addEventListener('DOMContentLoaded', async () => {
  const email = getEmail();
  if(!email){ window.location.href = 'index.html'; return; }

  // hlavičkové tlačidlá
  $('#goCatalogBtn')?.addEventListener('click', ()=>{
    window.location.href = `catalog.html?email=${encodeURIComponent(email)}`;
  });
  $('#goTimelineBtn')?.addEventListener('click', ()=>{
    window.location.href = `timeline.html?email=${encodeURIComponent(email)}`;
  });
  // ak máš tlačidlo Hra v headeri, môžeš:
  $('#goGameBtn')?.addEventListener('click', ()=>{
    window.location.href = `game.html?email=${encodeURIComponent(email)}`;
  });
  $('#logoutBtn')?.addEventListener('click', ()=>{
    window.location.href = 'index.html';
  });

  // načítaj používateľa
  try{
    const res = await fetch(`/api/users/${encodeURIComponent(email)}`);
    if(!res.ok) throw new Error('User not found');
    const u = await res.json();

    // label v hlavičke
    const label = $('#userLabel');
    label.textContent = `Prihlásený: ${u?.name?.trim?.() ? u.name : (u?.email || email)}`;

    // predvyplň formulár
    $('#name').value = u?.name || '';
    $('#note').value = u?.note || '';
  }catch(e){
    const label = $('#userLabel');
    label.textContent = `Prihlásený: ${email}`;
  }

  // uloženie mena + mesta
  $('#userForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const name = ($('#name').value || '').trim();
    const note = ($('#note').value || '').trim();

    try{
      const res = await fetch(`/api/users/${encodeURIComponent(email)}`, {
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name, note })
      });
      const data = await res.json().catch(()=>({}));

      if(!res.ok){
        alert(data?.message || 'Chyba pri ukladaní údajov.');
        return;
      }

      $('#userLabel').textContent = `Prihlásený: ${name || email}`;
      alert('Údaje boli uložené.');
    }catch(err){
      console.error(err);
      alert('Chyba pri komunikácii so serverom.');
    }
  });

  // zmena hesla (voliteľne; endpoint z nášho backendu)
  $('#passwordForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const oldPassword = $('#oldPassword').value;
    const newPassword = $('#newPassword').value;
    const confirm     = $('#confirmPassword').value;
    const msg = $('#passwordMessage');

    if(!oldPassword || !newPassword || !confirm){
      msg.textContent = 'Vyplňte všetky polia.'; msg.style.color='red'; return;
    }
    if(newPassword !== confirm){
      msg.textContent = 'Nové heslá sa nezhodujú.'; msg.style.color='red'; return;
    }

    try{
      const res = await fetch(`/api/users/${encodeURIComponent(email)}/password`, {
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json().catch(()=>({}));
      if(!res.ok){
        msg.textContent = data?.message || 'Chyba pri zmene hesla.'; msg.style.color='red'; return;
      }
      msg.textContent = 'Heslo bolo úspešne zmenené.'; msg.style.color='green';
      $('#oldPassword').value = $('#newPassword').value = $('#confirmPassword').value = '';
    }catch(err){
      console.error(err);
      msg.textContent = 'Chyba pri komunikácii so serverom.'; msg.style.color='red';
    }
  });
});
