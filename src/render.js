// Dibujo en Canvas 2D. Lienzo lógico de 320x224 (20x14 tiles de 16 px) escalado
// a un múltiplo entero de píxeles de pantalla para que el pixel art quede nítido.
// Hay dos tipos de escena: el mapa de la granja y cada corral (según su tipo).

import { BALANCE, SPECIES, CORRAL_TYPES, CORRAL_TYPE_ORDER, MAP_SPOTS, VET_SPOT, DISEASES, spriteKey } from './data.js';
import { getCorral } from './state.js';
import { corralStatus } from './sim.js';

export const W = 320;
export const H = 224;
const COLS = 20, ROWS = 14;
const INK = '#5b4256';
const CREAM = '#fffdf8';
const PLACE = 48; // tamaño de cada lugar del mapa
const MAP_HIT = 56; // área de toque de cada lugar

const loadImg = (src) => new Promise((res, rej) => {
  const i = new Image();
  i.onload = () => res(i);
  i.onerror = () => rej(new Error('No se pudo cargar ' + src));
  i.src = src;
});
const loadJson = (src) => fetch(src, { cache: 'no-cache' }).then((r) => {
  if (!r.ok) throw new Error('No se pudo cargar ' + src);
  return r.json();
});

export async function loadSprites() {
  // El JSON se revalida siempre (barato); la imagen lleva ?v=<hash> para no mezclar un PNG viejo con el JS nuevo.
  const names = ['animals', 'icons', 'tiles', 'places', 'portraits'];
  const metas = await Promise.all(names.map((n) => loadJson(`assets/sprites/${n}.json`)));
  const urls = Object.fromEntries(names.map((n, i) => [n, `assets/sprites/${n}.png${metas[i].version ? `?v=${metas[i].version}` : ''}`]));
  const imgs = await Promise.all(names.map((n) => loadImg(urls[n])));
  const [animals, icons, tiles, places, portraits] = metas;
  const [animalsImg, iconsImg, tilesImg, placesImg, portraitsImg] = imgs;
  return { animalsImg, iconsImg, tilesImg, placesImg, portraitsImg, animals, icons, tiles, places, portraits, urls };
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

// ------------------------------------------------------------------ suelos
/** Rellena todo el lienzo con tres variantes de un mismo suelo, repartidas sin patrón evidente. */
function field(ctx, S, [plain, flowers, tufts]) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const h = (c * 37 + r * 17 + c * r * 3) % 10;
      tile(ctx, S, h < 2 ? flowers : h < 4 ? tufts : plain, c * 16, r * 16);
    }
  }
}

function entrance(ctx, S) {
  for (let r = 11; r < ROWS; r++) { tile(ctx, S, 'path', 9 * 16, r * 16); tile(ctx, S, 'path', 10 * 16, r * 16); }
}

function fence(ctx, S, sides = true) {
  for (let c = 0; c < COLS; c++) {
    tile(ctx, S, 'fence_h', c * 16, 0);
    if (c !== 9 && c !== 10) tile(ctx, S, 'fence_h', c * 16, (ROWS - 1) * 16);
  }
  if (!sides) return;
  for (let r = 1; r < ROWS - 1; r++) { tile(ctx, S, 'fence_v', 0, r * 16); tile(ctx, S, 'fence_v', (COLS - 1) * 16, r * 16); }
}

const GROUND = {
  pradera(ctx, S) {
    field(ctx, S, ['grass0', 'grass1', 'grass2']);
    entrance(ctx, S);
    fence(ctx, S);
  },
  bosque(ctx, S) {
    field(ctx, S, ['moss', 'grass1', 'moss']);
    entrance(ctx, S);
    fence(ctx, S, false);
    for (let c = 0; c < COLS; c++) { tile(ctx, S, 'tree', c * 16, 0); tile(ctx, S, 'tree', c * 16 + (c % 2 ? 6 : -6), 14); }
    for (let r = 2; r < ROWS - 1; r++) { tile(ctx, S, 'tree', 0, r * 16); tile(ctx, S, 'tree', (COLS - 1) * 16, r * 16); }
  },
  estanque(ctx, S) {
    field(ctx, S, ['grass0', 'grass1', 'grass2']);
    for (let r = 5; r <= 13; r++) for (let c = 2; c <= 17; c++) tile(ctx, S, 'sand', c * 16, r * 16);
    for (let r = 6; r <= 12; r++) for (let c = 3; c <= 16; c++) tile(ctx, S, 'water', c * 16, r * 16);
    entrance(ctx, S);
    fence(ctx, S);
  },
  jurasico(ctx, S) {
    field(ctx, S, ['fern', 'fern', 'grass2']);
    for (const [c, r] of [[2, 5], [3, 5], [16, 5], [17, 6], [2, 12], [17, 12], [1, 8]]) tile(ctx, S, 'rock', c * 16, r * 16);
    entrance(ctx, S);
    fence(ctx, S);
  },
  valle(ctx, S) {
    field(ctx, S, ['fern', 'grass2', 'fern']);
    for (const [c, r] of [[3, 4], [16, 4], [1, 7], [18, 9], [4, 12], [15, 12]]) tile(ctx, S, 'rock', c * 16, r * 16);
    for (const [c, r] of [[8, 3], [11, 3], [2, 10], [17, 5]]) tile(ctx, S, 'fern', c * 16, r * 16);
    entrance(ctx, S);
    fence(ctx, S);
  },  estacion(ctx, S) {
    field(ctx, S, ['metal', 'metal_luz', 'metal_junta']);
    for (let c = 0; c < COLS; c++) { tile(ctx, S, 'estrella', c * 16, 0); if (c !== 9 && c !== 10) tile(ctx, S, 'estrella', c * 16, (ROWS - 1) * 16); }
    for (let r = 1; r < ROWS - 1; r++) { tile(ctx, S, 'estrella', 0, r * 16); tile(ctx, S, 'estrella', (COLS - 1) * 16, r * 16); }
  },
};

