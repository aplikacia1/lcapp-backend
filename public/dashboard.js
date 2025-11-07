// dashboard.js – konečná verzia (perzistentný profil + avatar)

function $(s, r=document){ return r.querySelector(s); }
function getEmail(){ const p = new URLSearchParams(window.location.search); return p.get('email') || ''; }
const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
       <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
         <stop stop-color="#0b1b3e"/><stop offset="1" stop-color="#1d3b86"/></linearGradient></defs>
       <rect width="100%" height="100%" fill="url(#g)"/>
       <circle cx="64" cy="48" r="22" fill="#cfe2ff"/>
       <rect x="28" y="78" width="72" height="34" rx="12" fill="#cfe2ff"/>
     </svg>`
  );

document.addEventListener('DOMContentLoaded', async () => {
  const email = getEmail();
  if(!email){ window.location.href = 'index.html'; return; }

  // jediné tlačidlo: späť na Lištobook (timeline)
  $('#goTimelineBtn')?.addEventListener('click', () => {
    window.location.href = `timeline.html?email=${encodeURIComponent(email)}`;
  });

  const avatarImg  = $('#avatarPreview');
  const avatarFile = $('#avatarFile');
  if (avatarImg) avatarImg.src = DEFAULT_AVATAR;

  // pomocné
  const v = (sel) => (($(sel)?.value || '').trim());
  const set = (sel, val) => { const el=$(sel); if(el) el.value = val || ''; };

  // ========== 1) Načítanie profilu ==========
  try{
    const res = await fetch(`/api/users/${encodeURIComponent(email)}`);
    if(!res.ok) throw new Error('User not found');
    const u = await res.json();

    // štítok v hlavičke
    $('#userLabel').textContent = `Prihlásený: ${u?.name?.trim?.() ? u.name : (u?.email || email)}`;

    // vyplniť polia
    set('#name',        u?.name);
    set('#fullName',    u?.fullName);
    set('#bio',         u?.bio);
    set('#note',        u?.note);
    set('#companyName', u?.companyName);
    set('#companyICO',  u?.companyICO);
    set('#companyDIC',  u?.companyDIC);
    set('#companyICDPH',u?.companyICDPH);
    set('#web',         u?.web);
    set('#instagram',   u?.instagram);
    if ($('#newsletterOptIn')) $('#newsletterOptIn').checked = !!u?.newsletter;
    if (u?.avatarUrl) { avatarImg.src = u.avatarUrl; }

  }catch(e){
    $('#userLabel').textContent = `Prihlásený: ${email}`;
  }

  // ========== 2) Upload avatara (+ okamžité uloženie avatarUrl) ==========
  avatarFile?.addEventListener('change', async (ev)=>{
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;

    try{
      const fd = new FormData();
      fd.append('image', f); // backend očakáva "image"
      const up = await fetch('/api/uploads', { method:'POST', body: fd });
      const data = await up.json().catch(()=>null);

      if (!up.ok || !data?.ok || !data?.file?.url) {
        alert(data?.message || 'Nepodarilo sa nahrať fotku.');
        return;
      }

      const url = data.file.url;        // napr. /uploads/12345_avatar.jpg
      avatarImg.src = url;

      // hneď zapíšeme do profilu
      const res = await fetch(`/api/users/${encodeURIComponent(email)}`, {
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ avatarUrl: url })
      });
      if(!res.ok){
        const d = await res.json().catch(()=>({}));
        console.warn('AvatarUrl save failed:', d);
      }
    }catch(err){
      console.error(err);
      alert('Chyba pri nahrávaní fotky.');
    } finally {
      ev.target.value = '';
    }
  });

  // ========== 3) Uloženie profilu ==========
  $('#userForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault();

    const payload = {
      name:        v('#name'),
      note:        v('#note'),
      newsletter:  !!$('#newsletterOptIn')?.checked,
      fullName:    v('#fullName'),
      bio:         v('#bio'),
      companyName: v('#companyName'),
      companyICO:  v('#companyICO'),
      companyDIC:  v('#companyDIC'),
      companyICDPH:v('#companyICDPH'),
      web:         v('#web'),
      instagram:   v('#instagram'),
      // avatarUrl sa už ukladá pri uploade
    };

    try{
      const res = await fetch(`/api/users/${encodeURIComponent(email)}`, {
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(()=>({}));

      if(!res.ok){
        alert(data?.message || 'Chyba pri ukladaní údajov.');
        return;
      }

      $('#userLabel').textContent = `Prihlásený: ${payload.name || email}`;
      alert('Profil bol uložený.');
    }catch(err){
      console.error(err);
      alert('Chyba pri komunikácii so serverom.');
    }
  });

  // ========== 4) Zmena hesla ==========
  $('#passwordForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const oldPassword = v('#oldPassword');
    const newPassword = v('#newPassword');
    const confirm     = v('#confirmPassword');
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
