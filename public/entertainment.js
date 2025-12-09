// public/entertainment.js
const $ = (s, r = document) => r.querySelector(s);
const params = new URLSearchParams(location.search);
const userEmail = params.get('email') || '';

/** YouTube Channel ID – môžeš nastaviť v /js/config.js ako window.__YT_CHANNEL_ID__ */
const YT_CHANNEL_ID = (window.__YT_CHANNEL_ID__ || 'UCRsTMCPkTHHTLTYBeLbMUtw').trim(); // váš kanál
function uploadsPlaylistId(channelId) {
  if (!/^UC[0-9A-Za-z_-]{20,}$/.test(channelId)) return '';
  return 'UU' + channelId.slice(2);
}
function playlistEmbedUrl(uploadsId) {
  const qp = new URLSearchParams({
    listType: 'playlist',
    list: uploadsId,
    rel: '0',
    modestbranding: '1',
  });
  return `https://www.youtube-nocookie.com/embed/?${qp.toString()}`;
}

/* prepína medzi dlaždicami a prehrávačom */
function showView(which) {
  const tiles = $('#tilesView');
  const yt = $('#youtubeView');
  if (which === 'yt') {
    tiles.hidden = true;
    yt.hidden = false;
  } else {
    yt.hidden = true;
    tiles.hidden = false;
  }
}

/* init */
document.addEventListener('DOMContentLoaded', () => {
  // user chip
  const chip = $('#userChip');
  if (chip) chip.textContent = `Prihlásený: ${userEmail || '—'}`;

  // späť v hlavičke → timeline (zachovaj email)
  $('#backBtn')?.addEventListener('click', () => {
    const url = userEmail
      ? `timeline.html?email=${encodeURIComponent(userEmail)}`
      : 'timeline.html';
    location.href = url;
  });

  // dlaždica HRA → prejsť do game.html (+ from=entertainment kvôli návratu naspäť)
  const goGame = () => {
    const url = userEmail
      ? `game.html?email=${encodeURIComponent(userEmail)}&from=entertainment`
      : `game.html?from=entertainment`;
    location.href = url;
  };
  $('#tileGame')?.addEventListener('click', goGame);
  $('#tileGame')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goGame();
    }
  });

  // dlaždica YT → prepnúť na prehrávač a nastaviť embed len pre náš kanál
  const openYT = () => {
    const uploads = uploadsPlaylistId(YT_CHANNEL_ID);
    const src = uploads ? playlistEmbedUrl(uploads) : '';
    $('#ytPlayer').src = src;
    showView('yt');
  };
  $('#tileYoutube')?.addEventListener('click', openYT);
  $('#tileYoutube')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openYT();
    }
  });

  // späť z prehrávača na dlaždice
  $('#backToTiles')?.addEventListener('click', () => showView('tiles'));

  // štart: zobraz dve dlaždice
  showView('tiles');
});
