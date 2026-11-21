// Arranque y bucle principal: conecta simulación, dibujo, interfaz y guardado.

import { loadSprites, fit, draw, hitTest, hitVisit, hitMap, W, H } from './render.js';
import { createUI } from './ui.js';
import * as sim from './sim.js';
import { claim, claimSide, syncSide, rewardText } from './quests.js';
import { newWorld, getCorral, resolveScene } from './state.js';
import { store, downloadWorld, readWorldFile } from './storage.js';
import { MAX_OFFLINE_MS, SPECIES, DISEASES, SECRETS, BALANCE, CHARACTERS, rarityOf } from './data.js';
import { createAudio } from './audio.js';
import { nextScene, pickVisit } from './story.js';

const app = { w: null, sprites: null, scene: 'pradera', selectedId: null, fx: [], lastSaved: 0, k: 1, audio: null, visit: null, nextVisitAt: 0, lastVisitor: null, labels: 'ninguna' };
// El sonido es opcional: sin localStorage o sin AudioContext el juego sigue igual, en silencio.
const safeStorage = () => { try { return window.localStorage; } catch { return null; } };
app.audio = createAudio({ storage: safeStorage(), AudioContextClass: window.AudioContext || window.webkitAudioContext });
// Preferencia de etiquetas en el corral: se guarda en este dispositivo, no dentro del mundo.
const UI_KEY = 'farmweb:ui:v1';
const LABEL_MODES = ['ninguna', 'nombre', 'todo'];
const readUi = () => { try { const o = JSON.parse(safeStorage()?.getItem(UI_KEY) || '{}'); return o && typeof o === 'object' ? o : {}; } catch { return {}; } };
const writeUi = (patch) => { try { safeStorage()?.setItem(UI_KEY, JSON.stringify({ ...readUi(), ...patch })); } catch { /* sin guardado: dura la sesión */ } };
if (LABEL_MODES.includes(readUi().labels)) app.labels = readUi().labels;
app.setLabels = (mode) => {
  if (!LABEL_MODES.includes(mode)) return;
  app.labels = mode;
  writeUi({ labels: mode });
  ui.refresh();
};
// Tutorial: se muestra la primera vez en cada dispositivo (también a quien ya tenía partida); sin guardado, una vez por sesión.
app.tutorialSeen = readUi().tutorial === true;
app.startTutorial = () => ui.startTutorial(() => { app.tutorialSeen = true; writeUi({ tutorial: true }); });
const ui = createUI(app);
const $ = (id) => document.getElementById(id);

const addFx = (x, y, icon) => app.fx.push({ x, y, t0: performance.now(), icon });

/** Avisa del resultado; si salió bien dibuja el efecto y suena `snd` (si falló, el aviso ya suena «warn»). */
function report(r, fxSpec, snd) {
  ui.toast(r.msg, r.ok ? 'ok' : 'warn');
  if (r.ok) {
    if (fxSpec) addFx(...fxSpec);
    if (snd) app.audio.play(snd);
    ui.refresh();
  }
}

// ---------------------------------------------------------------- acciones
app.feed = (id, food) => {
  const r = sim.feed(app.w, id, food);
  const a = sim.find(app.w, id);
  report(r, a && [a.x, a.y, r.fav ? 'heart' : food], r.fav ? 'feedFav' : 'feed');
  if (r.heartUp) setTimeout(() => app.audio.play('heart'), 300);
};
app.pet = (id) => {
  const r = sim.pet(app.w, id);
  const a = sim.find(app.w, id);
  report(r, a && [a.x, a.y, 'heart'], r.heartUp ? 'heart' : 'pet');
  if (r.ok && a) app.audio.voice(a.species);
};
app.collect = (id) => {
  const r = sim.collect(app.w, id);
  const a = sim.find(app.w, id);
  report(r, a && r.ok && [a.x, a.y, r.product], 'collect');
};
app.claimGift = () => {
  const r = sim.claimGift(app.w);
  ui.toast(r.ok ? `${r.msg}: ${rewardText(r.reward)}.` : r.msg, r.ok ? 'ok' : 'warn');
  if (r.ok) { app.audio.play('collect'); saveNow(false); ui.refresh(); }
};
app.collectAll = () => report(sim.collectAll(app.w), undefined, 'collect');
app.buyAnimal = (s) => {
  const r = sim.buyAnimal(app.w, s);
  if (r.ok) { app.goTo(r.animal.corral, true); app.selectedId = r.animal.id; }
  report(r, undefined, 'buy');
  if (r.ok) ui.askName(r.animal.id, true);
};
app.renameAnimal = (id, raw) => {
  const r = sim.renameAnimal(app.w, id, raw);
  report(r, undefined, 'named'); // primero se redibuja la tarjeta; así closeSheet sabe si el botón de antes sigue
  if (r.ok) ui.closeSheet();
  if (r.ok) for (const id of sim.secretsByName(r.animal)) setTimeout(() => app.secret(id), 1200);
};

