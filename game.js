/* Roly Roll — a friendly rolling game. No dependencies, plain canvas. */
(() => {
'use strict';

// ---------- helpers ----------
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function rngFrom(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const INK = '#1d1530';
const FONT = "'Lilita One','Arial Rounded MT Bold',sans-serif";

// ---------- canvas ----------
const cv = $('#game'), ctx = cv.getContext('2d');
let W = 0, H = 0;
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize); resize();

// ---------- saved data ----------
// Every player name gets its own profile (stars, skins, levels, missions).
// The leaderboard and the sound settings are shared by everyone on the device.
const KEY = 'rolyroll.v2', OLD_KEY = 'rolyroll.v1';
const PROFILE_FIELDS = ['bank', 'skin', 'owned', 'levels', 'missions'];
const freshProfile = () => ({ bank: 0, skin: 'grape', owned: ['grape'], levels: {}, missions: null });
const nameKey = n => (n || '').trim().toLowerCase() || 'player';
const store = { name: '', profiles: {}, boards: {}, sound: true, music: true, diff: 'chill' };
try {
  const raw = localStorage.getItem(KEY);
  if (raw) Object.assign(store, JSON.parse(raw));
  else {                                 // first run after the update: keep what the old save had
    const old = JSON.parse(localStorage.getItem(OLD_KEY) || 'null');
    if (old) {
      for (const k of ['boards', 'sound', 'music', 'diff']) if (k in old) store[k] = old[k];
      store.name = old.name || '';
      const p = freshProfile(); p.name = old.name || 'Player';
      for (const f of PROFILE_FIELDS) if (f in old) p[f] = old[f];
      store.profiles[nameKey(store.name)] = p;
    }
  }
} catch (e) { /* private mode: play without saving */ }
const save = Object.assign({ name: store.name, boards: store.boards, sound: store.sound, music: store.music, diff: store.diff }, freshProfile());
let dirty = false;                       // a brand-new name is only stored once it has something to keep
function loadProfile(name) {
  const p = store.profiles[nameKey(name)];
  Object.assign(save, freshProfile(), p ? JSON.parse(JSON.stringify(p)) : {});
  save.name = name; dirty = false;
}
function persist() {
  const k = nameKey(save.name);
  if (dirty || store.profiles[k]) {
    const p = { name: save.name || 'Player' };
    for (const f of PROFILE_FIELDS) p[f] = save[f];
    store.profiles[k] = p;
  }
  store.name = save.name; store.boards = save.boards; store.sound = save.sound; store.music = save.music; store.diff = save.diff;
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* ignore */ }
}
loadProfile(store.name);

// ---------- drawn icons ----------
const ICONS = {
  star: '<path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z" fill="#ffd23f"/>',
  tots: '<ellipse cx="12" cy="9" rx="6.5" ry="7.5" fill="#ff8ad8"/><path d="M12 16.5l-1.5 2h3z" fill="#ff8ad8"/><path d="M12 18.5c-2 2 2 2 0 4" fill="none"/>',
  endless: '<path d="M12 12c-2-3-4-4.5-6-4.5a4.5 4.5 0 0 0 0 9c2 0 4-1.5 6-4.5zm0 0c2 3 4 4.5 6 4.5a4.5 4.5 0 0 0 0-9c-2 0-4 1.5-6 4.5z" fill="#3bbda0"/>',
  rush: '<circle cx="12" cy="14" r="7.5" fill="#ff9a3c"/><path d="M10 3h4M12 3v3.5M12 14V9.5M18 7l1.5-1.5" fill="none"/>',
  trek: '<path d="M6 4h12l-3 4 3 4H6z" fill="#8f76e0"/><path d="M6 22V3" fill="none"/>',
  chill: '<path d="M7 18a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.6-1A4.5 4.5 0 0 1 17 18z" fill="#ff8ad8"/>',
  normal: '<path d="M13.5 2L5 13.5h5.5L9.5 22 19 10h-6z" fill="#ffd23f"/>',
  wild: '<path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-2.5 1-4 2.5-5.5.5 2 1 3 2 3.5C10 8.5 10.5 5 12 2z" fill="#e2553f"/>',
  board: '<path d="M7 3h10v5a5 5 0 0 1-10 0z" fill="#ffd23f"/><path d="M7 5H4c0 3 1.5 4.5 3.5 4.5M17 5h3c0 3-1.5 4.5-3.5 4.5M12 13v4M8 21h8" fill="none"/>',
  missions: '<circle cx="12" cy="12" r="9.5" fill="#fff"/><circle cx="12" cy="12" r="6" fill="#e2553f"/><circle cx="12" cy="12" r="2.2" fill="#fff"/>',
  skins: '<path d="M8 3 2 7l2.5 4L7 9.5V21h10V9.5l2.5 1.5L22 7l-6-4c-1 2-7 2-8 0z" fill="#5aa9ff"/>',
  help: '<circle cx="12" cy="12" r="9.5" fill="#ffd23f"/><path d="M9.2 9.3a2.9 2.9 0 1 1 4.3 2.5c-1 .6-1.5 1.2-1.5 2.2" fill="none"/><circle cx="12" cy="17.3" r=".7" fill="#1d1530"/>',
  sound: '<path d="M3 9.5h4l5-4.5v14l-5-4.5H3z" fill="#8f76e0"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none"/>',
  mute: '<path d="M3 9.5h4l5-4.5v14l-5-4.5H3z" fill="#c9c2e6"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none"/>',
  music: '<path d="M9 18V5l11-2v13" fill="none"/><ellipse cx="6.5" cy="18" rx="3" ry="2.4" fill="#ff8ad8"/><ellipse cx="17.5" cy="16" rx="3" ry="2.4" fill="#ff8ad8"/>',
};
const icon = n => `<svg class="ic" viewBox="0 0 24 24" stroke="#1d1530" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${ICONS[n]}</svg>`;

// ---------- game data ----------
const DIFFS = {
  tots:   { v0: 8,  v1: 9,  ramp: 1500, hearts: Infinity, curve: 1.2, hazard: .55, react: 1.3, stars: 1,  maxBlocks: 1, lowOpen: true,  gaps: false, gapMax: 0, movers: false, narrow: false, slalom: false, rails: true, bouncy: true },
  chill:  { v0: 11, v1: 18, ramp: 1800, hearts: 3, curve: 2.5, hazard: .8, react: .95, stars: .85, maxBlocks: 2, lowOpen: true,  gaps: true, gapMax: 1, movers: false, narrow: false, slalom: true },
  normal: { v0: 14, v1: 25, ramp: 1600, hearts: 2, curve: 4,   hazard: 1,  react: .68, stars: .75, maxBlocks: 3, lowOpen: false, gaps: true, gapMax: 2, movers: true,  narrow: true,  slalom: true },
  wild:   { v0: 19, v1: 33, ramp: 1400, hearts: 1, curve: 5.5, hazard: 1,  react: .5,  stars: .65, maxBlocks: 4, lowOpen: false, gaps: true, gapMax: 3, movers: true,  narrow: true,  slalom: true },
};
const DIFF_LABEL = { chill: 'Chill', normal: 'Normal', wild: 'Wild' };

const LEVELS = [
  { name: 'First Roll',     len: 260, v: [10, 11], curve: 1.5, p: 0,   f: {} },
  { name: 'Hop To It',      len: 320, v: [11, 12], curve: 2,   p: .1,  f: { gaps: 1 } },
  { name: 'Wiggle Way',     len: 380, v: [11, 13], curve: 4.5, p: .15, f: {} },
  { name: 'Block Party',    len: 420, v: [12, 14], curve: 2.5, p: .5,  f: { blocks: 3 } },
  { name: 'Mind The Gap',   len: 460, v: [12, 15], curve: 3,   p: .4,  f: { gaps: 2 } },
  { name: 'Skinny Bridge',  len: 480, v: [12, 15], curve: 2.5, p: .4,  f: { gaps: 1, narrow: 1 } },
  { name: 'Sliding Doors',  len: 520, v: [13, 16], curve: 3,   p: .5,  f: { movers: 1 } },
  { name: 'Zig Zag Zoom',   len: 560, v: [15, 19], curve: 5,   p: .5,  f: { gaps: 1, blocks: 3 } },
  { name: 'Hop Scotch',     len: 600, v: [14, 18], curve: 3,   p: .7,  f: { gaps: 3, narrow: 1 } },
  { name: 'Busy Street',    len: 640, v: [15, 20], curve: 3.5, p: .8,  f: { movers: 1, blocks: 3, gaps: 1 } },
  { name: 'Speedy Sprint',  len: 760, v: [19, 25], curve: 4,   p: .7,  f: { gaps: 2, blocks: 3, movers: 1 } },
  { name: 'The Grand Roll', len: 900, v: [17, 26], curve: 5,   p: 1,   f: { gaps: 3, blocks: 4, movers: 1, narrow: 1 } },
];
function levelDiff(L) {
  const f = L.f;
  return Object.assign({}, DIFFS.chill, {
    v0: L.v[0], v1: L.v[1], ramp: L.len, curve: L.curve, hearts: 3, hazard: 1, react: .85,
    maxBlocks: f.blocks || 2, lowOpen: L.p < .3, gaps: !!f.gaps, gapMax: f.gaps || 0,
    movers: !!f.movers, narrow: !!f.narrow, slalom: L.p >= .4,
  });
}

const SKINS = [
  { id: 'grape',  name: 'Grape',      c1: '#8f76e0', c2: '#ffd23f', pat: 'stripes', cost: 0 },
  { id: 'bubble', name: 'Bubblegum',  c1: '#ff8ad8', c2: '#ffffff', pat: 'dots',    cost: 4000 },
  { id: 'mint',   name: 'Minty',      c1: '#3bbda0', c2: '#fbf7ef', pat: 'diamond', cost: 8000 },
  { id: 'tiger',  name: 'Tiger',      c1: '#ff9a3c', c2: '#1d1530', pat: 'zigzag',  cost: 14000 },
  { id: 'berry',  name: 'Strawberry', c1: '#e2553f', c2: '#ffd9d2', pat: 'heart',   cost: 22000 },
  { id: 'sky',    name: 'Sky',        c1: '#5aa9ff', c2: '#ffffff', pat: 'star',    cost: 32000 },
  { id: 'bee',    name: 'Bumblebee',  c1: '#ffd23f', c2: '#1d1530', pat: 'blocks',  cost: 45000 },
  { id: 'night',  name: 'Midnight',   c1: '#2a2456', c2: '#ffd23f', pat: 'moon',    cost: 60000 },
];
const skinNow = () => SKINS.find(s => s.id === save.skin) || SKINS[0];

const THEMES = [
  { sky: ['#d9d3ff', '#fbf7ef'], t1: '#7a63d4', t2: '#8f79e3', edge: '#43318f', acc: ['#ff8ad8', '#ffb400', '#e2553f'] },
  { sky: ['#ffdcc2', '#fff7e8'], t1: '#ff8a5c', t2: '#ffa27c', edge: '#b0452a', acc: ['#735fc9', '#ffd23f', '#1fa58a'] },
  { sky: ['#c4f0e0', '#f6fff7'], t1: '#1fa58a', t2: '#3bbda0', edge: '#0f6b59', acc: ['#ff8ad8', '#ff9a3c', '#735fc9'] },
  { sky: ['#ffcdea', '#fff2f9'], t1: '#e25aa8', t2: '#f07cbf', edge: '#9c2a6d', acc: ['#735fc9', '#ffd23f', '#1fa58a'] },
  { sky: ['#2a2456', '#6453bd'], t1: '#4a3ab0', t2: '#5d4cc8', edge: '#1a1340', acc: ['#ff8ad8', '#ffd23f', '#5aa9ff'] },
];

const MISSION_POOL = [
  { k: 'stars', t: 'Collect {n} stars', n: [60, 100, 150] },
  { k: 'dist', t: 'Roll {n} m in total', n: [1000, 2000, 3000] },
  { k: 'jumps', t: 'Hop {n} times', n: [20, 40] },
  { k: 'powers', t: 'Grab {n} power-ups', n: [3, 5] },
  { k: 'games', t: 'Play {n} rounds', n: [3, 5] },
  { k: 'clean', t: 'Roll 300 m without a bump', n: [1] },
  { k: 'levelWins', t: 'Finish a Level Trek level', n: [1] },
];
const MISSION_REWARD = 30;
function todayKey() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function missions() {
  const day = todayKey();
  if (!save.missions || save.missions.date !== day) {
    const R = rngFrom([...day].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
    const pool = MISSION_POOL.slice().sort(() => R() - .5).slice(0, 3);
    save.missions = { date: day, list: pool.map(m => ({ k: m.k, n: m.n[Math.floor(R() * m.n.length)], p: 0, done: false })) };
    persist();
  }
  return save.missions.list;
}
const missionText = m => MISSION_POOL.find(x => x.k === m.k).t.replace('{n}', m.n);

// ---------- sound ----------
let ac = null;
function audio() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function tone(f, d = .12, type = 'sine', v = .15, slide = 0, when = 0) {
  if (!save.sound) return;
  const a = audio(); if (!a) return;
  const t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .03);
}
const sfx = {
  star: n => tone(620 * Math.pow(1.06, Math.min(n, 12)), .12, 'triangle', .13),
  jump: () => tone(300, .18, 'square', .06, 380),
  hit: () => tone(170, .28, 'sawtooth', .13, -110),
  boing: () => tone(210, .26, 'sine', .2, 520),
  power: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .12, 'triangle', .12, 0, i * .07)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, .22, 'triangle', .13, 0, i * .15)),
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .2, 'triangle', .13, 0, i * .1)),
  click: () => tone(520, .05, 'square', .05),
};
let mstep = 0;
setInterval(() => {
  if (!save.music || !save.sound || state !== 'play') return;
  const sc = [262, 294, 330, 392, 440, 523, 587, 659];
  const pat = [0, 2, 4, 2, 5, 4, 2, 1, 0, 2, 4, 7, 5, 4, 2, 4];
  tone(sc[pat[mstep % 16]], .18, 'triangle', .035);
  if (mstep % 4 === 0) tone(sc[[0, 0, 3, 4][(mstep >> 2) % 4]] / 2, .32, 'sine', .06);
  mstep++;
}, 230);

