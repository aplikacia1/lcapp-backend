// backend/public/js/push.js
(function(){
  // musí byť na stránke s ?email=
  const params = new URLSearchParams(location.search);
  const email = params.get('email') || '';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !email) return;

  // pomocník: base64 public key -> Uint8Array
  function urlB64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const out = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) out[i] = rawData.charCodeAt(i);
    return out;
  }

  async function ensureRegistered(){
    // 1) SW
    const reg = await navigator.serviceWorker.register('/sw.js');

    // 2) povolenie
    let perm = Notification.permission;
    if (perm === 'default') perm = await Notification.requestPermission();
    if (perm !== 'granted') return;

    // 3) public key
    const keyRes = await fetch('/api/push/public-key');
    if (!keyRes.ok) return;
    const { publicKey } = await keyRes.json();
    if (!publicKey) return;

    // 4) subscribe
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(publicKey)
    });

    // 5) odošli na server
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, subscription: sub })
    });
  }

  // spusti potichu (netreba blokovať stránku)
  ensureRegistered().catch(()=>{});
})();
