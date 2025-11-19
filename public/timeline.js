// ────────── Pomôcky ──────────
function getEmailFromURL(){
  const p=new URLSearchParams(location.search);
  return p.get("email")||"";
}
function $(s,r=document){ return r.querySelector(s); }
function esc(s=""){
  return String(s).replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'
  }[m]));
}
const scroller = document.scrollingElement || document.documentElement;
const isAdmin = new URLSearchParams(location.search).get("admin")==="1";

// fixný admin v zozname
const FIXED_ADMIN = { email:"bratislava@listovecentrum.sk", name:"Lištové centrum", online:true };

const userEmail = getEmailFromURL();
let userData = null;
if(!userEmail) location.href="index.html";

// ────────── UI helpers ──────────
function setComposerPadding(){
  const bar=$("#composerBar"), main=$(".main-content");
  if(!bar||!main) return;
  main.style.paddingBottom=(bar.offsetHeight||120)+16+"px";
}
function openMessages(toName=null){
  const to = toName?`&to=${encodeURIComponent(toName)}`:"";
  const url=`messages.html?email=${encodeURIComponent(userEmail)}${to}${isAdmin?'&admin=1':''}`;
  location.href=url;
}

// toast (super light – v praxi môžeš nahradiť window.toast)
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
    if(isAdmin){
      $("#composerBar").style.display="none";
    }
  }catch{
    if(isAdmin){
      userData={ email:userEmail, name:"Admin" };
      $("#loggedUser").textContent=`Prihlásený ako: Admin (admin mód)`;
      $("#composerBar").style.display="none";
      return;
    }
    alert("Používateľ sa nenašiel. Prihlás sa znova.");
    location.href="index.html";
  }
}

// ────────── Composer ──────────
function initComposer(){
  const form=$("#timelineForm");
  if(!form) return;

  const text=$("#postContent"),
        file=$("#postImage"),
        add=$("#postImageBtn"),
        btn=$("#postSubmit"),
        cnt=$("#composerCount");

  let selected=null;
  const MAX=300;

  const up=()=>{
    cnt.textContent=`${text.value.length} / ${MAX}`;
    btn.disabled = !text.value.trim() && !selected;
  };

  add.addEventListener("click", ()=>file.click());

  file.addEventListener("change", ()=>{
    selected=file.files?.[0]||null;
    up();
    setComposerPadding();
  });

  ["input","keyup","change"].forEach(ev=>
    text.addEventListener(ev, ()=>{
      if(text.value.length>MAX) text.value=text.value.slice(0,MAX);
      up();
    })
  );

  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const t=(text.value||"").trim();
    const img=file.files?.[0]||null;

    if(!userData?.name){
      alert("Na príspevok potrebuješ prezývku.");
      return;
    }
    if(!t && !img){
      alert("Prázdny príspevok.");
      return;
    }

    const fd=new FormData();
    fd.append("email", userEmail);
    fd.append("text", t);
    if(img) fd.append("image", img);

    btn.disabled=true;
    try{
      const r=await fetch("/api/timeline/add",{method:"POST",body:fd});
      const d=await r.json();
      if(r.ok){
        text.value="";
        file.value="";
        selected=null;
        up();
        loadPosts({preserve:true});
      }else{
        alert(d.message||"Chyba pri ukladaní.");
      }
    }catch{
      alert("Server neodpovedá.");
    }finally{
      btn.disabled=false;
    }
  });

  up();
}

// ────────── Posts ──────────
function authorAvatarURL(name){
  // (poznámka: avatar sa načítava cez /api/users/public/by-name priamo nižšie)
  return `/api/users/public/by-name/${encodeURIComponent(name)}`;
}

async function loadPosts(opts={}){
  const preserve=!!opts.preserve;
  const feed=$("#postFeed");
  const prevY = preserve ? (scroller.scrollTop||0) : 0;

  try{
    const r=await fetch("/api/timeline");
    const posts=await r.json();
    feed.innerHTML="";

    posts.forEach(p=>{
      const author=esc(p.author||"Anonym");
      const text=esc(p.text||"");
      const comments=Array.isArray(p.comments)?p.comments:[];
      const canDel = isAdmin || (userData?.name && userData.name===p.author);

      const el=document.createElement("div");
      el.className="post";
      el.dataset.id=p._id;
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

    // doplň avatary (GET public profil podľa mena)
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
    if(preserve){
      requestAnimationFrame(()=>{
        scroller.scrollTo({top:prevY,left:0,behavior:"auto"});
      });
    }
    setComposerPadding();
  }catch(e){
    console.error(e);
  }
}

// komentár submit
document.addEventListener("submit", async (e)=>{
  const f=e.target;
  if(!f.classList?.contains("commentForm")) return;
  e.preventDefault();
  const id=f.dataset.id;
  const txt=(f.comment.value||"").trim();
  if(!txt) return;
  try{
    const r=await fetch(`/api/timeline/comment/${id}`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email:userEmail,text:txt})
    });
    const d=await r.json();
    if(r.ok){
      loadPosts({preserve:true});
    }else{
      alert(d.message||"Chyba pri ukladaní komentára.");
    }
  }catch{
    alert("Server neodpovedá.");
  }
});