// ---------- state ----------
let state = 'menu';            // menu | play | pause | over
let run = null, demo = null, lastStart = null;
const keys = { left: false, right: false };
const touches = new Map();          // finger id -> 'left' | 'right'
const touchDir = d => { for (const v of touches.values()) if (v === d) return true; return false; };
let jumpBuf = 0;
const S = (n, a) => { if (state === 'play') sfx[n](a); };

// ---------- track ----------
const ROW = 2, LANES = [-3, -1.5, 0, 1.5, 3], BALL_R = .55;
function cxAt(r, i) {
  const ramp = Math.min(1, Math.max(0, i - 6) / 40), c = r.D.curve;
  return ramp * (c * Math.sin(i * .045 + r.ph1) + c * .35 * Math.sin(i * .11 + r.ph2));
}
const speedAt = (r, dist) => r.D.v0 + (r.D.v1 - r.D.v0) * Math.min(1, dist / r.D.ramp);

function newRun(mode, diffKey, lvlIdx) {
  const lvl = mode === 'trek' ? LEVELS[lvlIdx] : null;
  const D = lvl ? levelDiff(lvl) : DIFFS[(mode === 'tots' || mode === 'demo') ? 'tots' : diffKey];
  const rng = rngFrom(lvl ? 1000 + lvlIdx * 77 : (Math.random() * 1e9) | 0);
  const r = {
    mode, diff: diffKey, D, lvl, lvlIdx, rng, rows: [], base: 0, queue: [],
    ph1: rng() * 6.28, ph2: rng() * 6.28, themeOff: lvl ? lvlIdx : 0,
    lenRows: lvl ? Math.round(lvl.len / ROW) : 0, finRow: 0, totalStars: 0, starItems: 0,
    ball: { x: 0, y: 0, z: 2, vx: 0, vy: 0, ground: true, fall: false, spin: 0, sq: 0, air: 0 },
    speed: 0, hearts: D.hearts, maxHearts: D.hearts, stars: 0, combo: 0, comboT: 0, jumps: 0, powers: 0, hits: 0,
    inv: 0, shield: 0, magnet: 0, slow: 0, dbl: 0, time: 0, timer: mode === 'rush' ? 60 : 0,
    cleanStart: 0, cleanBest: 0, intro: mode === 'demo' ? 0 : 1.6, done: false,
    camX: 0, shake: 0, parts: [], blink: 0,
  };
  fill(r);
  return r;
}

