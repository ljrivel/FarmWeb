// Dibujo en Canvas 2D. Lienzo lógico de 320x224 (20x14 tiles de 16 px) escalado
// a un múltiplo entero de píxeles de pantalla para que el pixel art quede nítido.

import { SPECIES } from './data.js';

export const W = 320;
export const H = 224;
const COLS = 20, ROWS = 14;
const INK = '#5b4256';

const loadImg = (src) => new Promise((res, rej) => {
  const i = new Image();
  i.onload = () => res(i);
  i.onerror = () => rej(new Error('No se pudo cargar ' + src));
  i.src = src;
});
const loadJson = (src) => fetch(src).then((r) => {
  if (!r.ok) throw new Error('No se pudo cargar ' + src);
  return r.json();
});

export async function loadSprites() {
  const [animalsImg, iconsImg, tilesImg, animals, icons, tiles] = await Promise.all([
    loadImg('assets/sprites/animals.png'), loadImg('assets/sprites/icons.png'), loadImg('assets/sprites/tiles.png'),
    loadJson('assets/sprites/animals.json'), loadJson('assets/sprites/icons.json'), loadJson('assets/sprites/tiles.json'),
  ]);
  return { animalsImg, iconsImg, tilesImg, animals, icons, tiles };
}

/** Ajusta el lienzo al contenedor con escala entera en píxeles de dispositivo. */
export function fit(canvas, availW, availH) {
  const dpr = window.devicePixelRatio || 1;
  const k = Math.max(1, Math.floor(Math.min((availW * dpr) / W, (availH * dpr) / H)));
  canvas.width = W * k;
  canvas.height = H * k;
  canvas.style.width = `${(W * k) / dpr}px`;
  canvas.style.height = `${(H * k) / dpr}px`;
  return { k, cssW: (W * k) / dpr };
}

function tile(ctx, S, name, x, y) {
  ctx.drawImage(S.tilesImg, S.tiles.index[name] * 16, 0, 16, 16, x, y, 16, 16);
}

function icon(ctx, S, name, x, y, size = 16) {
  ctx.drawImage(S.iconsImg, S.icons.index[name] * 16, 0, 16, 16, Math.round(x), Math.round(y), size, size);
}

function ground(ctx, S, w) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const h = (c * 37 + r * 17 + c * r * 3) % 10;
      tile(ctx, S, h < 2 ? 'grass1' : h < 4 ? 'grass2' : 'grass0', c * 16, r * 16);
    }
  }
  for (let r = 11; r < ROWS; r++) { tile(ctx, S, 'path', 9 * 16, r * 16); tile(ctx, S, 'path', 10 * 16, r * 16); }
  for (let c = 0; c < COLS; c++) {
    tile(ctx, S, 'fence_h', c * 16, 0);
    if (c !== 9 && c !== 10) tile(ctx, S, 'fence_h', c * 16, (ROWS - 1) * 16);
  }
  for (let r = 1; r < ROWS - 1; r++) { tile(ctx, S, 'fence_v', 0, r * 16); tile(ctx, S, 'fence_v', (COLS - 1) * 16, r * 16); }
}

function shadow(ctx, x, y, big = 1) {
  ctx.fillStyle = 'rgba(91,66,86,0.2)';
  const w = 6 * big;
  ctx.fillRect(x - w, y, w * 2, 1);
  ctx.fillRect(x - w - 2, y + 1, w * 2 + 4, 1);
  ctx.fillRect(x - w, y + 2, w * 2, 1);
}

function ring(ctx, x, y, t) {
  ctx.fillStyle = '#ff8fb0';
  const pulse = 1 + (Math.sin(t / 200) > 0 ? 1 : 0);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    ctx.fillRect(Math.round(x + Math.cos(a) * (13 + pulse)), Math.round(y + 1 + Math.sin(a) * (4 + pulse / 2)), 2, 1);
  }
}

