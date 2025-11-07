// ────────── Pomôcky ──────────
function getEmailFromURL(){ const p=new URLSearchParams(location.search); return p.get("email")||""; }
function $(s,r=document){ return r.querySelector(s); }
function esc(s=""){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
const scroller = document.scrollingElement || document.documentElement;
const isAdmin = new URLSearchParams(location.search).get("admin")==="1";

// fixný admin v zozname
const FIXED_ADMIN = { email:"bratislava@listovecentrum.sk", name:"Lištové centrum", online:true };

const userEmail = getEmailFromURL();
let userData = null;
if(!userEmail) location.href="index.html";

// ────────── UI helpers ──────────
function setComposerPadding(){
  const bar=$("#composerBar"), main=$(".main-content"); if(!bar||!main) return;
  main.style.paddingBottom=(bar.offsetHeight||120)+16+"px";
}
function openMessages(toName=null){
  const to = toName?`&to=${encodeURIComponent(toName)}`:"";
  const url=`messages.html?email=${encodeURIComponent(userEmail)}${to}${isAdmin?'&admin=1':''}`;
  location.href=url;
}

// toast (super light)
const toast = (msg)=> alert(msg);

// ────────── Načítanie užívateľa ──────────
async function loadUserInfo(){
  try{
    const res = await fetch(`/api/users/${encodeURIComponent(userEmail)}`);
    if(!res.ok) throw 0;
    userData = await res.json();
    const nice = (userData.name||'').trim() || "Anonym";
    const roleBadge = isAdmin ? " (admin mód)" : "";
    $("#loggedUser").textContent = `Prihlásený ako: ${nice}${roleBadge}`;
    if(isAdmin){ $("#composerBar").style.display="none"; }
  }catch{
    if(isAdmin){
      userData={ email:userEmail, name:"Admin" };
      $("#loggedUser").textContent=`Prihlásený ako: Admin (admin mód)`;
      $("#composerBar").style.display="none";
      return;
    }
    alert("Používateľ sa nenašiel. Prihlás sa znova."); location.href="index.html";
  }
}

// ────────── Composer ──────────
function initComposer(){
  const form=$("#timelineForm"); if(!form) return;
  const text=$("#postContent"), file=$("#postImage"), add=$("#postImageBtn"), btn=$("#postSubmit"), cnt=$("#composerCount");
  let selected=null; const MAX=300;
  const up=()=>{ cnt.textContent=`${text.value.length} / ${MAX}`; btn.disabled = !text.value.trim() && !selected; };
  add.addEventListener("click", ()=>file.click());
  file.addEventListener("change", ()=>{ selected=file.files?.[0]||null; up(); setComposerPadding(); });
  ["input","keyup","change"].forEach(ev=> text.addEventListener(ev, ()=>{ if(text.value.length>MAX) text.value=text.value.slice(0,MAX); up(); }));
  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const t=(text.value||"").trim(); const img=file.files?.[0]||null;
    if(!userData?.name){ alert("Na príspevok potrebuješ prezývku."); return; }
    if(!t && !img){ alert("Prázdny príspevok."); return; }
    const fd=new FormData(); fd.append("email", userEmail); fd.append("text", t); if(img) fd.append("image", img);
    btn.disabled=true;
    try{
      const r=await fetch("/api/timeline/add",{method:"POST",body:fd});
      const d=await r.json(); if(r.ok){ text.value=""; file.value=""; selected=null; up(); loadPosts({preserve:true}); } else alert(d.message||"Chyba pri ukladaní.");
    }catch{ alert("Server neodpovedá."); } finally{ btn.disabled=false; }
  });
  up();
}

// ────────── Posts ──────────
function authorAvatarURL(name){
  // server dopĺňa avatar do usera; fallback lokálny
  return `/api/users/public/by-name/${encodeURIComponent(name)}`;
}