/** Descubre un secreto (la primera vez avisa con su texto). */
app.secret = (id) => {
  if (!sim.discover(app.w, id)) return;
  ui.toast(`Secreto: ${SECRETS[id].title}. ${SECRETS[id].text}`, 'ok', () => ui.openPanel('quests'));
  app.audio.play('shiny');
  ui.refresh();
};
/** La ola: corazones sobre todos los animales del corral a la vista. */
function wave() {
  const here = app.w.animals.filter((a) => a.corral === app.scene);
  here.forEach((a, i) => setTimeout(() => addFx(a.x, a.y, 'heart'), i * 120));
  app.secret('konami');
}
app.cure = (id) => {
  const r = sim.cure(app.w, id);
  const a = sim.find(app.w, id);
  report(r, a && a.corral === app.scene && [a.x, a.y, 'heart'], 'heal');
};
app.buyFood = (f, n) => report(sim.buyFood(app.w, f, n), undefined, 'buy');
app.buildCorral = (tipo) => report(sim.buildCorral(app.w, tipo), undefined, 'build');
app.upgradeCorral = (id) => report(sim.upgradeCorral(app.w, id), undefined, 'upgrade');
app.sell = (p) => report(sim.sell(app.w, p), undefined, 'sell');
app.sellAll = () => {
  let gain = 0;
  for (const p of Object.keys(app.w.products)) gain += sim.sell(app.w, p).gain || 0;
  report(gain ? { ok: true, msg: `Vendiste todo por ${gain} monedas.` } : { ok: false, msg: 'No tienes nada que vender.' }, undefined, 'sell');
};
app.claimQuest = () => {
  const r = claim(app.w);
  if (r.ok && r.animal) { app.goTo(r.animal.corral, true); app.selectedId = r.animal.id; }
  report(r, undefined, 'quest');
  if (r.ok && r.animal) ui.askName(r.animal.id, true);
  const nuevas = r.ok ? syncSide(app.w) : [];
  if (nuevas.length) setTimeout(() => announceSide(nuevas), 1800); // el aviso del premio se lee primero
};
app.claimSide = (id) => report(claimSide(app.w, id), undefined, 'quest');

/** Avisa de secundarias nuevas (tocar el aviso abre Misiones). */
function announceSide(nuevas) {
  if (!nuevas.length) return;
  ui.toast(nuevas.length === 1 ? `Nueva misión secundaria: «${nuevas[0].title}».` : `¡${nuevas.length} misiones secundarias nuevas!`, 'ok', () => ui.openPanel('quests'));
  ui.refresh();
}
/** Cambia de escena ('mapa' o el id de un corral); una escena inválida vuelve a la Pradera. */
app.goTo = (scene, quiet = false) => {
  const before = app.scene;
  app.scene = resolveScene(app.w, scene);
  if (!quiet && app.scene !== before) app.audio.play('map');
  const sel = app.selectedId ? sim.find(app.w, app.selectedId) : null;
  if (!sel || sel.corral !== app.scene) app.selectedId = null;
  ui.refresh();
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
  app.scene = resolveScene(next, app.scene);
  app.selectedId = null;
  saveNow(false);
  ui.closeSheet();
  ui.refresh();
  ui.toast(`Cargaste «${next.name}».`);
};
app.newWorld = () => {
  app.w = newWorld();
  app.scene = 'pradera';
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
  const babies = [];
  for (let left = dt; left > 0; left -= 30_000) {
    for (const e of sim.tick(w, Math.min(left, 30_000), { live: !away })) {
      summary[e.type] = (summary[e.type] || 0) + 1;
      if (away) continue;
      if (e.type === 'hatch') { babies.push(e.animal); continue; }
      else if (e.type === 'egg') { ui.toast(`${SPECIES[e.species].nombre} puso un huevo.`); app.audio.play('egg'); }
      else if (e.type === 'grown') { ui.toast(`¡${e.animal.name} creció!`); app.audio.play('grown'); }
      else if (e.type === 'sick') {
        const a = e.animal;
        ui.toast(`${a.name} tiene ${DISEASES[e.disease].nombre.toLowerCase()}. Toca para verlo.`, 'ok', () => {
          if (!sim.isCurrent(app.w, a)) return;
          app.goTo(a.corral); app.selectedId = a.id; ui.refresh();
        });
        app.audio.play('sick');
      }
      else if (e.type === 'healed') { ui.toast(`¡${e.animal.name} se curó con tus cuidados!`); app.audio.play('heal'); }
    }
  }
  w.lastTick = now;
  syncSide(w); // las que aparezcan por otra vía (p. ej. al conocer una especie) empiezan a contar ya
  if (away) ui.toast(welcomeBack(summary));
  else if (babies.length) announceBirths(babies);
}