function pickPower(r) {
  const o = ['magnet', 'x2'];
  if (!r.D.bouncy) {
    o.push('shield', 'slow');
    if (r.mode === 'rush') o.push('clock', 'clock');
    else if (isFinite(r.D.hearts)) o.push('heart');
  }
  return o[Math.floor(r.rng() * o.length)];
}

function pushRow(r, o) {
  const i = r.base + r.rows.length;
  const row = { i, w: o.w || 8, gap: !!o.gap, obs: o.obs || [], items: o.items || [], fin: !!o.fin };
  if (!r.finRow || i < r.finRow) for (const it of row.items) if (it.t === 'star') r.totalStars++;
  r.rows.push(row);
}

function plan(r) {
  const D = r.D, R = r.rng, q = r.queue, i = r.base + r.rows.length, dist = i * ROW;
  if (r.lenRows && i >= r.lenRows) {
    if (!r.finRow) { r.finRow = i; q.push({ fin: true }); } else q.push({});
    return;
  }
  if (i < 10) { q.push({}); return; }
  const p = r.lvl ? r.lvl.p : Math.min(1, dist / 1500);
  const restN = Math.max(3, Math.ceil(speedAt(r, dist) * D.react / ROW)) + Math.floor(R() * 3);
  const ri = n => Math.floor(R() * n);
  const star = (l, y) => ({ dx: LANES[l], y: y || .25, t: 'star' });
  const tall = (l, mv) => ({ dx: LANES[l], w: 1.3, h: 2, mv: mv || 0, ph: R() * 6 });
  const low = l => ({ dx: LANES[l], w: 1.5, h: .8, mv: 0, ph: 0 });

  // a calm stretch, usually with a trail of stars and sometimes a power-up
  const sl = 1 + ri(3), has = R() < D.stars, pw = R() < .15 ? ri(restN) : -1, weave = R() < .35;
  for (let k = 0; k < restN; k++) {
    const it = [];
    if (k === pw) it.push({ dx: LANES[1 + ri(3)], y: .35, t: pickPower(r) });
    else if (has) {
      const l = weave ? clamp(sl + Math.round(Math.sin(k * .8)), 0, 4) : sl;
      it.push(star(l));
      if (r.mode === 'rush') it.push(star(l === 2 ? 0 : 4 - l));
    }
    q.push({ items: it });
  }
  if (R() > D.hazard) return;

  const opts = ['blocks', 'blocks', 'low'];
  if (D.slalom && p > .15) opts.push('slalom');
  if (D.gaps && p > .08) opts.push('gap', 'gap');
  if (D.movers && p > .25) opts.push('mover');
  if (D.narrow && p > .2) opts.push('narrow');
  const pick = opts[ri(opts.length)];

  if (pick === 'blocks') {
    const k = Math.min(D.maxBlocks, 1 + ri(1 + Math.round(p * 3)));
    const ls = [0, 1, 2, 3, 4].sort(() => R() - .5);
    q.push({ obs: ls.slice(0, k).map(l => tall(l)), items: [star(ls[4])] });
  } else if (pick === 'low') {
    const open = D.lowOpen ? ri(5) : -1;
    q.push({ items: [star(2, 1.2)] });
    q.push({ obs: [0, 1, 2, 3, 4].filter(l => l !== open).map(low), items: [star(2, 1.9)] });
    q.push({ items: [star(2, 1.2)] });
  } else if (pick === 'slalom') {
    const flip = R() < .5, n = 2 + ri(2);
    for (let k = 0; k < n; k++) {
      const left = (k % 2 === 0) !== flip;
      q.push({ obs: (left ? [0, 1, 2] : [2, 3, 4]).map(l => tall(l)), items: [star(left ? 4 : 0)] });
      if (k < n - 1) for (let j = 0; j < restN; j++) q.push({});
    }
  } else if (pick === 'gap') {
    const n = 1 + ri(D.gapMax);
    for (let k = 0; k < n; k++) q.push({ gap: true, items: [star(2, 1.6)] });
  } else if (pick === 'mover') {
    q.push({ obs: [tall(2, 2.6)] });
    if (p > .6) { for (let j = 0; j < Math.ceil(restN / 2); j++) q.push({}); q.push({ obs: [tall(2, 2.6)] }); }
  } else if (pick === 'narrow') {
    const n = 6 + ri(6), mid = Math.floor(n / 2);
    for (let k = 0; k < n; k++) q.push({ w: 4.5, items: (k % 2 && k !== mid) ? [star(2)] : [], obs: (p > .5 && k === mid) ? [low(2)] : [] });
  }
}

function fill(r) {
  const ballRow = Math.floor(r.ball.z / ROW);
  while (r.base < ballRow - 6 && r.rows.length) { r.rows.shift(); r.base++; }
  while (r.base + r.rows.length < ballRow + 50) {
    if (!r.queue.length) plan(r);
    pushRow(r, r.queue.shift());
  }
}
const rowAt = (r, z) => r.rows[Math.floor(z / ROW) - r.base];

// ---------- particles ----------
function burst(r, x, y, z, n, colors, power) {
  const p = proj(x, y, z);
  for (let k = 0; k < n; k++) {
    const a = Math.random() * 6.28, v = (60 + Math.random() * 220) * (power || 1);
    r.parts.push({ x: p[0], y: p[1], vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life: .5 + Math.random() * .5, c: colors[k % colors.length], s: 4 + Math.random() * 6, rot: Math.random() * 6 });
  }
  if (r.parts.length > 260) r.parts.splice(0, r.parts.length - 260);
}

