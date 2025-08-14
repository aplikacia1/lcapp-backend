(function(){
  const $ = (s,r=document)=> r.querySelector(s);
  const id = new URLSearchParams(location.search).get('id');

  async function init(){
    if(!id){ $('#bTitle').textContent = 'Banner nenájdený'; return; }
    try{
      const res = await fetch(`/api/banners/${id}`);
      if(!res.ok) throw new Error();
      const b = await res.json();
      $('#bTitle').textContent = b.title || 'Banner';
      $('#bImg').src = `/uploads/${b.image}`;
      $('#bImg').alt = b.title || 'Banner';
      $('#bDesc').textContent = b.description || '';
    }catch{
      $('#bTitle').textContent = 'Banner nenájdený';
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