// mazanie post/komentár + klik na používateľa (profil)
document.addEventListener("click", async (e)=>{
  const pBtn=e.target.closest(".post-delete");
  if(pBtn){
    const id=pBtn.dataset.id;
    if(!confirm("Zmazať tento príspevok?")) return;
    const url = isAdmin?`/api/admin/timeline/posts/${id}`:`/api/timeline/${id}`;
    try{
      const r=await fetch(url,{
        method:"DELETE",
        headers:{"Content-Type":"application/json"},
        body:isAdmin?undefined:JSON.stringify({email:userEmail})
      });
      const d=await r.json().catch(()=>({}));
      if(r.ok){
        loadPosts({preserve:true});
      }else{
        alert(d.message||"Mazanie zlyhalo.");
      }
    }catch{
      alert("Server neodpovedá.");
    }
    return;
  }

  const cBtn=e.target.closest(".comment-delete");
  if(cBtn){
    const postId=cBtn.dataset.post, cid=cBtn.dataset.id;
    if(!confirm("Zmazať tento komentár?")) return;
    const url=isAdmin
      ? `/api/admin/timeline/posts/${postId}/comments/${cid}`
      : `/api/timeline/comment/${postId}/${cid}`;
    try{
      const r=await fetch(url,{
        method:"DELETE",
        headers:{"Content-Type":"application/json"},
        body:isAdmin?undefined:JSON.stringify({email:userEmail})
      });
      const d=await r.json().catch(()=>({}));
      if(r.ok){
        loadPosts({preserve:true});
      }else{
        alert(d.message||"Mazanie komentára zlyhalo.");
      }
    }catch{
      alert("Server neodpovedá.");
    }
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
  const ping=async()=>{
    try{
      await fetch('/api/presence/ping',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:userEmail})
      });
    }catch{}
  };
  await ping();
  setInterval(ping,30000);
}
async function refreshPresence(){
  try{
    const r=await fetch('/api/presence');
    if(!r.ok) return;
    const users=await r.json();
    renderPresence(users);
  }catch{}
}
function renderPresence(users){
  const ul=$("#presenceList");
  if(!ul) return;
  const seen=new Set();
  const list=[FIXED_ADMIN, ...(Array.isArray(users)?users:[])];
  const unique=[];
  list.forEach(u=>{
    if(!u) return;
    const key=String(u.email||u.name||Math.random()).toLowerCase();
    if(seen.has(key)) return;
    seen.add(key);
    unique.push(u);
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
function showProfileModal(){
  const b = $("#profileBackdrop");
  if(b) b.style.display="flex";
}
function hideProfileModal(){
  const b = $("#profileBackdrop");
  if(b) b.style.display="none";
}
$("#profileCloseBtn")?.addEventListener("click", hideProfileModal);
$("#profileBackdrop")?.addEventListener("click", (e)=>{
  if(e.target.id==="profileBackdrop") hideProfileModal();
});

async function openProfileCard(nick){
  try{
    const res=await fetch(`/api/users/public/by-name/${encodeURIComponent(nick)}`);
    let data=null;
    if(res.ok) data=await res.json();

    $("#profileName").textContent = data?.name || nick;
    $("#profileCity").textContent = data?.city || "—";

    const note = data?.note || data?.bio || "";
    const company = data?.company || "";
    const websiteRaw = data?.website || data?.web || "";

    $("#profileCompany").textContent = company;
    $("#profileBio").textContent  = note;

    // Web – urobíme z neho klikateľný odkaz, ak existuje
    const websiteEl = $("#profileWebsite");
    if (websiteRaw) {
      let url = websiteRaw.trim();
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;
      websiteEl.innerHTML = `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(websiteRaw)}</a>`;
    } else {
      websiteEl.textContent = "";
    }

    $("#profileCompanyRow").style.display = company ? "" : "none";
    $("#profileWebsiteRow").style.display = websiteRaw ? "" : "none";
    $("#profileBioRow").style.display      = note ? "" : "none";

    $("#profileEmptyRow").style.display =
      (data && (data.city||note||company||websiteRaw||data.avatarUrl))
      ? "none" : "";

    const avatar = data?.avatarUrl || "/img/avatar_default.png";
    $("#profileAvatar").src = avatar;

    // tlačidlá
    $("#profileMsgBtn").onclick = ()=> openMessages(nick);
    $("#profileEditBtn").style.display =
      (userData?.name && userData.name.toLocaleLowerCase('sk')===nick.toLocaleLowerCase('sk'))
      ? "" : "none";
    $("#profileEditBtn").onclick = ()=> location.href=`dashboard.html?email=${encodeURIComponent(userEmail)}`;

    showProfileModal();
  }catch{
    $("#profileName").textContent = nick;
    $("#profileCity").textContent = "—";
    $("#profileAvatar").src = "/img/avatar_default.png";
    $("#profileCompanyRow").style.display = "none";
    $("#profileWebsiteRow").style.display = "none";
    $("#profileBioRow").style.display = "none";
    $("#profileEmptyRow").style.display = "";
    showProfileModal();
  }
}

// ────────── Init ──────────
document.addEventListener("DOMContentLoaded", async ()=>{
  await loadUserInfo();
  if(!isAdmin) initComposer();
  await loadPosts();

  startPresenceHeartbeat();
  refreshPresence();
  setInterval(refreshPresence, 10000);
  setComposerPadding();
});