async function loadPosts(opts={}){
  const preserve=!!opts.preserve; const feed=$("#postFeed");
  const prevY = preserve ? (scroller.scrollTop||0) : 0;

  const drafts={}; document.querySelectorAll('form.commentForm').forEach(f=>{const id=f.dataset.id; const v=(f.comment?.value||'').trim(); if(id&&v) drafts[id]=v;});

  try{
    const r=await fetch("/api/timeline"); const posts=await r.json(); feed.innerHTML="";
    posts.forEach(p=>{
      const author=esc(p.author||"Anonym"), text=esc(p.text||""); const comments=Array.isArray(p.comments)?p.comments:[];
      const canDel = isAdmin || (userData?.name && userData.name===p.author);

      const el=document.createElement("div"); el.className="post"; el.dataset.id=p._id;
      el.innerHTML=`
        <div class="post-head">
          <div class="post-author">
            <img class="avatar" src="/img/avatar_default.png" alt="" data-author="${esc(p.author||'Anonym')}">
            <strong>${author}</strong>
          </div>
          ${canDel?`<button class="link-btn post-delete" data-id="${p._id}">Zmazať</button>`:""}
        </div>
        ${text?`<p>${text}</p>`:""}
        ${p.imageUrl?`<img src="${p.imageUrl}" class="post-image" alt="Obrázok príspevku" loading="lazy">`:""}
        <div class="comments">
          <ul>
            ${(comments||[]).map(c=>{
              const cDel = (isAdmin || (userData?.name && userData.name===c.author)) && c._id;
              return `<li>
                <span class="comment-text"><strong>${esc(c.author||"Anonym")}</strong>: ${esc(c.text||"")}</span>
                <span class="comment-actions">${cDel?`<button class="link-btn comment-delete" data-post="${p._id}" data-id="${c._id}">Zmazať</button>`:""}</span>
              </li>`;
            }).join("")}
          </ul>
          ${(!isAdmin && userData?.name)?`
            <form class="commentForm" data-id="${p._id}">
              <input type="text" name="comment" placeholder="Komentár..." required maxlength="300">
              <button type="submit">Pridať</button>
            </form>`:(isAdmin?"":`<p>Len prihlásení s prezývkou môžu komentovať.</p>`)}
        </div>`;
      feed.appendChild(el);
    });

    // doplň avatary (rýchle – GET public profil len na meno)
    document.querySelectorAll('img.avatar[data-author]').forEach(async img=>{
      const nick = img.getAttribute('data-author');
      if(!nick) return;
      try{
        const res = await fetch(`/api/users/public/by-name/${encodeURIComponent(nick)}`);
        if(!res.ok) return;
        const u = await res.json();
        if(u?.avatarUrl) img.src = u.avatarUrl;
      }catch{}
    });

    // vráť scroll
    if(preserve){ requestAnimationFrame(()=>{ scroller.scrollTo({top:prevY,left:0,behavior:"auto"}); }); }
    setComposerPadding();
  }catch(e){ console.error(e); }
}