/** Dónde espera el visitante: sobre el camino de la entrada del corral (coordenadas lógicas). */
export const VISIT_SPOT = { x: 160, y: 190 };

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
  ctx.fillStyle = dim ? '#fff0d4' : CREAM;
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

// -------------------------------------------------------------------- mapa
/** Cartelito de texto con borde, centrado en cx. `pad` deja espacio a la izquierda para un icono. */
function pill(ctx, text, cx, y, fill = CREAM, pad = 0) {
  ctx.font = 'bold 8px monospace';
  ctx.textBaseline = 'top';
  const w = Math.ceil(ctx.measureText(text).width) + 6 + pad;
  const x = Math.round(cx - w / 2);
  ctx.fillStyle = INK;
  ctx.fillRect(x, y, w, 12);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 1, y + 1, w - 2, 10);
  ctx.fillStyle = INK;
  ctx.fillText(text, x + 3 + pad, y + 2);
  return x;
}

function badge(ctx, text, cx, cy, fill) {
  pill(ctx, text, cx, Math.round(cy) - 6, fill);
}

function drawMap(ctx, S, w, t) {
  field(ctx, S, ['grass0', 'grass1', 'grass2']);
  const a = MAP_SPOTS.pradera, b = MAP_SPOTS.bosque, c = MAP_SPOTS.estanque, d = MAP_SPOTS.jurasico;
  const road = (x0, y0, x1, y1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / 16;
    for (let i = 0; i <= n; i++) tile(ctx, S, 'path', Math.round(x0 + ((x1 - x0) * i) / n) - 8, Math.round(y0 + ((y1 - y0) * i) / n) - 8);
  };
  const midY = Math.round((a.y + d.y) / 2);
  road(d.x, d.y, a.x, a.y);
  road(b.x, b.y, c.x, c.y);
  road(a.x, midY, b.x, midY);
  pill(ctx, 'Mapa de la granja', W / 2, 10);
  road(VET_SPOT.x, VET_SPOT.y + 20, VET_SPOT.x, midY);
  {
    const { x, y } = VET_SPOT;
    const col = S.places.index.vet;
    if (col != null) ctx.drawImage(S.placesImg, col * PLACE, 0, PLACE, PLACE, Math.round(x - PLACE / 2), Math.round(y - PLACE / 2), PLACE, PLACE);
    pill(ctx, 'Veterinaria', x, y + 26);
    const sick = w.animals.filter((a) => a.sick).length;
    if (sick > 0) badge(ctx, String(sick), x + 24, y - 4, '#ffe3ea');
  }

  CORRAL_TYPE_ORDER.forEach((tipo, i) => {
    const { x, y } = MAP_SPOTS[tipo];
    const type = CORRAL_TYPES[tipo];
    const built = getCorral(w, tipo);
    const bob = built ? Math.round(Math.sin(t / 500 + i * 1.7)) : 0;
    const col = S.places.index[built ? tipo : `${tipo}_bloq`];
    ctx.drawImage(S.placesImg, col * PLACE, 0, PLACE, PLACE, Math.round(x - PLACE / 2), Math.round(y - PLACE / 2) + bob, PLACE, PLACE);
    if (built) {
      const st = corralStatus(w, built.id);
      pill(ctx, `${type.nombre} ${st.used}/${st.capacity}`, x, y + 26);
      if (st.ready > 0) badge(ctx, String(st.ready), x + 18, y - 22 + bob, '#ff8fb0');
      if (st.hungry > 0) badge(ctx, '!', x - 20, y - 22 + bob, '#ffd95e');
    } else {
      icon(ctx, S, 'candado', x + 8, y - 28, 16);
      pill(ctx, type.nombre, x, y + 26);
      if (type.cost == null) pill(ctx, 'Historia', x, y + 39, '#fff0d4');
      else icon(ctx, S, 'coin', pill(ctx, String(type.cost), x, y + 39, '#fff0d4', 10) + 2, y + 39, 12);
    }
  });
}