// ---------- update ----------
function update(r, dt) {
  const b = r.ball, D = r.D, isDemo = r.mode === 'demo';
  for (const p of r.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; p.rot += dt * 8; }
  r.parts = r.parts.filter(p => p.life > 0);
  r.shake = Math.max(0, r.shake - dt);
  if (r.intro > 0) { r.intro -= dt; r.blink += dt; return; }

  r.time += dt; r.blink += dt;
  for (const k of ['inv', 'shield', 'magnet', 'slow', 'dbl']) if (r[k] > 0) r[k] = Math.max(0, r[k] - dt);
  r.comboT -= dt; if (r.comboT <= 0) r.combo = 0;

  let sp = speedAt(r, b.z); if (r.slow > 0) sp *= .6;
  r.speed += (sp - r.speed) * Math.min(1, dt * 3);

  // steering
  let inp = isDemo ? 0 : (keys.right || touchDir('right') ? 1 : 0) - (keys.left || touchDir('left') ? 1 : 0);
  const bi = b.z / ROW;
  if (isDemo) {
    let tx = cxAt(r, bi + 2);
    for (let k = 1; k <= 7; k++) {
      const row = r.rows[Math.floor(bi) + k - r.base]; if (!row) break;
      const it = row.items.find(o => !o.got);
      if (it) { tx = cxAt(r, row.i + .5) + it.dx; break; }
    }
    inp = clamp((tx - b.x) * .7, -1, 1);
  }
  const maxV = 8 + r.speed * .2;
  b.vx += (inp * maxV - b.vx) * Math.min(1, dt * 9);
  b.x += b.vx * dt;
  b.z += r.speed * dt;
  b.spin += r.speed * dt * .25;
  b.sq = Math.max(0, b.sq - dt * 4);
  fill(r);

  // floor
  const row = rowAt(r, b.z), cx = cxAt(r, b.z / ROW);
  if (D.rails && row) b.x = clamp(b.x, cx - row.w / 2 + .6, cx + row.w / 2 - .6);
  const over = row && !row.gap && Math.abs(b.x - cx) <= row.w / 2 + .25;
  b.vy -= 26 * dt; b.y += b.vy * dt;
  if (b.y <= 0) {
    if (over && b.y > -.55 && !b.fall) {
      if (b.vy < -7) b.sq = 1;
      b.y = 0; b.vy = 0; b.ground = true; b.air = 0;
    } else { b.ground = false; if (b.y < -.55) b.fall = true; }
  } else b.ground = false;
  if (!b.ground) b.air += dt;

  // hop
  jumpBuf -= dt;
  let wantJump = !isDemo && jumpBuf > 0;
  if (isDemo && b.ground) {             // the demo ball hops over what's ahead
    const ahead = rowAt(r, b.z + r.speed * .25);
    if (ahead && ahead.obs.some(o => !o.hit && Math.abs(cxAt(r, ahead.i + .5) + o.dx - b.x) < 1.3)) wantJump = true;
  }
  if (wantJump && (b.ground || (b.air < .12 && b.vy <= 0 && !b.fall))) {
    b.vy = 9.6; b.ground = false; b.air = 1; jumpBuf = 0; r.jumps++; S('jump');
  }

  // obstacles & pickups
  const bri = Math.floor(b.z / ROW);
  for (let k = -1; k <= 4; k++) {
    const rw = r.rows[bri + k - r.base]; if (!rw) continue;
    const rcx = cxAt(r, rw.i + .5);
    if (k <= 1) for (const o of rw.obs) {
      if (o.hit) continue;
      const ox = rcx + o.dx + (o.mv ? Math.sin(r.time * 1.8 + o.ph) * o.mv : 0);
      const z0 = (rw.i + .2) * ROW, z1 = (rw.i + .8) * ROW;
      if (b.z + .45 > z0 && b.z - .45 < z1 && Math.abs(b.x - ox) < o.w / 2 + .35 && b.y < o.h - .15) hitObstacle(r, o, ox, z0);
    }
    for (const it of rw.items) {
      if (it.got) continue;
      const ix = rcx + it.dx, iz = (rw.i + .5) * ROW, dz = iz - b.z, dx = Math.abs(ix - b.x);
      const reach = D.bouncy ? 1.5 : 1.05;
      const near = Math.abs(dz) < .9 && dx < reach && Math.abs(b.y - it.y) < 1.5;
      const pulled = r.magnet > 0 && it.t === 'star' && dz < 7 && dz > -1 && dx < 6;
      if (near || pulled) collect(r, it, ix, iz);
    }
  }

  // endings
  if (b.y < -9) fell(r);
  if (r.mode === 'rush') { r.timer -= dt; if (r.timer <= 0) { r.timer = 0; end(true); } }
  if (r.finRow && b.z > (r.finRow + 1) * ROW && !b.fall) end(true);
}

function hitObstacle(r, o, ox, oz) {
  const b = r.ball;
  o.hit = true;
  burst(r, ox, o.h / 2, oz, 14, ['#ff8ad8', '#ffd23f', '#ffffff']);
  if (r.D.bouncy) { b.vy = 10; b.ground = false; b.air = 1; S('boing'); return; }
  if (r.inv > 0) return;
  if (r.shield > 0) { r.shield = 0; r.inv = .6; S('power'); toast('🛡️ Shield saved you!'); return; }
  damage(r);
}
function damage(r) {
  const b = r.ball;
  r.hits++; r.cleanBest = Math.max(r.cleanBest, b.z - r.cleanStart); r.cleanStart = b.z;
  r.inv = 1.8; r.shake = .35; S('hit');
  if (r.mode === 'rush') { r.timer = Math.max(0, r.timer - 3); toast('−3 seconds'); return; }
  r.hearts--;
  if (r.hearts <= 0) end(false);
}
function fell(r) {
  const b = r.ball;
  if (r.inv <= 0 || b.fall) { r.inv = 0; damage(r); }
  if (r.done) return;
  let i = Math.floor(b.z / ROW) + 2;
  for (let n = 0; n < 40; n++, i++) {
    const a = r.rows[i - r.base], c = r.rows[i + 1 - r.base], d = r.rows[i + 2 - r.base];
    if (a && c && d && !a.gap && !c.gap && !d.gap && !c.obs.length && !d.obs.length) break;
  }
  b.z = (i + .5) * ROW; b.x = cxAt(r, i + .5); b.y = 4; b.vy = 0; b.vx = 0; b.fall = false; b.ground = false; b.air = 1;
  r.inv = 2.2; r.cleanStart = b.z;
  fill(r);
}
function collect(r, it, x, z) {
  const b = r.ball; it.got = true;
  if (it.t === 'star') {
    r.starItems++; r.stars += r.dbl > 0 ? 2 : 1;
    r.combo++; r.comboT = 1.2; S('star', r.combo);
    burst(r, b.x, b.y + .6, b.z, 5, ['#ffd23f', '#fff3b0']);
    return;
  }
  r.powers++; S('power');
  burst(r, x, it.y + .5, z, 16, ['#ff8ad8', '#ffd23f', '#5aa9ff', '#ffffff']);
  if (it.t === 'shield') { r.shield = 20; toast('🛡️ Shield!'); }
  else if (it.t === 'magnet') { r.magnet = 8; toast('🧲 Star magnet!'); }
  else if (it.t === 'slow') { r.slow = 6; toast('🐌 Slow-mo!'); }
  else if (it.t === 'x2') { r.dbl = 10; toast('✖️2 Double stars!'); }
  else if (it.t === 'clock') { r.timer += 5; toast('⏱️ +5 seconds!'); }
  else if (it.t === 'heart') { if (r.hearts < r.maxHearts) { r.hearts++; toast('❤️ Heart back!'); } else { r.stars += 5; toast('❤️ Full hearts: +5 ⭐'); } }
}

// ---------- drawing ----------
const cam = { x: 0, y: 3, z: 0, f: 500, hy: 200, sx: 0, sy: 0 };
function proj(x, y, z) {
  const s = cam.f / Math.max(.3, z - cam.z);
  return [W / 2 + (x - cam.x) * s + cam.sx, cam.hy + (cam.y - y) * s + cam.sy, s];
}
function quad(a, b, c, d, fill, stroke) {
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}
const themeAt = (r, i) => THEMES[(Math.floor(i * ROW / 400) + r.themeOff) % THEMES.length];