// komentár submit
document.addEventListener("submit", async (e)=>{
  const f=e.target;
  if(!f.classList?.contains("commentForm")) return;
  e.preventDefault();
  const id=f.dataset.id; const txt=(f.comment.value||"").trim(); if(!txt) return;
  try{
    const r=await fetch(`/api/timeline/comment/${id}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:userEmail,text:txt})});
    const d=await r.json(); if(r.ok) loadPosts({preserve:true}); else alert(d.message||"Chyba pri ukladaní komentára.");
  }catch{ alert("Server neodpovedá."); }
});

// mazanie post/komentár + klik na používateľa (profil)
document.addEventListener("click", async (e)=>{
  const pBtn=e.target.closest(".post-delete");
  if(pBtn){
    const id=pBtn.dataset.id; if(!confirm("Zmazať tento príspevok?")) return;
    const url = isAdmin?`/api/admin/timeline/posts/${id}`:`/api/timeline/${id}`;
    try{
      const r=await fetch(url,{method:"DELETE",headers:{"Content-Type":"application/json"},body:isAdmin?undefined:JSON.stringify({email:userEmail})});
      const d=await r.json().catch(()=>({})); if(r.ok) loadPosts({preserve:true}); else alert(d.message||"Mazanie zlyhalo.");
    }catch{ alert("Server neodpovedá."); }
    return;
  }

  const cBtn=e.target.closest(".comment-delete");
  if(cBtn){
    const postId=cBtn.dataset.post, cid=cBtn.dataset.id; if(!confirm("Zmazať tento komentár?")) return;
    const url=isAdmin?`/api/admin/timeline/posts/${postId}/comments/${cid}`:`/api/timeline/comment/${postId}/${cid}`;
    try{
      const r=await fetch(url,{method:"DELETE",headers:{"Content-Type":"application/json"},body:isAdmin?undefined:JSON.stringify({email:userEmail})});
      const d=await r.json().catch(()=>({})); if(r.ok) loadPosts({preserve:true}); else alert(d.message||"Mazanie komentára zlyhalo.");
    }catch{ alert("Server neodpovedá."); }
    return;
  }

  // klik na používateľa v pravej lište → PROFIL
  const li=e.target.closest(".presence-item");
  if(li){
    const targetNick=(li.dataset.name||"").trim();
    if(!targetNick) return;
    openProfileCard(targetNick);
  }
});

// ────────── Presence ──────────
async function startPresenceHeartbeat(){
  const ping=async()=>{ try{ await fetch('/api/presence/ping',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:userEmail})}); }catch{} };
  await ping(); setInterval(ping,30000);
}
async function refreshPresence(){
  try{
    const r=await fetch('/api/presence'); if(!r.ok) return;
    const users=await r.json(); renderPresence(users);
    // unread badge podľa mena (už máš /js/unread-badge.js pre hlavný badge)
  }catch{}
}
function renderPresence(users){
  const ul=$("#presenceList"); if(!ul) return;
  const seen=new Set(); const list=[FIXED_ADMIN, ...(Array.isArray(users)?users:[])];
  const unique=[];
  list.forEach(u=>{
    if(!u) return;
    const key=String(u.email||u.name||Math.random()).toLowerCase();
    if(seen.has(key)) return; seen.add(key); unique.push(u);
  });
  const selfNick=(userData?.name||"").trim();
  ul.innerHTML = unique.map(u=>{
    const display=(String(u.name||"").trim()) || "Anonym";
    const nameLower=display.toLocaleLowerCase('sk');
    return `<li class="presence-item" data-name="${esc(display)}" data-key="${esc(nameLower)}">
      <span class="dot ${u.online?'online':''}"></span>
      <span class="presence-name">${esc(display)}${(selfNick && display===selfNick)?' (ty)':''}</span>
      <span class="presence-badge" data-key="${esc(nameLower)}"></span>
    </li>`;
  }).join('');
}

// ────────── PROFIL – modal ──────────
function showProfileModal(){ $("#profileBackdrop").style.display="flex"; }
function hideProfileModal(){ $("#profileBackdrop").style.display="none"; }
$("#profileCloseBtn")?.addEventListener("click", hideProfileModal);
$("#profileBackdrop")?.addEventListener("click", (e)=>{ if(e.target.id==="profileBackdrop") hideProfileModal(); });

async function openProfileCard(nick){
  try{
    const res=await fetch(`/api/users/public/by-name/${encodeURIComponent(nick)}`);
    let data=null; if(res.ok) data=await res.json();
    $("#profileName").textContent = data?.name || nick;
    $("#profileCity").textContent = data?.city || "—";
    $("#profileBio").textContent  = data?.bio  || "";
    $("#profileCompany").textContent = data?.company || "";
    $("#profileBioRow").style.display = data?.bio ? "" : "none";
    $("#profileCompanyRow").style.display = data?.company ? "" : "none";
    $("#profileEmptyRow").style.display = (data && (data.city||data.bio||data.company||data.avatarUrl)) ? "none" : "";

    const avatar = data?.avatarUrl || "/img/avatar_default.png";
    $("#profileAvatar").src = avatar;

    // tlačidlá
    $("#profileMsgBtn").onclick = ()=> openMessages(nick);
    $("#profileEditBtn").style.display = (userData?.name && userData.name.toLocaleLowerCase('sk')===nick.toLocaleLowerCase('sk')) ? "" : "none";
    $("#profileEditBtn").onclick = ()=> location.href=`dashboard.html?email=${encodeURIComponent(userEmail)}`;

    showProfileModal();
  }catch{
    $("#profileName").textContent = nick;
    $("#profileCity").textContent = "—";
    $("#profileAvatar").src = "/img/avatar_default.png";
    $("#profileBioRow").style.display = "none";
    $("#profileCompanyRow").style.display = "none";
    $("#profileEmptyRow").style.display = "";
    showProfileModal();
  }
}

// ────────── Navigácia + init ──────────
document.addEventListener("DOMContentLoaded", async ()=>{
  const setHdr=()=>{ const h=$(".app-header")?.getBoundingClientRect().height||96; document.documentElement.style.setProperty('--hdr-h',h+'px'); };
  setHdr(); addEventListener('resize', setHdr);

  const email=userEmail;
  const go=(p)=>{ location.href = email? `${p}?email=${encodeURIComponent(email)}` : p; };
  $("#goBackBtn")?.addEventListener("click", ()=>go('catalog.html'));
  $("#gameBtn")?.addEventListener("click", ()=>go('entertainment.html'));
  $("#accountBtn")?.addEventListener("click", ()=>go('dashboard.html'));
  $("#logoutBtn")?.addEventListener("click", ()=>{ location.href='index.html'; });

  // mobil toggles
  const navChk=$("#navToggle"), pplChk=$("#peopleToggle"), burger=$("#burgerBtn"), ppl=$("#peopleBtn");
  const anyOpen=()=>!!(navChk?.checked||pplChk?.checked); const lock=()=>document.body.classList.toggle('no-scroll', anyOpen());
  burger?.addEventListener('click',(e)=>{ e.stopPropagation(); navChk.checked=!navChk.checked; if(navChk.checked) pplChk.checked=false; lock(); });
  ppl?.addEventListener('click',(e)=>{ e.stopPropagation(); pplChk.checked=!pplChk.checked; if(pplChk.checked) navChk.checked=false; lock(); });
  document.addEventListener('click',(e)=>{ const inH=e.target.closest('.app-header'); const inL=e.target.closest('.nav-scroller'); const inR=e.target.closest('.presence-panel'); if(!inH && !inL && !inR){ navChk.checked=false; pplChk.checked=false; lock(); }},{passive:true});

  await loadUserInfo();
  if(!isAdmin) initComposer();
  await loadPosts();

  startPresenceHeartbeat();
  refreshPresence();
  setInterval(refreshPresence, 10000);
  setComposerPadding();
});