// ------------------------------------------------------------------ dibujo
/** Visitante de la granja: su retrato sube desde abajo, con un «!» que late; se desvanece antes de irse. */
function drawVisit(ctx, S, view, corralId, t) {
  const v = view.visit;
  const row = v && v.corral === corralId ? S.portraits?.index[v.v.who] : null;
  if (row == null) return;
  const age = t - v.t0, left = BALANCE.visitStayMs - age;
  const p = Math.min(1, age / 800);
  const x = VISIT_SPOT.x, y = Math.round(VISIT_SPOT.y + (1 - p) * (1 - p) * 40);
  ctx.globalAlpha = Math.max(0, Math.min(1, left / 3000));
  shadow(ctx, x, y, 1.4);
  ctx.drawImage(S.portraitsImg, 32, row * 32, 32, 32, x - 16, y - 30, 32, 32);
  if (p === 1) pill(ctx, '!', x, y - 44 + Math.round(Math.sin(t / 250) * 1.5), '#ffe3ea');
  ctx.globalAlpha = 1;
}

export function draw(ctx, S, w, view, t) {
  ctx.imageSmoothingEnabled = false;
  if (view.scene === 'mapa') { drawMap(ctx, S, w, t); return; }

  const corral = getCorral(w, view.scene) || getCorral(w, 'pradera');
  GROUND[corral.tipo](ctx, S);
  const here = (x) => x.corral === corral.id;

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
    const row = spriteRow(S.animals.rows, a.species, a.variant, a.shiny, a.stage);
    const frame = idle[(Math.floor(t / 220) + a.id * 3) % idle.length];
    if (a.sick) ctx.globalAlpha = 0.82; // enfermo: un poco apagado, con su icono al lado
    ctx.drawImage(S.animalsImg, a.sick ? 0 : frame * 32, row * 32, 32, 32, x - 16, y - 29, 32, 32);
    ctx.globalAlpha = 1;
    if (a.sick) {
      icon(ctx, S, DISEASES[a.sick].icon, x - 19, y - 30 + Math.round(Math.sin(t / 500 + a.id)), 12);
      if (a.id === view.selectedId) pill(ctx, DISEASES[a.sick].nombre, x, y + 18, '#ffe3ea');
    }
    if (a.shiny && Math.sin(t / 180 + a.id) > -0.3) icon(ctx, S, 'destello', x + 7, y - 33 + Math.round(Math.sin(t / 400)), 9);
  }
  for (const a of sorted) { // etiquetas: la del animal seleccionado siempre; las demás según la preferencia
    const sel = a.id === view.selectedId;
    if (!sel && !(view.labels === 'nombre' || view.labels === 'todo')) continue;
    const withKind = sel || view.labels === 'todo';
    pill(ctx, withKind ? `${a.name} · ${SPECIES[a.species].nombre}` : a.name, Math.round(a.x), Math.round(a.y) + 5, sel ? '#ffe9a8' : CREAM);
  }
  drawVisit(ctx, S, view, corral.id, t);
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

/** Qué hay bajo el dedo en un corral: la burbuja de recolección tiene prioridad. */
/** Fila del atlas para un animal; si falta el color (atlas viejo o mundo raro) usa el color 0 de su especie. */
export function spriteRow(rows, species, variant, shiny, stage) {
  return rows[spriteKey(species, variant, shiny, stage)] ?? rows[`${species}:0:${stage}`] ?? 0;
}

/** ¿El toque cae sobre el visitante que espera en este corral? */
export function hitVisit(view, lx, ly, corralId) {
  const v = view.visit;
  return !!v && v.corral === corralId && lx >= VISIT_SPOT.x - 16 && lx <= VISIT_SPOT.x + 16 && ly >= VISIT_SPOT.y - 48 && ly <= VISIT_SPOT.y + 4;
}

export function hitTest(w, lx, ly, corralId) {
  const front = w.animals.filter((a) => a.corral === corralId).sort((a, b) => b.y - a.y);
  for (const a of front) {
    if (a.ready > 0 && lx >= a.x - 11 && lx <= a.x + 11 && ly >= a.y - 60 && ly <= a.y - 35) return { animal: a, bubble: true };
  }
  for (const a of front) {
    if (lx >= a.x - 14 && lx <= a.x + 14 && ly >= a.y - 30 && ly <= a.y + 4) return { animal: a, bubble: false };
  }
  return null;
}

/** Qué lugar del mapa está bajo el dedo (construido o no, o 'vet' para la Veterinaria), o null. */
export function hitMap(w, lx, ly) {
  const half = MAP_HIT / 2;
  if (Math.abs(lx - VET_SPOT.x) <= half && Math.abs(ly - VET_SPOT.y) <= half) return 'vet';
  return CORRAL_TYPE_ORDER.find((tipo) => {
    const { x, y } = MAP_SPOTS[tipo];
    return Math.abs(lx - x) <= half && Math.abs(ly - y) <= half;
  }) || null;
}
