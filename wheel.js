// Prize wheel: 15 equal-looking slices, weighted draw.
// The odds are listed on the poster at the stand.

// Probability per prize (sums to 1)
const ODDS = {
  'Kaffemaskin': 0.000001,
  'JBL lydplanke': 0.000001,
  'Liten JBL': 0.01,
  'Paraply': 0.01,
};
const COMMON = ['Red Bull', 'Klesrulle', 'Tannbørste', 'Ski- og stavholder'];
const rest = (1 - Object.values(ODDS).reduce((a, b) => a + b, 0)) / COMMON.length;
COMMON.forEach(p => { ODDS[p] = rest; });

// Order of the 15 slices, clockwise from the top
const SLICES = [
  'Kaffemaskin', 'Red Bull', 'Klesrulle', 'Paraply', 'Tannbørste',
  'Ski- og stavholder', 'Red Bull', 'JBL lydplanke', 'Klesrulle', 'Tannbørste',
  'Ski- og stavholder', 'Liten JBL', 'Red Bull', 'Klesrulle', 'Tannbørste',
];
// Big prizes in green, the rest alternating black and white
const GREEN = ['Kaffemaskin', 'JBL lydplanke', 'Liten JBL'];
const COLORS = (() => {
  let k = 0;
  return SLICES.map(name => GREEN.includes(name) ? ['#1E8E4E', '#FFFFFF'] : (k++ % 2 ? ['#FFFFFF', '#111111'] : ['#111111', '#FFFFFF']));
})();

/* ---------- Drawing ---------- */
const svgNS = 'http://www.w3.org/2000/svg';
const wheel = document.getElementById('wheel');
const N = SLICES.length, STEP = 360 / N, R = 200;

function polar(r, deg) {
  const a = (deg - 90) * Math.PI / 180;
  return [r * Math.cos(a), r * Math.sin(a)];
}
function el(tag, attrs, parent) {
  const n = document.createElementNS(svgNS, tag);
  Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
  parent.appendChild(n);
  return n;
}

function draw() {
  el('circle', { r: R + 8, fill: '#111111' }, wheel);
  SLICES.forEach((name, i) => {
    const [bg, fg] = COLORS[i];
    const a0 = i * STEP, a1 = a0 + STEP;
    const [x0, y0] = polar(R, a0), [x1, y1] = polar(R, a1);
    el('path', { d: `M0 0 L${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1} Z`, fill: bg, stroke: '#111111', 'stroke-width': 1 }, wheel);
    const mid = a0 + STEP / 2;
    const g = el('g', { transform: `rotate(${mid - 90})` }, wheel);
    const size = name.length > 14 ? 11 : name.length > 10 ? 13 : 15;
    const t = el('text', { x: R - 14, y: 0, 'text-anchor': 'end', fill: fg, 'font-size': size, class: 'slice-label' }, g);
    t.textContent = name;
  });
  // Lights around the rim
  for (let i = 0; i < N * 2; i++) {
    const [x, y] = polar(R + 4, i * STEP / 2);
    el('circle', { cx: x, cy: y, r: 3, fill: i % 2 ? '#F2B84B' : '#FFFFFF', stroke: '#111111', 'stroke-width': 0.6 }, wheel);
  }
}

/* ---------- Draw a prize ---------- */
function random() {
  // Uniform number in [0, 1) from the browser's cryptographic generator
  const u = new Uint32Array(2);
  crypto.getRandomValues(u);
  return (u[0] * 2 ** 21 + (u[1] >>> 11)) / 2 ** 53;
}
function pickPrize() {
  let x = random();
  for (const [name, p] of Object.entries(ODDS)) { if ((x -= p) < 0) return name; }
  return COMMON[COMMON.length - 1];
}

/* ---------- Spinning ---------- */
const hub = document.getElementById('hub');
const result = document.getElementById('result');
let rotation = 0, spinning = false;

function spin() {
  if (spinning) return;
  spinning = true; hub.disabled = true;
  result.hidden = true;

  const prize = pickPrize();
  const options = SLICES.map((s, i) => (s === prize ? i : -1)).filter(i => i >= 0);
  const slice = options[Math.floor(random() * options.length)];
  const target = slice * STEP + STEP / 2 + (random() - 0.5) * STEP * 0.7;   // angle on the wheel to stop under the pointer
  const delta = ((-target - rotation) % 360 + 360) % 360;
  rotation += 360 * 6 + delta;

  wheel.classList.add('spinning');
  wheel.style.transform = `rotate(${rotation}deg)`;
  wheel.addEventListener('transitionend', () => {
    wheel.classList.remove('spinning');
    spinning = false; hub.disabled = false;
    show(prize);
  }, { once: true });
}

function show(prize) {
  document.getElementById('prize').textContent = prize;
  result.hidden = false;
  document.getElementById('again').focus();
  confetti(ODDS[prize] < 0.05 ? 260 : 120);
}

hub.addEventListener('click', spin);
wheel.addEventListener('click', spin);
document.getElementById('again').addEventListener('click', spin);
result.addEventListener('click', e => { if (e.target === result) result.hidden = true; });
document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); spin(); }
  if (e.code === 'Escape') result.hidden = true;
});

/* ---------- Confetti ---------- */
const canvas = document.getElementById('confetti');
const ctx = canvas.getContext('2d');
let pieces = [], frame = null;
function confetti(count) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const colors = ['#1E8E4E', '#FFFFFF', '#111111', '#F2B84B'];
  for (let i = 0; i < count; i++) {
    pieces.push({
      x: innerWidth / 2, y: innerHeight * 0.45, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 16 - 4,
      r: Math.random() * 360, vr: (Math.random() - 0.5) * 20, w: 6 + Math.random() * 6, h: 10 + Math.random() * 8,
      c: colors[i % colors.length], life: 0
    });
  }
  if (!frame) frame = requestAnimationFrame(tick);
}
function tick() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  pieces = pieces.filter(p => p.y < innerHeight + 40 && p.life < 240);
  for (const p of pieces) {
    p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life++;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r * Math.PI / 180);
    ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
  }
  frame = pieces.length ? requestAnimationFrame(tick) : (ctx.clearRect(0, 0, innerWidth, innerHeight), null);
}

draw();