/** Un solo aviso por tanda de nacimientos; tocarlo abre el nombre de la primera cría si sigue en este mundo. */
function announceBirths(babies) {
  const a = babies[0];
  const goName = () => {
    if (!sim.isCurrent(app.w, a)) return; // se cargó otro mundo mientras tanto
    app.goTo(a.corral); app.selectedId = a.id; ui.refresh(); ui.askName(a.id, true);
  };
  ui.toast(sim.hatchToast(babies), 'ok', goName);
  app.audio.play('hatch');
  // la fanfarria de rareza llega cuando el crujido del huevo ya casi terminó (si no, el tope de notas la cortaría)
  const rars = babies.map(rarityOf);
  if (rars.includes('brillante')) setTimeout(() => app.audio.play('shiny'), 500);
  else if (rars.some((r) => r !== 'comun')) setTimeout(() => app.audio.play('rare'), 500);
}

// --------------------------------------------------------------- entrada
function setupCanvas(canvas) {
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    const lx = (e.clientX - r.left) * (W / r.width), ly = (e.clientY - r.top) * (H / r.height);
    if (app.scene === 'mapa') {
      if (Math.abs(lx - W / 2) <= 56 && ly >= 8 && ly <= 24) { tapSign(); return; } // el cartel del mapa
      const tipo = hitMap(app.w, lx, ly);
      if (!tipo) return;
      if (tipo === 'vet') ui.openPanel('vet');
      else if (getCorral(app.w, tipo)) app.goTo(tipo);
      else ui.openPanel('shop', 'corrales');
      return;
    }
    if (hitVisit(app, lx, ly, app.scene)) { app.talkVisit(); return; }
    const hit = hitTest(app.w, lx, ly, app.scene);
    if (!hit) { app.selectedId = null; ui.refresh(); return; }
    if (hit.bubble) { app.collect(hit.animal.id); return; }
    if (app.selectedId === hit.animal.id) app.pet(hit.animal.id);
    else {
      app.selectedId = hit.animal.id;
      ui.refresh();
      app.audio.play('tap');
      app.audio.voice(hit.animal.species);
    }
  });
}