const decor = [];
{ const R = rngFrom(42); for (let k = 0; k < 16; k++) decor.push({ u: R(), v: R(), t: k % 4, s: .6 + R() * .9, c: k % 3, par: .2 + R() * .5, rot: R() * 6 }); }
const sky = [hex(THEMES[0].sky[0]), hex(THEMES[0].sky[1])];

function drawBackground(r, dt) {
  const th = themeAt(r, r.ball.z / ROW);
  for (let k = 0; k < 2; k++) { const t = hex(th.sky[k]); for (let j = 0; j < 3; j++) sky[k][j] += (t[j] - sky[k][j]) * Math.min(1, dt * 2); }
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `rgb(${sky[0].map(Math.round)})`); g.addColorStop(.75, `rgb(${sky[1].map(Math.round)})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // big friendly sun on the horizon
  const sx = W / 2 - cam.x * 6, sr = Math.min(W, H) * .17;
  ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.fillStyle = th.acc[1];
  ctx.beginPath(); ctx.arc(sx, cam.hy, sr, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();

  for (const d of decor) {
    d.v += dt * r.speed * .004 * d.par; if (d.v > 1.1) { d.v = -.1; d.u = Math.random(); }
    const x = ((d.u * W - cam.x * 14 * d.par) % W + W) % W, y = d.v * H, s = d.s * Math.min(W, H) * .035;
    ctx.save(); ctx.translate(x, y); ctx.rotate(d.rot); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.fillStyle = th.acc[d.c];
    ctx.beginPath();
    if (d.t === 0) {            // sparkle
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rr = k % 2 ? s * .32 : s; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
    } else if (d.t === 1) {     // squiggle
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let k = 0; k <= 12; k++) ctx.lineTo((k - 6) * s * .35, Math.sin(k * 1.3) * s * .45);
      ctx.lineWidth = s * .5; ctx.stroke(); ctx.strokeStyle = th.acc[d.c]; ctx.lineWidth = s * .5 - 5; ctx.stroke();
    } else if (d.t === 2) {     // half ring
      ctx.arc(0, 0, s, 0, Math.PI); ctx.arc(0, 0, s * .5, Math.PI, 0, true); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else { ctx.arc(0, 0, s * .45, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }
}

function drawStar(x, y, rad, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath();
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? rad * .48 : rad; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath(); ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(1.5, rad * .16); ctx.strokeStyle = INK; ctx.stroke();
  ctx.restore();
}

function drawBall(c, x, y, rad, skin, spin, look, sq, blink) {
  c.save(); c.translate(x, y + rad * sq * .18); c.scale(1 + sq * .18, 1 - sq * .18);
  c.lineWidth = Math.max(2, rad * .09); c.strokeStyle = INK; c.lineJoin = 'round';
  c.beginPath(); c.arc(0, 0, rad, 0, 7); c.fillStyle = skin.c1; c.fill();
  c.save(); c.clip(); c.fillStyle = skin.c2;
  const fr = ((spin % 1) + 1) % 1, base = Math.floor(spin), pat = skin.pat || 'stripes';
  for (let k = -1; k < 4; k++) {          // rows of the pattern roll up the ball
    const y = -(((k + fr) / 3) * 2 - 1) * rad, odd = (((k - base) % 2) + 2) % 2;
    const wide = odd ? [-.55, .55] : [-.85, 0, .85], few = odd ? [0] : [-.62, .62];
    c.beginPath();
    if (pat === 'stripes') c.ellipse(0, y, rad * 1.1, rad * .15, 0, 0, 7);
    else if (pat === 'dots') for (const u of wide) { c.moveTo(u * rad + rad * .15, y); c.arc(u * rad, y, rad * .15, 0, 7); }
    else if (pat === 'diamond') for (const u of wide) { const x = u * rad, s = rad * .2; c.moveTo(x, y - s); c.lineTo(x + s, y); c.lineTo(x, y + s); c.lineTo(x - s, y); c.closePath(); }
    else if (pat === 'blocks') for (const u of wide) c.rect(u * rad - rad * .15, y - rad * .15, rad * .3, rad * .3);
    else if (pat === 'heart') for (const u of few) { const x = u * rad, s = rad * .27; c.moveTo(x, y + s); c.bezierCurveTo(x - 1.6 * s, y - .2 * s, x - .6 * s, y - 1.2 * s, x, y - .4 * s); c.bezierCurveTo(x + .6 * s, y - 1.2 * s, x + 1.6 * s, y - .2 * s, x, y + s); }
    else if (pat === 'star') for (const u of few) { const x = u * rad; for (let j = 0; j < 10; j++) { const a = -Math.PI / 2 + j * Math.PI / 5, q = rad * (j % 2 ? .13 : .3); c[j ? 'lineTo' : 'moveTo'](x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); }
    else if (pat === 'moon') for (const u of few) { const x = u * rad, q = rad * .3; c.moveTo(x + q * .45, y - q * .89); c.arc(x, y, q, -1.1, 1.1, true); c.arc(x + q * .5, y, q * .89, 1.63, -1.63, false); c.closePath(); }
    if (pat === 'zigzag') {
      c.save(); c.strokeStyle = skin.c2; c.lineWidth = rad * .14; c.lineJoin = 'miter';
      for (let j = 0; j <= 8; j++) c[j ? 'lineTo' : 'moveTo']((j - 4) * rad * .3, y + (j % 2 ? -1 : 1) * rad * .1);
      c.stroke(); c.restore();
    } else c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(-rad * .42, -rad * .4, rad * .2, rad * .12, -.6, 0, 7); c.fill();
  c.restore(); c.beginPath(); c.arc(0, 0, rad, 0, 7); c.stroke();
  for (const s of [-1, 1]) {          // googly eyes on top
    c.beginPath(); c.arc(s * rad * .42, -rad * .9, rad * .36, 0, 7); c.fillStyle = '#fff'; c.fill(); c.stroke();
    if (blink) { c.beginPath(); c.moveTo(s * rad * .42 - rad * .2, -rad * .9); c.lineTo(s * rad * .42 + rad * .2, -rad * .9); c.stroke(); }
    else { c.beginPath(); c.arc(s * rad * .42 + look * rad * .14, -rad * .97, rad * .19, 0, 7); c.fillStyle = INK; c.fill(); }
  }
  c.beginPath(); c.arc(0, -rad * .62, rad * .15, .15 * Math.PI, .85 * Math.PI); c.stroke();
  c.restore();
}

const ICON = { shield: ['🛡️', '#5aa9ff'], magnet: ['🧲', '#ff8ad8'], slow: ['🐌', '#3bbda0'], x2: ['×2', '#ff9a3c'], heart: ['❤️', '#ffd9d2'], clock: ['⏱️', '#ffd23f'] };

function drawObstacle(r, row, o) {
  const x = cxAt(r, row.i + .5) + o.dx + (o.mv ? Math.sin(r.time * 1.8 + o.ph) * o.mv : 0);
  const z0 = (row.i + .2) * ROW, z1 = (row.i + .8) * ROW, h = o.h, w = o.w / 2;
  if (z0 <= cam.z + .6) return;
  const bouncy = r.D.bouncy, lowB = h < 1;
  const front = bouncy ? '#ff8ad8' : lowB ? '#ffd23f' : '#e2553f', top = bouncy ? '#ffb5e6' : lowB ? '#ffe889' : '#f08a78';
  const a = proj(x - w, 0, z0), b = proj(x + w, 0, z0), c = proj(x + w, h, z0), d = proj(x - w, h, z0);
  const e = proj(x + w, h, z1), f = proj(x - w, h, z1);
  ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  quad(d, c, e, f, top, INK); quad(a, b, c, d, front, INK);
  // sleepy little face
  const s = a[2], mx = (a[0] + b[0]) / 2, my = (a[1] + d[1]) / 2, er = s * .13;
  ctx.fillStyle = '#fff'; ctx.lineWidth = Math.max(1, s * .04);
  for (const k of [-1, 1]) {
    ctx.beginPath(); ctx.arc(mx + k * s * .27, my - s * .05, er, 0, 7); ctx.fill(); ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.arc(mx + k * s * .27, my - s * .02, er * .5, 0, 7); ctx.fillStyle = INK; ctx.fill(); ctx.fillStyle = '#fff';
  }
  ctx.beginPath();
  if (bouncy) ctx.arc(mx, my + s * .1, s * .12, .1 * Math.PI, .9 * Math.PI); else { ctx.moveTo(mx - s * .1, my + s * .2); ctx.lineTo(mx + s * .1, my + s * .2); }
  ctx.stroke();
}

function drawItem(r, row, it) {
  const x = cxAt(r, row.i + .5) + it.dx, z = (row.i + .5) * ROW;
  if (z <= cam.z + .6) return;
  const bob = Math.sin(r.blink * 4 + row.i) * .12;
  const p = proj(x, it.y + .5 + bob, z), s = p[2];
  const g = proj(x, 0, z);
  if (!row.gap) { ctx.fillStyle = 'rgba(29,21,48,.18)'; ctx.beginPath(); ctx.ellipse(g[0], g[1], s * .3, s * .09, 0, 0, 7); ctx.fill(); }
  if (it.t === 'star') { drawStar(p[0], p[1], s * .42, Math.sin(r.blink * 3 + row.i) * .25); return; }
  const ic = ICON[it.t];
  ctx.beginPath(); ctx.arc(p[0], p[1], s * .5, 0, 7); ctx.fillStyle = ic[1]; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath(); ctx.arc(p[0], p[1], s * .5 + 5 + Math.sin(r.blink * 6) * 2, 0, 7); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(s * .5)}px ${it.t === 'x2' ? FONT : 'sans-serif'}`; ctx.fillText(ic[0], p[0], p[1] + s * .03);
}

