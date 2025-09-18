// --- helpers (URL/email, nav) ---
const params = new URLSearchParams(location.search);
const email = params.get('email') || '';

const backBtn = document.getElementById('backBtn');
const logoutBtn = document.getElementById('logoutBtn');

// ⬇️ ZMENA: späť ide na entertainment.html (Centrum zábavy)
backBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopImmediatePropagation?.();
  const url = email ? `entertainment.html?email=${encodeURIComponent(email)}` : 'entertainment.html';
  location.href = url;
});

logoutBtn?.addEventListener('click', () => (location.href = 'index.html'));

// --- state ---
const boardEl = document.getElementById('board');
const movesEl = document.getElementById('moves');
const timeEl  = document.getElementById('time');
const shuffleBtn = document.getElementById('shuffleBtn');

const winModal = document.getElementById('winModal');
const playAgainBtn = document.getElementById('playAgainBtn');
const goRateBtn = document.getElementById('goRateBtn');

let tiles = [];     // array of 9 numbers: 1..8 and 0 as empty
let moves = 0;
let seconds = 0;
let timer = null;
let started = false;

// --- board utils ---
const idxToRC = (i) => ({ r: Math.floor(i / 3), c: i % 3 });
const rcToIdx = (r, c) => r * 3 + c;
const inBounds = (r, c) => r >= 0 && r < 3 && c >= 0 && c < 3;

function neighborsOfEmpty() {
  const ei = tiles.indexOf(0);
  const { r, c } = idxToRC(ei);
  const neigh = [];
  [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr, dc]) => {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc)) neigh.push(rcToIdx(nr, nc));
  });
  return neigh;
}

function canMove(tileIndex) {
  return neighborsOfEmpty().includes(tileIndex);
}

function swapWithEmpty(tileIndex) {
  const ei = tiles.indexOf(0);
  [tiles[ei], tiles[tileIndex]] = [tiles[tileIndex], tiles[ei]];
}

function isSolved() {
  for (let i = 0; i < 8; i++) if (tiles[i] !== i + 1) return false;
  return tiles[8] === 0;
}

// --- rendering ---
function render() {
  // clear and recreate tiles with fresh handlers
  boardEl.innerHTML = '';
  tiles.forEach((val, i) => {
    const div = document.createElement('div');
    div.className = 'tile' + (val === 0 ? ' tile--empty' : '');
    div.dataset.index = String(i);
    if (val !== 0) div.textContent = String(val);

    // click + touch
    const handle = () => onTileTap(i);
    div.addEventListener('click', handle);
    div.addEventListener('touchstart', (e) => { e.preventDefault(); handle(); }, { passive:false });

    boardEl.appendChild(div);
  });
}

function onTileTap(index) {
  if (tiles[index] === 0) return;
  if (!canMove(index)) return;

  swapWithEmpty(index);
  moves++;
  movesEl.textContent = String(moves);

  if (!started) startTimer();
  render();

  if (isSolved()) {
    stopTimer();
    setTimeout(() => showWin(), 120);
  }
}

// --- timer ---
function startTimer() {
  started = true;
  stopTimer();
  timer = setInterval(() => {
    seconds++;
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    timeEl.textContent = `${m}:${s}`;
  }, 1000);
}
function stopTimer() { if (timer) clearInterval(timer); timer = null; }

// --- shuffle (always legal moves) ---
function shuffle(times = 100) {
  // start from solved state then do random legal moves
  tiles = [1,2,3,4,5,6,7,8,0];
  for (let i = 0; i < times; i++) {
    const neigh = neighborsOfEmpty();
    const pick = neigh[Math.floor(Math.random() * neigh.length)];
    swapWithEmpty(pick);
  }
  // reset counters
  moves = 0; movesEl.textContent = '0';
  seconds = 0; timeEl.textContent = '00:00';
  started = false; stopTimer();
  render();
}

// --- win modal ---
function showWin() { winModal.style.display = 'flex'; }
function hideWin() { winModal.style.display = 'none'; }

playAgainBtn?.addEventListener('click', () => { hideWin(); shuffle(120); });
goRateBtn?.addEventListener('click', () => {
  const url = email ? `catalog.html?email=${encodeURIComponent(email)}` : 'catalog.html';
  location.href = url;
});

// --- keyboard controls ---
document.addEventListener('keydown', (e) => {
  const ei = tiles.indexOf(0);
  const { r, c } = idxToRC(ei);
  let target = null;
  if (e.key === 'ArrowUp'   && inBounds(r+1, c)) target = rcToIdx(r+1,c);    // move tile down into empty
  if (e.key === 'ArrowDown' && inBounds(r-1, c)) target = rcToIdx(r-1,c);
  if (e.key === 'ArrowLeft' && inBounds(r, c+1)) target = rcToIdx(r, c+1);
  if (e.key === 'ArrowRight'&& inBounds(r, c-1)) target = rcToIdx(r, c-1);
  if (target != null) onTileTap(target);
});

// --- init ---
shuffleBtn?.addEventListener('click', () => shuffle(120));
shuffle(60); // initial shuffle