function bubble(ctx, S, x, y, name, t, count, dim) {
  const bx = Math.round(x) - 11;
  const by = Math.round(y) - 60 + Math.round(Math.sin(t / 300) * 1.5);
  ctx.fillStyle = INK;
  ctx.fillRect(bx, by + 1, 22, 20);
  ctx.fillRect(bx + 1, by, 20, 22);
  ctx.fillRect(bx + 9, by + 22, 4, 2);
  ctx.fillStyle = dim ? '#fff0d4' : '#fffdf8';
  ctx.fillRect(bx + 1, by + 2, 20, 18);
  ctx.fillRect(bx + 2, by + 1, 18, 20);
  ctx.fillRect(bx + 10, by + 21, 2, 2);
  ctx.globalAlpha = dim ? 0.75 : 1;
  icon(ctx, S, name, bx + 3, by + 3);
  ctx.globalAlpha = 1;
  if (count > 1) {
    ctx.fillStyle = '#ff8fb0';
    ctx.fillRect(bx + 14, by + 12, 9, 8);
    ctx.fillStyle = INK;
    ctx.font = 'bold 8px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(String(count), bx + 16, by + 12);
  }
}

export function draw(ctx, S, w, view, t) {
  ctx.imageSmoothingEnabled = false;
  ground(ctx, S, w);

  const here = (x) => x.corral === 'pradera'; // provisional: la tarea de escenas reemplaza esto
  for (const e of w.eggs.filter(here)) {
    const wob = Math.round(Math.sin(t / 250 + e.id) * 1);
    shadow(ctx, e.x, e.y, 0.8);
    icon(ctx, S, SPECIES[e.species].product.startsWith('escama') ? 'huevo_dino' : 'huevo', e.x - 8 + wob, e.y - 14);
  }

  const sorted = w.animals.filter(here).sort((a, b) => a.y - b.y);
  const idle = S.animals.idle;
  for (const a of sorted) {
    const x = Math.round(a.x), y = Math.round(a.y);
    shadow(ctx, x, y, a.stage === 'baby' ? 0.8 : 1);
    if (a.id === view.selectedId) ring(ctx, x, y, t);
    const row = S.animals.rows[`${a.species}:${a.variant}:${a.stage}`];
    const frame = idle[(Math.floor(t / 220) + a.id * 3) % idle.length];
    ctx.drawImage(S.animalsImg, frame * 32, row * 32, 32, 32, x - 16, y - 29, 32, 32);
    if (a.shiny && Math.sin(t / 180 + a.id) > -0.3) icon(ctx, S, 'destello', x + 7, y - 33 + Math.round(Math.sin(t / 400)), 9);
  }
  for (const a of sorted) {
    if (a.ready > 0) bubble(ctx, S, a.x, a.y, SPECIES[a.species].product, t, a.ready, false);
    else if (a.fed < 30) bubble(ctx, S, a.x, a.y, SPECIES[a.species].food, t, 0, true);
  }

  for (let i = view.fx.length - 1; i >= 0; i--) {
    const f = view.fx[i];
    const p = (t - f.t0) / 900;
    if (p >= 1) { view.fx.splice(i, 1); continue; }
    ctx.globalAlpha = 1 - p * p;
    icon(ctx, S, f.icon, f.x - 6, f.y - 34 - p * 18, 12);
    ctx.globalAlpha = 1;
  }
}

/** Qué hay bajo el dedo: la burbuja de recolección tiene prioridad. */
export function hitTest(w, lx, ly) {
  const front = w.animals.filter((a) => a.corral === 'pradera').sort((a, b) => b.y - a.y);
  for (const a of front) {
    if (a.ready > 0 && lx >= a.x - 11 && lx <= a.x + 11 && ly >= a.y - 60 && ly <= a.y - 35) return { animal: a, bubble: true };
  }
  for (const a of front) {
    if (lx >= a.x - 14 && lx <= a.x + 14 && ly >= a.y - 30 && ly <= a.y + 4) return { animal: a, bubble: false };
  }
  return null;
}