function drawRunBall(r) {
  const b = r.ball, row = rowAt(r, b.z);
  const cx = cxAt(r, b.z / ROW);
  const onFloor = row && !row.gap && Math.abs(b.x - cx) <= row.w / 2 + .25 && b.y >= 0;
  if (onFloor) {
    const g = proj(b.x, 0, b.z), k = clamp(1 - b.y * .13, .4, 1);
    ctx.fillStyle = 'rgba(29,21,48,.25)'; ctx.beginPath(); ctx.ellipse(g[0], g[1], g[2] * BALL_R * 1.05 * k, g[2] * BALL_R * .32 * k, 0, 0, 7); ctx.fill();
  }
  if (r.inv > 0 && !r.D.bouncy && Math.floor(r.blink * 14) % 2) return;
  const p = proj(b.x, b.y + BALL_R, b.z), rad = BALL_R * p[2];
  const look = clamp(b.vx / 9, -1, 1), blink = (r.blink % 3.4) > 3.25;
  drawBall(ctx, p[0], p[1], rad, skinNow(), b.spin, look, b.sq, blink);
  if (r.shield > 0) {
    ctx.beginPath(); ctx.arc(p[0], p[1] - rad * .2, rad * 1.6, 0, 7); ctx.fillStyle = 'rgba(90,169,255,.22)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#5aa9ff'; ctx.stroke();
  }
  if (r.magnet > 0) { ctx.font = `${Math.round(rad * .8)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('🧲', p[0], p[1] - rad * 2); }
}

function draw(r, dt) {
  const b = r.ball;
  cam.f = Math.min(H * .85, W * .7); cam.hy = H * .3;
  cam.y = Math.min(5.5, 6.5 * .42 * H / cam.f); cam.z = b.z - 6.5;
  r.camX = b.x;
  cam.x = r.camX;
  cam.sx = r.shake > 0 ? (Math.random() - .5) * 14 * r.shake : 0; cam.sy = r.shake > 0 ? (Math.random() - .5) * 14 * r.shake : 0;

  drawBackground(r, dt);

  const bri = Math.floor(b.z / ROW), FAR = 40;
  ctx.lineJoin = 'round';
  for (let i = bri + FAR; i >= bri - 4; i--) {
    const row = r.rows[i - r.base]; if (!row) continue;
    const z0 = i * ROW, z1 = z0 + ROW; if (z1 <= cam.z + .8) continue;
    const zn = Math.max(z0, cam.z + .7);
    ctx.globalAlpha = clamp((FAR - (i - bri)) / 9, 0, 1);
    if (!row.gap) {
      const th = themeAt(r, i), c0 = cxAt(r, zn / ROW), c1 = cxAt(r, i + 1), h = row.w / 2;
      const A = proj(c0 - h, 0, zn), B = proj(c0 + h, 0, zn), C = proj(c1 + h, 0, z1), Dd = proj(c1 - h, 0, z1);
      const A2 = proj(c0 - h, -.7, zn), B2 = proj(c0 + h, -.7, zn);
      ctx.lineWidth = 2.5;
      if (zn === z0) quad(A, B, B2, A2, th.edge, INK);
      quad(A, B, C, Dd, i % 2 ? th.t1 : th.t2);
      if (row.fin) {
        for (let k = 0; k < 8; k++) for (let j = 0; j < 2; j++) {
          const xa = -h + k * row.w / 8, xb = xa + row.w / 8, za = z0 + j, zb = za + 1;
          quad(proj(c0 + xa, 0, za), proj(c0 + xb, 0, za), proj(c0 + xb, 0, zb), proj(c0 + xa, 0, zb), (k + j) % 2 ? '#fff' : INK);
        }
      }
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(Dd[0], Dd[1]); ctx.moveTo(B[0], B[1]); ctx.lineTo(C[0], C[1]); ctx.stroke();
    }
    // things standing on this row, back to front, with the ball slotted in
    const list = [];
    for (const it of row.items) if (!it.got) list.push([(i + .5) * ROW, () => drawItem(r, row, it)]);
    for (const o of row.obs) if (!o.hit) list.push([(i + .2) * ROW, () => drawObstacle(r, row, o)]);
    if (i === bri) list.push([b.z, () => { ctx.globalAlpha = 1; drawRunBall(r); }]);
    list.sort((p, q) => q[0] - p[0]);
    for (const l of list) l[1]();
  }
  ctx.globalAlpha = 1;

  for (const p of r.parts) {
    ctx.save(); ctx.globalAlpha = clamp(p.life * 2, 0, 1); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); ctx.restore();
  }

  if (r.intro > 0) {
    const txt = r.intro > .55 ? 'Ready?' : 'GO!', sc = 1 + Math.sin(r.intro * 9) * .05;
    ctx.save(); ctx.translate(W / 2, H * .42); ctx.scale(sc, sc);
    ctx.font = `${Math.round(Math.min(W * .2, 120))}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.fillStyle = INK; ctx.fillText(txt, 5, 5);
    ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.strokeText(txt, 0, 0);
    ctx.fillStyle = r.intro > .55 ? '#ff8ad8' : '#ffd23f'; ctx.fillText(txt, 0, 0);
    ctx.restore();
  }
}

