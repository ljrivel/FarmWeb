// Arranque y bucle principal: conecta simulación, dibujo, interfaz y guardado.

import { loadSprites, fit, draw, hitTest, W, H } from './render.js';
import { createUI } from './ui.js';
import * as sim from './sim.js';
import { claim } from './quests.js';
import { newWorld } from './state.js';
import { store, downloadWorld, readWorldFile } from './storage.js';
import { MAX_OFFLINE_MS, SPECIES } from './data.js';

const app = { w: null, sprites: null, selectedId: null, fx: [], lastSaved: 0, k: 1 };
const ui = createUI(app);
const $ = (id) => document.getElementById(id);

const addFx = (x, y, icon) => app.fx.push({ x, y, t0: performance.now(), icon });

function report(r, fxSpec) {
  ui.toast(r.msg, r.ok ? 'ok' : 'warn');
  if (r.ok) {
    if (fxSpec) addFx(...fxSpec);
    ui.refresh();
  }
}

// ---------------------------------------------------------------- acciones
app.feed = (id, food) => {
  const r = sim.feed(app.w, id, food);
  const a = sim.find(app.w, id);
  report(r, a && [a.x, a.y, r.fav ? 'heart' : food]);
};
app.pet = (id) => {
  const r = sim.pet(app.w, id);
  const a = sim.find(app.w, id);
  report(r, a && [a.x, a.y, 'heart']);
};
app.collect = (id) => {
  const r = sim.collect(app.w, id);
  const a = sim.find(app.w, id);
  report(r, a && r.ok && [a.x, a.y, r.product]);
};
app.collectAll = () => report(sim.collectAll(app.w));
app.buyAnimal = (s) => {
  const r = sim.buyAnimal(app.w, s);
  if (r.ok) app.selectedId = r.animal.id;
  report(r);
};
app.buyFood = (f, n) => report(sim.buyFood(app.w, f, n));
app.buyUpgrade = (k) => report(sim.buyUpgrade(app.w, k));
app.sell = (p) => report(sim.sell(app.w, p));
app.sellAll = () => {
  let gain = 0;
  for (const p of Object.keys(app.w.products)) gain += sim.sell(app.w, p).gain || 0;
  report(gain ? { ok: true, msg: `Vendiste todo por ${gain} monedas.` } : { ok: false, msg: 'No tienes nada que vender.' });
};
app.claimQuest = () => {
  const r = claim(app.w);
  if (r.ok && r.animal) app.selectedId = r.animal.id;
  report(r);
};
app.rename = (name) => {
  const n = String(name).trim().slice(0, 40);
  if (n) app.w.name = n;
  saveNow(false);
};
app.download = () => {
  downloadWorld(app.w);
  ui.toast('Descargando tu mundo…');
};
app.readFile = readWorldFile;
app.replaceWorld = (next) => {
  next.lastTick = Date.now(); // no regalar progreso por la fecha del archivo
  app.w = next;
  app.selectedId = null;
  saveNow(false);
  ui.closeSheet();
  ui.refresh();
  ui.toast(`Cargaste «${next.name}».`);
};
app.newWorld = () => {
  app.w = newWorld();
  app.selectedId = null;
  saveNow(false);
  ui.closeSheet();
  ui.refresh();
  ui.toast('¡Un mundo nuevo te espera!');
};
app.saveNow = (manual) => saveNow(manual);

async function saveNow(manual) {
  const okSave = await store.save(app.w);
  if (okSave) app.lastSaved = Date.now();
  if (manual) ui.toast(okSave ? 'Mundo guardado.' : 'No se pudo guardar: el navegador no tiene espacio.', okSave ? 'ok' : 'warn');
}