// Secreto del cartel: 7 toques seguidos (con menos de 1,5 s entre uno y otro).
let signTaps = 0, signAt = 0;
function tapSign() {
  const now = performance.now();
  signTaps = now - signAt < 1500 ? signTaps + 1 : 1;
  signAt = now;
  if (signTaps >= 7) { signTaps = 0; app.secret('cartel'); }
}
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiAt = 0;
function konamiKey(e) {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  konamiAt = k === KONAMI[konamiAt] ? konamiAt + 1 : (k === KONAMI[0] ? 1 : 0);
  if (konamiAt === KONAMI.length) { konamiAt = 0; wave(); }
}
/** Cuenta la siguiente escena pendiente cuando no hay otra hoja abierta. `?sinescenas` las apaga (para las pruebas). */
const STORY_ON = !location.search.includes('sinescenas');
const TUTORIAL_ON = !location.search.includes('sintutorial');
/** El tutorial empieza cuando no hay nada abierto (en una partida nueva, tras la escena de Bruno). */
function checkTutorial() {
  if (!TUTORIAL_ON || app.tutorialSeen || document.hidden || ui.busy()) return;
  app.tutorialSeen = true; // dentro de esta sesión no vuelve a empezar; lo guardado se escribe al terminar
  ui.startTutorial(() => writeUi({ tutorial: true }));
}
function checkStory() {
  if (!STORY_ON || document.hidden || ui.busy()) return;
  const s = nextScene(app.w);
  if (!s) return;
  app.w.story.seen[s.id] = true; // se marca al empezar: si se cierra la pestaña, no se repite
  ui.playStory(s, () => saveNow(false));
}
const nextVisitDelay = () => BALANCE.visitMinMs + Math.random() * (BALANCE.visitMaxMs - BALANCE.visitMinMs);
/** Una visita llega cada 8 a 12 min a un corral a la vista, sin nada tapando; si nadie la atiende, se va sola. */
function checkVisit() {
  const now = performance.now();
  if (app.visit && now - app.visit.t0 > BALANCE.visitStayMs) app.visit = null;
  if (!STORY_ON || app.visit || document.hidden || ui.busy() || app.scene === 'mapa' || now < app.nextVisitAt) return;
  app.nextVisitAt = now + nextVisitDelay();
  const v = pickVisit(app.w, app.lastVisitor);
  if (!v) return;
  app.visit = { v, t0: now, corral: app.scene };
  app.lastVisitor = v.who;
  app.audio.play('tap');
}
app.talkVisit = () => {
  const { v } = app.visit;
  app.visit = null;
  app.w.story.talked[v.id] = true;
  ui.playStory({ id: v.id, title: `Visita de ${CHARACTERS[v.who].nombre}`, lines: v.lines }, () => saveNow(false));
};

/** Secretos que dependen del estado o de la hora (se revisan cada segundo). */
function checkSecrets() {
  for (const id of sim.secretsByState(app.w)) app.secret(id);
  if (new Date().getHours() < 5) app.secret('buho');
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
    app.scene = resolveScene(app.w, app.scene);
    syncSide(app.w);
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

  app.nextVisitAt = performance.now() + nextVisitDelay();
  advance(Date.now());
  ui.refresh();
  loading.hidden = true;
  if (!Object.keys(app.w.quests.claimed).length && app.w.stats.fed === 0) ui.toast('¡Bienvenido! Toca un animal para cuidarlo.');
  else if (STORY_ON && !(TUTORIAL_ON && !app.tutorialSeen) && sim.giftReady(app.w)) ui.toast('¡Bruno dejó una cesta para ti! Tócala para recogerla.', 'ok', () => app.claimGift());

  let last = performance.now();
  const frame = (t) => {
    const dt = Math.max(0, Math.min(t - last, 100)); // el primer cuadro puede llegar "antes" que `last`
    last = t;
    sim.wander(app.w, dt);
    const now = Date.now();
    if (now - app.w.lastTick >= 1000) { advance(now); checkSecrets(); checkStory(); checkTutorial(); checkVisit(); ui.tickLight(); }
    ctx.setTransform(app.k, 0, 0, app.k, 0, 0);
    draw(ctx, app.sprites, app.w, app, t);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  setInterval(() => saveNow(false), 10_000);
  document.addEventListener('visibilitychange', () => {
    app.audio.setHidden(document.hidden);
    if (document.hidden) saveNow(false);
    else { advance(Date.now()); ui.refresh(); }
  });
  addEventListener('pagehide', () => saveNow(false));
  // Los navegadores solo dejan sonar tras un gesto: en móvil cuenta el soltar el dedo, no el tocar, así que se prueban todos
  // (unlock es barato y no hace nada si ya está sonando; si el sistema lo interrumpe, el siguiente toque lo despierta).
  for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) {
    document.addEventListener(type, () => app.audio.unlock(), { capture: true, passive: true });
  }
  document.addEventListener('keydown', konamiKey);
  app.audio.setHidden(document.hidden);
  if (location.search.includes('debug')) window.farmweb = { app, sim, audio: app.audio };
}

boot();