// ---------- HUD ----------
const hudEl = { main: $('#hudMain'), sub: $('#hudSub'), stars: $('#hudStars'), hearts: $('#hudHearts'), pow: $('#hudPow'), prog: $('#prog'), bar: $('#prog i') };
const setText = (el, t) => { if (el._t !== t) { el._t = t; el.textContent = t; } };
function hud(r) {
  const dist = Math.floor(r.ball.z);
  if (r.mode === 'endless') { setText(hudEl.main, dist + ' m'); setText(hudEl.sub, DIFF_LABEL[r.diff]); }
  else if (r.mode === 'rush') { setText(hudEl.main, Math.ceil(r.timer) + 's'); setText(hudEl.sub, 'Star Rush · ' + DIFF_LABEL[r.diff]); }
  else if (r.mode === 'trek') { setText(hudEl.main, 'Level ' + (r.lvlIdx + 1)); setText(hudEl.sub, r.lvl.name); hudEl.bar.style.width = clamp(r.ball.z / r.lvl.len * 100, 0, 100) + '%'; }
  else { setText(hudEl.main, '⭐ ' + r.stars); setText(hudEl.sub, isTouch() ? 'Hold a side to steer · tap the middle to hop' : '◀ ▶ to steer · any other key hops'); }
  setText(hudEl.stars, '⭐ ' + r.stars);
  setText(hudEl.hearts, isFinite(r.maxHearts) && r.mode !== 'rush' ? '❤️'.repeat(Math.max(0, r.hearts)) + '🤍'.repeat(Math.max(0, r.maxHearts - r.hearts)) : '');
  const pw = [];
  if (r.shield > 0) pw.push('🛡️ ready');
  if (r.magnet > 0) pw.push('🧲 ' + Math.ceil(r.magnet));
  if (r.slow > 0) pw.push('🐌 ' + Math.ceil(r.slow));
  if (r.dbl > 0) pw.push('×2 ' + Math.ceil(r.dbl));
  const key = pw.join('|');
  if (hudEl.pow._t !== key) { hudEl.pow._t = key; hudEl.pow.innerHTML = pw.map(t => `<span>${t}</span>`).join(''); }
}

let toastT = 0;
function toast(msg) {
  if (state !== 'play') return;
  const el = $('#toast'); el.textContent = msg; el.classList.remove('hide');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.add('hide'), 1300);
}

// ---------- screens ----------
const isTouch = () => window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
function show(id) {
  $$('.screen').forEach(s => s.classList.toggle('hide', s.id !== id));
  const playing = state === 'play' || state === 'pause';
  $('#hud').classList.toggle('hide', !playing);
  $('#touch').classList.toggle('hide', !(state === 'play' && isTouch()));
  if (state !== 'play') $('#toast').classList.add('hide');
}
function start(mode, diff, lvlIdx) {
  audio();
  lastStart = { mode, diff, lvlIdx };
  run = newRun(mode, diff, lvlIdx);
  keys.left = keys.right = false; touches.clear(); jumpBuf = 0;
  state = 'play';
  hudEl.prog.classList.toggle('hide', mode !== 'trek');
  $('#btnFinish').textContent = mode === 'tots' ? '🏁 All done' : '🏠 Quit to home';
  show(null);
}
function pause() { if (state !== 'play') return; state = 'pause'; keys.left = keys.right = false; touches.clear(); show('pause'); }
function resume() { if (state !== 'pause') return; state = 'play'; show(null); }
function goHome() { state = 'menu'; run = null; refreshHome(); show('home'); }

function end(win) {
  const r = run; if (!r || r.done || r.mode === 'demo') return;
  r.done = true; state = 'over';
  const dist = Math.floor(r.ball.z);
  r.cleanBest = Math.max(r.cleanBest, r.ball.z - r.cleanStart);
  let title, html = '';
  $('#btnNext').classList.add('hide');

  if (r.mode === 'tots') {
    title = 'Yay! Great rolling!';
    html = `<div class="big">⭐ ${r.stars}</div><p>stars collected. High five! 🙌</p>`;
  } else if (r.mode === 'trek') {
    const need = Math.ceil(r.totalStars * .5);
    const got = win ? 1 + (r.starItems >= need ? 1 : 0) + (r.hits === 0 ? 1 : 0) : 0;
    if (win) save.levels[r.lvlIdx] = Math.max(save.levels[r.lvlIdx] || 0, got);
    title = win ? 'Level complete!' : 'So close!';
    html = `<div class="stars3">${'⭐'.repeat(got)}${'☆'.repeat(3 - got)}</div>
      <ul><li>${win ? '✅' : '⬜'} Reach the finish line</li>
      <li>${win && r.starItems >= need ? '✅' : '⬜'} Grab ${need} stars (you got ${r.starItems} of ${r.totalStars})</li>
      <li>${win && r.hits === 0 ? '✅' : '⬜'} No bumps (${r.hits} this time)</li></ul>`;
    if (win && r.lvlIdx < LEVELS.length - 1) $('#btnNext').classList.remove('hide');
  } else {
    const score = r.mode === 'rush' ? r.stars : dist + r.stars * 10;
    const key = r.mode + ':' + r.diff, list = save.boards[key] || (save.boards[key] = []);
    const best = list.length ? list[0].s : 0;
    list.push({ n: (save.name || 'Player').slice(0, 12), s: score });
    list.sort((a, b) => b.s - a.s); list.length = Math.min(list.length, 8);
    title = r.mode === 'rush' ? "Time's up!" : 'Nice roll!';
    html = `<div class="big">${score}</div>
      <p>${r.mode === 'rush' ? 'stars in 60 seconds' : `${dist} m + ${r.stars} ⭐ × 10`}</p>
      ${score > best && score > 0 ? '<p><span class="badge">🎉 New family record!</span></p>' : `<p>Record to beat: <b>${best}</b></p>`}`;
  }

  save.bank += r.stars; dirty = true;
  const gain = { stars: r.stars, dist, jumps: r.jumps, powers: r.powers, games: 1, clean: r.cleanBest >= 300 ? 1 : 0, levelWins: r.mode === 'trek' && win ? 1 : 0 };
  const doneNow = [];
  for (const m of missions()) {
    if (m.done) continue;
    m.p = Math.min(m.n, m.p + (gain[m.k] || 0));
    if (m.p >= m.n) { m.done = true; save.bank += MISSION_REWARD; doneNow.push(m); }
  }
  for (const m of doneNow) html += `<p><span class="badge">🎯 Mission done: ${esc(missionText(m))} +${MISSION_REWARD} ⭐</span></p>`;
  if (r.mode !== 'tots') html += `<p>+${r.stars} ⭐ added to your star bank (${save.bank} total)</p>`;
  persist();

  $('#overTitle').textContent = title; $('#overBody').innerHTML = html;
  (win ? sfx.win : sfx.lose)();
  if (win) for (let k = 0; k < 5; k++) burst(r, r.ball.x + (Math.random() - .5) * 6, 2 + Math.random() * 3, r.ball.z + 4, 18, ['#ff8ad8', '#ffd23f', '#5aa9ff', '#3bbda0', '#ffffff'], 1.4);
  show('over');
}