// ---------------------------------------------------------- paso del tiempo
function welcomeBack(s) {
  const parts = [];
  if (s.ready) parts.push(`${s.ready} ${s.ready === 1 ? 'producto listo' : 'productos listos'}`);
  if (s.hatch) parts.push(`${s.hatch} ${s.hatch === 1 ? 'cría nueva' : 'crías nuevas'}`);
  if (s.grown) parts.push(`${s.grown} ${s.grown === 1 ? 'animal creció' : 'animales crecieron'}`);
  return parts.length ? `¡Bienvenido de vuelta! Mientras no estabas: ${parts.join(', ')}.` : '¡Bienvenido de vuelta!';
}

function advance(now) {
  const w = app.w;
  let dt = now - w.lastTick;
  if (dt <= 0) { w.lastTick = now; return; }
  const away = dt > 60_000;
  dt = Math.min(dt, MAX_OFFLINE_MS);
  const summary = {};
  for (let left = dt; left > 0; left -= 30_000) {
    for (const e of sim.tick(w, Math.min(left, 30_000))) {
      summary[e.type] = (summary[e.type] || 0) + 1;
      if (away) continue;
      if (e.type === 'hatch') ui.toast(`¡Nació ${e.animal.name}!`);
      else if (e.type === 'egg') ui.toast(`${SPECIES[e.species].nombre} puso un huevo.`);
      else if (e.type === 'grown') ui.toast(`¡${e.animal.name} creció!`);
    }
  }
  w.lastTick = now;
  if (away) ui.toast(welcomeBack(summary));
}

// --------------------------------------------------------------- entrada
function setupCanvas(canvas) {
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    const hit = hitTest(app.w, (e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height));
    if (!hit) { app.selectedId = null; ui.refresh(); return; }
    if (hit.bubble) { app.collect(hit.animal.id); return; }
    if (app.selectedId === hit.animal.id) app.pet(hit.animal.id);
    else { app.selectedId = hit.animal.id; ui.refresh(); }
  });
}

function layout(canvas) {
  const stage = $('stage');
  const cs = getComputedStyle(stage);
  const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  const wide = stage.clientWidth >= 760; // tarjeta al lado del lienzo
  stage.classList.toggle('wide', wide);
  const availW = stage.clientWidth - padX - (wide ? 300 + 16 : 0);
  const availH = wide ? stage.clientHeight - padY : Math.max(H, stage.clientHeight - 232);
  const { k, cssW } = fit(canvas, availW, availH);
  app.k = k; // al cambiar el tamaño del lienzo el contexto se reinicia: la escala se aplica en cada cuadro
  stage.style.setProperty('--cw', `${Math.max(cssW, 300)}px`);
}

// ------------------------------------------------------------------ inicio
async function boot() {
  const loading = $('loading');
  try {
    app.sprites = await loadSprites();
    app.w = (await store.load()) || newWorld();
  } catch (err) {
    loading.textContent = 'No se pudo cargar el juego. Revisa tu conexión y recarga la página.';
    console.error(err);
    return;
  }
  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  ui.init();
  setupCanvas(canvas);
  layout(canvas);
  new ResizeObserver(() => layout(canvas)).observe($('stage'));

  advance(Date.now());
  ui.refresh();
  loading.hidden = true;
  if (!Object.keys(app.w.quests.claimed).length && app.w.stats.fed === 0) ui.toast('¡Bienvenido! Toca un animal para cuidarlo.');

  let last = performance.now();
  const frame = (t) => {
    const dt = Math.max(0, Math.min(t - last, 100)); // el primer cuadro puede llegar "antes" que `last`
    last = t;
    sim.wander(app.w, dt);
    const now = Date.now();
    if (now - app.w.lastTick >= 1000) { advance(now); ui.tickLight(); }
    ctx.setTransform(app.k, 0, 0, app.k, 0, 0);
    draw(ctx, app.sprites, app.w, app, t);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  setInterval(() => saveNow(false), 10_000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveNow(false);
    else { advance(Date.now()); ui.refresh(); }
  });
  addEventListener('pagehide', () => saveNow(false));
  if (location.search.includes('debug')) window.farmweb = { app, sim };
}

boot();