function refreshHome() {
  $('#bank').innerHTML = icon('star') + ' ' + save.bank.toLocaleString();
  if (document.activeElement !== $('#name')) $('#name').value = save.name;
  const known = !!store.profiles[nameKey(save.name)];
  $('#whoNote').textContent = !save.name ? 'Type your name to keep your own stars, skins and levels.'
    : known ? `Welcome back, ${save.name}! Your stars, skins and levels are loaded.`
    : `New player. Progress will be saved under "${save.name}".`;
  $('#players').innerHTML = Object.values(store.profiles).filter(p => p.name && p.name !== 'Player').map(p => `<option value="${esc(p.name)}">`).join('');
  $('#btnSound').innerHTML = icon(save.sound ? 'sound' : 'mute'); $('#btnSound').classList.toggle('off', !save.sound);
  $('#btnMusic').classList.toggle('off', !save.music || !save.sound);
  $$('#diffs button').forEach(b => b.classList.toggle('on', b.dataset.diff === save.diff));
}
function renderLevels() {
  $('#levelGrid').innerHTML = LEVELS.map((L, i) => {
    const got = save.levels[i] || 0, open = i === 0 || (save.levels[i - 1] || 0) > 0;
    return `<button class="lvl" data-lvl="${i}" ${open ? '' : 'disabled'}><b>${open ? i + 1 : '🔒'}</b><span>${L.name}</span><i>${'⭐'.repeat(got)}${'☆'.repeat(3 - got)}</i></button>`;
  }).join('');
}
const boardSel = { mode: 'endless', diff: 'chill' };
function renderBoard() {
  $$('#boardMode button').forEach(b => b.classList.toggle('on', b.dataset.v === boardSel.mode));
  $$('#boardDiff button').forEach(b => b.classList.toggle('on', b.dataset.v === boardSel.diff));
  const list = save.boards[boardSel.mode + ':' + boardSel.diff] || [], unit = boardSel.mode === 'rush' ? '⭐' : 'pts';
  const cols = ['#1fa58a', '#ff9a3c', '#e2553f'];
  $('#podium').innerHTML = list.slice(0, 3).map((e, i) => `<div class="pod" style="--c:${cols[i]}"><div class="n">${i + 1}</div><div class="who2">${esc(e.n)}</div><div class="sc">${e.s} ${unit}</div></div>`).join('');
  $('#boardRows').innerHTML = list.length
    ? list.slice(3).map((e, i) => `<div class="brow"><span class="n">${i + 4}</span><span class="who2">${esc(e.n)}</span><span>${e.s} ${unit}</span></div>`).join('')
    : '<div class="empty">No scores here yet. Go roll and be the first! 🎉</div>';
}
function renderMissions() {
  $('#missionList').innerHTML = missions().map(m => `<div class="mission ${m.done ? 'done' : ''}"><div class="row"><span>${m.done ? '✅' : '🎯'} ${esc(missionText(m))}</span><span>${m.done ? 'Done!' : m.p + ' / ' + m.n}</span></div><div class="bar"><i style="width:${m.p / m.n * 100}%"></i></div></div>`).join('');
}
function renderSkins() {
  $('#bank2').innerHTML = icon('star') + ' ' + save.bank.toLocaleString();
  const grid = $('#skinGrid'); grid.innerHTML = '';
  for (const s of SKINS) {
    const owned = save.owned.includes(s.id), on = save.skin === s.id;
    const el = document.createElement('button');
    el.className = 'skin' + (on ? ' on' : '') + (owned ? '' : ' locked');
    el.innerHTML = `<canvas width="168" height="168"></canvas><b>${s.name}</b><span>${on ? '✔ Wearing' : owned ? 'Tap to wear' : icon('star') + ' ' + s.cost.toLocaleString()}</span>`;
    drawBall(el.querySelector('canvas').getContext('2d'), 84, 100, 50, s, .3, 0, 0, false);
    el.onclick = () => {
      if (owned) save.skin = s.id;
      else if (save.bank >= s.cost) { save.bank -= s.cost; save.owned.push(s.id); save.skin = s.id; sfx.power(); }
      else { sfx.hit(); el.querySelector('span').innerHTML = `Need ${(s.cost - save.bank).toLocaleString()} more`; return; }
      sfx.click(); dirty = true; persist(); renderSkins(); refreshHome();
    };
    grid.appendChild(el);
  }
}

// ---------- wiring ----------
document.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.go) {
    sfx.click();
    ({ levels: renderLevels, board: renderBoard, missions: renderMissions, skins: renderSkins, home: refreshHome }[t.dataset.go] || (() => {}))();
    show(t.dataset.go);
  } else if (t.dataset.mode) {
    sfx.click();
    if (t.dataset.mode === 'trek') { renderLevels(); show('levels'); } else start(t.dataset.mode, save.diff);
  } else if (t.dataset.diff) { save.diff = t.dataset.diff; persist(); sfx.click(); refreshHome(); }
  else if (t.dataset.lvl) { sfx.click(); start('trek', 'chill', +t.dataset.lvl); }
  else if (t.parentElement.id === 'boardMode') { boardSel.mode = t.dataset.v; renderBoard(); }
  else if (t.parentElement.id === 'boardDiff') { boardSel.diff = t.dataset.v; renderBoard(); }
});
// typing a name switches to that player's saved profile (or starts a new one)
$('#name').addEventListener('input', e => { persist(); loadProfile(e.target.value.trim()); persist(); refreshHome(); });
$('#btnSound').onclick = () => { save.sound = !save.sound; persist(); refreshHome(); sfx.click(); };
$('#btnMusic').onclick = () => { save.music = !save.music; persist(); refreshHome(); sfx.click(); };
$('#btnPause').onclick = pause;
$('#btnResume').onclick = resume;
$('#btnRestart').onclick = () => start(lastStart.mode, lastStart.diff, lastStart.lvlIdx);
$('#btnFinish').onclick = () => { if (run && run.mode === 'tots') { state = 'play'; end(true); } else goHome(); };
$('#btnAgain').onclick = () => start(lastStart.mode, lastStart.diff, lastStart.lvlIdx);
$('#btnNext').onclick = () => start('trek', 'chill', lastStart.lvlIdx + 1);
$('#btnHome').onclick = goHome;

const hop = () => { jumpBuf = .14; };
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  const k = e.key;
  if (state === 'play') {
    if (k === 'Escape' || k === 'p' || k === 'P') { pause(); return; }
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = true;
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = true;
    else if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') { if (!e.repeat) hop(); }
    else if (run.mode === 'tots' && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey) hop();   // little hands can mash anything
    if (!e.metaKey && !e.ctrlKey && !e.altKey) e.preventDefault();
  } else if (state === 'pause' && (k === 'Escape' || k === 'p' || k === 'P')) resume();
});
window.addEventListener('keyup', e => {
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false;
  if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
});
// mouse click hops; a finger held on the left or right side steers, the middle hops
cv.addEventListener('pointerdown', e => {
  if (state !== 'play') return;
  e.preventDefault();
  if (e.pointerType === 'mouse') { hop(); return; }
  const f = e.clientX / W;
  if (f < .38) touches.set(e.pointerId, 'left'); else if (f > .62) touches.set(e.pointerId, 'right'); else hop();
});
for (const ev of ['pointerup', 'pointercancel']) window.addEventListener(ev, e => touches.delete(e.pointerId));
function hold(el, on, off) {
  const down = e => { e.preventDefault(); el.classList.add('down'); on(); };
  const up = () => { el.classList.remove('down'); if (off) off(); };
  el.addEventListener('pointerdown', down); el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
  el.addEventListener('contextmenu', e => e.preventDefault());
}
hold($('#tLeft'), () => { keys.left = true; }, () => { keys.left = false; });
hold($('#tRight'), () => { keys.right = true; }, () => { keys.right = false; });
hold($('#tJump'), hop);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('blur', () => { keys.left = keys.right = false; touches.clear(); });

// ---------- main loop ----------
let last = 0;
function frame(t) {
  const dt = Math.min(.033, Math.max(0, (t - last) / 1000)); last = t;
  if (state === 'play') { update(run, dt); if (run && state !== 'menu') hud(run); }
  else if (state === 'menu') update(demo, dt);
  const r = state === 'menu' || !run ? demo : run;
  if (state === 'over') { for (const p of r.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; p.rot += dt * 8; } r.parts = r.parts.filter(p => p.life > 0); }
  draw(r, state === 'pause' ? 0 : dt);
  requestAnimationFrame(frame);
}
$$('[data-ic]').forEach(el => { el.innerHTML = icon(el.dataset.ic); });
demo = newRun('demo', 'chill');
refreshHome(); show('home');
requestAnimationFrame(frame);

// tiny hook so the game can be poked at from the console while testing
window.__roly = { get run() { return run; }, get state() { return state; }, start, end };
})();
