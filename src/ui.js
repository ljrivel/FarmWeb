// Interfaz en DOM: barra superior, tarjeta del animal, paneles y avisos.
// Todo el texto dinámico se inserta con textContent / nodos de texto (nunca innerHTML).

import { TUTORIAL_STEPS, stepSkipped, nextIndex, stepDone } from './tutorial.js';
import {
  SPECIES, ORDER, FOODS, PRODUCTS, QUESTS, SCENES, LETTERS, CHAPTERS, CHARACTERS, EPILOGUE, SECRETS, SECRET_ORDER, BALANCE, CORRAL_TYPES, corralTypeOf,
  rarityOf, rarityLabel, MAX_HEARTS, DISEASES,
} from './data.js';
import { spriteRow } from './render.js';
import * as sim from './sim.js';
import { activeQuest, progress, rewardText, activeSide, doneSide, sideProgress } from './quests.js';

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of kids.flat()) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

const $ = (id) => document.getElementById(id);
const plural = (n, one, many) => (n === 1 ? one : many);
/** Lugares usados y disponibles sumando todos los corrales construidos. */
const totals = (w) => sim.corralInfo(w).filter((c) => c.built)
  .reduce((t, c) => ({ used: t.used + c.used, capacity: t.capacity + c.capacity }), { used: 0, capacity: 0 });
const fmtTime = (ms) => {
  const s = Math.max(1, Math.ceil(ms / 1000));
  return s >= 60 ? `${Math.ceil(s / 60)} min` : `${s} s`;
};

export function createUI(app) {
  const S = () => app.sprites;
  const W = () => app.w;

  // ---------------------------------------------------------------- sprites DOM
  function icon(name, z = 2) {
    const n = Object.keys(S().icons.index).length;
    const i = S().icons.index[name];
    const el = h('span', { class: 'ico', 'aria-hidden': 'true' });
    el.style.cssText = `width:${16 * z}px;height:${16 * z}px;background-image:url(${S().urls.icons});` +
      `background-size:${16 * n * z}px ${16 * z}px;background-position:-${i * 16 * z}px 0;`;
    return el;
  }
  function portrait(species, variant, stage, z = 2, shiny = false) {
    const rows = Object.keys(S().animals.rows).length;
    const row = spriteRow(S().animals.rows, species, variant, shiny, stage);
    const el = h('span', { class: 'ico portrait', 'aria-hidden': 'true' });
    el.style.cssText = `width:${32 * z}px;height:${32 * z}px;background-image:url(${S().urls.animals});` +
      `background-size:${32 * 4 * z}px ${32 * rows * z}px;background-position:0 -${row * 32 * z}px;`;
    return el;
  }
  function fillSlots() {
    document.querySelectorAll('[data-icon]').forEach((el) => el.replaceChildren(icon(el.dataset.icon, 2)));
  }

  // ----------------------------------------------------------------- toast
  let toastTimer = 0;
  function toast(msg, kind = 'ok', onTap = null) {
    if (!msg) return;
    const el = $('toast');
    el.textContent = msg;
    el.className = `toast show ${kind}${onTap ? ' tap' : ''}`;
    if (kind === 'warn') app.audio?.play('warn');
    el.onclick = onTap ? () => { el.className = 'toast'; onTap(); } : null;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast'; el.onclick = null; }, onTap ? 5000 : 2800);
  }

  /** «Gato naranja»; el brillante no repite su rareza aquí porque ya lleva su etiqueta. */
  const kindName = (a) => SPECIES[a.species].nombre + (a.shiny ? '' : ` ${SPECIES[a.species].variants[a.variant].toLowerCase()}`);
  const stageName = (a) => (a.stage === 'baby' ? 'bebé' : 'adulto');
  /** Etiqueta de rareza; los comunes no llevan. */
  const rarityBadge = (a) => (rarityOf(a) === 'comun' ? null
    : h('span', { class: `rarity ${rarityOf(a)}`, text: rarityLabel(a) }));

  const heartsText = (a) => `Corazones ${a.hearts} de ${MAX_HEARTS}`;
  /** Corazones: forma llena/vacía (no solo color) y el texto «Corazones N de 5» para lectores de pantalla. */
  const hearts = (a) => h('span', { class: 'hearts', title: heartsText(a) },
    h('span', { 'aria-hidden': 'true', text: '♥'.repeat(a.hearts) + '♡'.repeat(MAX_HEARTS - a.hearts) }),
    h('span', { class: 'visually-hidden', text: heartsText(a) }));
  /** Aviso de enfermedad con icono y texto. */
  const sickNote = (a, full) => (!a.sick ? '' : h('div', { class: 'sick-note', role: 'status' },
    icon(DISEASES[a.sick].icon, 1),
    h('div', { class: 'grow' },
      h('strong', { text: `Enfermo: ${DISEASES[a.sick].nombre}` }),
      full && h('div', { class: 'small', text: `${DISEASES[a.sick].hint} No produce ni crece hasta curarse.` })),
    full && btn('Veterinaria', () => openPanel('vet'), { key: `vet-${a.id}`, icon: icon('vet', 1) })));

  // ------------------------------------------------------------- barras vivas
  function bar(kind, a) {
    const label = kind === 'fed' ? 'Saciedad' : 'Felicidad';
    const v = Math.round(kind === 'fed' ? a.fed : a.happy);
    const fill = h('i');
    fill.style.width = `${v}%`;
    return h('div', { class: 'meter' },
      h('span', { class: 'meter-label', text: label }),
      h('div', { class: `bar ${kind}`, role: 'progressbar', 'aria-label': `${label} de ${a.name}`, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(v), 'data-bar': kind, 'data-id': String(a.id) }, fill));
  }
  function liveInfo(a) {
    const sp = SPECIES[a.species];
    if (a.sick) return `Está enfermo (${DISEASES[a.sick].nombre.toLowerCase()}): no ${a.stage === 'baby' ? 'crece' : 'produce'}.`;
    if (a.stage === 'baby') return a.fed > 0 ? `Será adulto en ~${fmtTime(sp.grow - a.growth)}` : 'Tiene hambre y no crece.';
    if (a.ready >= BALANCE.maxReady) return 'Ya no le caben más productos: ¡recógelos!';
    if (a.fed <= 0) return 'Con hambre no produce.';
    if (a.happy < 30) return 'Está triste: dale comida y mimos.';
    const rate = (a.happy >= 60 ? 1 : 0.5) * sim.heartBonus(a);
    return `Próximo ${PRODUCTS[sp.product].nombre.toLowerCase()} en ~${fmtTime((sp.prod - a.prod) / rate)}`;
  }
  function updateLive() {
    document.querySelectorAll('[data-bar]').forEach((el) => {
      const a = sim.find(W(), Number(el.dataset.id));
      if (!a) return;
      const v = Math.round(el.dataset.bar === 'fed' ? a.fed : a.happy);
      el.firstChild.style.width = `${v}%`;
      el.setAttribute('aria-valuenow', String(v));
    });
    document.querySelectorAll('[data-live="info"]').forEach((el) => {
      const a = sim.find(W(), Number(el.dataset.id));
      if (a) el.textContent = liveInfo(a);
    });
  }

  // --------------------------------------------------------------- HUD
  function refreshHud() {
    const w = W();
    $('coins').textContent = String(w.coins);
    const q = activeQuest(w);
    const chip = $('questChip');
    if (!q) {
      $('questTitle').textContent = 'Historia completa';
      $('questProg').textContent = 'Quedan secundarias y secretos';
      chip.classList.remove('done');
    } else {
      const p = progress(w, q);
      $('questTitle').textContent = q.title;
      $('questProg').textContent = p.done ? '¡Reclama tu premio!' : `${p.current}/${p.target}`;
      chip.classList.toggle('done', p.done);
    }
    const sideReady = activeSide(w).filter((x) => sideProgress(w, x).done).length;
    if (sideReady) $('questProg').textContent += ` · ${sideReady} ${plural(sideReady, 'secundaria lista', 'secundarias listas')}`;
    $('giftChip').hidden = !sim.giftReady(w);
    document.querySelector('[data-goto="mapa"]')?.classList.toggle('on', app.scene === 'mapa');
    const ready = w.animals.reduce((n, a) => n + a.ready, 0);
    $('collectAll').hidden = ready === 0;
    $('readyCount').textContent = String(ready);
    const here = app.scene === 'mapa' ? null : sim.corralInfo(w).find((c) => c.built && c.id === app.scene);
    if (here) $('spaceInfo').textContent = `${here.nombre} ${here.used}/${here.capacity}`;
    else {
      const { used } = totals(w);
      $('spaceInfo').textContent = `${used} ${plural(used, 'animal', 'animales')}`;
    }
    const sickHere = here ? w.animals.filter((a) => a.corral === here.id && a.sick).length : 0;
    const label = here
      ? `Corral ${here.nombre}.${sickHere ? ` ${sickHere} ${plural(sickHere, 'animal enfermo', 'animales enfermos')}.` : ''} Toca un animal para cuidarlo o usa el menú de abajo.`
      : 'Mapa de la granja. Toca un lugar para visitarlo o construirlo.';
    if ($('game').getAttribute('aria-label') !== label) $('game').setAttribute('aria-label', label);
  }

  // ----------------------------------------------------- tarjeta del animal
  let selectedSig = '';
  function refreshSelected() {
    const root = $('selected');
    const w = W();
    const a = app.selectedId ? sim.find(w, app.selectedId) : null;
    if (!a) {
      if (app.selectedId) app.selectedId = null;
      root.hidden = true;
      selectedSig = '';
      return;
    }
    const sig = JSON.stringify([a.id, a.stage, a.ready > 0, a.petCd > 0, a.fed >= 95, w.foods, a.name, a.named, a.hearts, a.sick]);
    root.hidden = false;
    if (sig === selectedSig) return;
    selectedSig = sig;
    const sp = SPECIES[a.species];
    const foods = Object.keys(FOODS).filter((f) => w.foods[f] > 0);
    root.replaceChildren(
      h('div', { class: 'sel-head' },
        portrait(a.species, a.variant, a.stage, 2, a.shiny),
        h('div', { class: 'sel-title' },
          h('h2', { text: a.name }),
          h('p', { class: 'muted' }, `${kindName(a)} · ${stageName(a)} `, rarityBadge(a)),
          hearts(a),
          h('p', { class: 'small', 'data-live': 'info', 'data-id': String(a.id), text: liveInfo(a) })),
        h('button', { class: 'btn small', type: 'button', 'aria-label': 'Cerrar tarjeta', onclick: () => { app.selectedId = null; refresh(); } }, '✕')),
      sickNote(a, true),
      h('div', { class: 'meters' }, bar('fed', a), bar('happy', a)),
      h('div', { class: 'actions' },
        a.ready > 0 && h('button', { class: 'btn primary', type: 'button', onclick: () => app.collect(a.id) },
          icon(sp.product, 1), `Recoger ${PRODUCTS[sp.product].nombre.toLowerCase()}`),
        h('button', { class: 'btn', type: 'button', 'data-key': 'pet', disabled: a.petCd > 0, onclick: () => app.pet(a.id) },
          icon('heart', 1), a.petCd > 0 ? 'Mimado' : 'Acariciar'),
        h('button', { class: `btn${a.named === false ? ' highlight' : ''}`, type: 'button', onclick: () => askName(a.id, false) },
          a.named === false ? 'Ponle nombre' : 'Cambiar nombre')),
      foods.length
        ? h('div', { class: 'foods', role: 'group', 'aria-label': 'Dar de comer' },
          h('span', { class: 'meter-label', text: 'Dar de comer' }),
          foods.map((f) => h('button', {
            class: `btn food${sp.food === f ? ' fav' : ''}`, type: 'button', disabled: a.fed >= 95,
            'aria-label': `Dar ${FOODS[f].nombre.toLowerCase()}${sp.food === f ? ' (su favorita)' : ''}, quedan ${w.foods[f]}`,
            onclick: () => app.feed(a.id, f),
          }, icon(f, 1), h('span', { text: `×${w.foods[f]}` }), sp.food === f && h('span', { class: 'star', 'aria-hidden': 'true', text: '★' }))))
        : h('p', { class: 'muted small' }, 'No te queda comida. ',
          h('button', { class: 'link', type: 'button', onclick: () => openPanel('shop', 'food') }, 'Compra en la tienda')),
    );
  }

  // ------------------------------------------------------------------ hojas
  let current = null; // { name, title, render }
  let lastFocus = null;
  const backdrop = () => $('backdrop');
  const body = () => $('sheetBody');

  function openSheet(name, title, render, opts = {}) {
    current = { name, title, render, keep: !!opts.keep };
    $('sheetTitle').textContent = title;
    body().replaceChildren(render());
    if (backdrop().hidden) { lastFocus = document.activeElement; app.audio?.play('open'); }
    backdrop().hidden = false;
    document.body.classList.add('sheet-open');
    (opts.focus ? opts.focus() : $('sheetClose').focus());
  }
  function closeSheet() {
    if (!current) return;
    current = null;
    app.audio?.play('close');
    backdrop().hidden = true;
    document.body.classList.remove('sheet-open');
    // si el elemento de antes desapareció (p. ej. la tarjeta se redibujó), el foco vuelve a la barra de abajo
    if (lastFocus?.isConnected && lastFocus.focus) lastFocus.focus();
    else document.querySelector('#dock button')?.focus();
  }
  function refreshSheet() {
    if (!current || current.keep) return; // el diálogo de nombre no se redibuja: se perdería lo que se escribe
    const key = document.activeElement?.dataset?.key;
    const top = body().scrollTop;
    body().replaceChildren(current.render());
    body().scrollTop = top;
    if (key) body().querySelector(`[data-key="${CSS.escape(key)}"]`)?.focus();
  }
  function trapTab(e) {
    if (e.key === 'Escape' && current) { e.preventDefault(); closeSheet(); return; }
    if (e.key !== 'Tab' || !current) return;
    const f = [...backdrop().querySelectorAll('button:not([disabled]), input, [href], select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter((el) => !el.closest('[hidden]'));
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  const btn = (text, onclick, opts = {}) => h('button', {
    class: `btn ${opts.cls || ''}`, type: 'button', disabled: opts.disabled, 'data-key': opts.key, onclick,
  }, opts.icon, text);
  const row = (...kids) => h('div', { class: 'row' }, ...kids);
  const price = (n) => h('span', { class: 'price' }, icon('coin', 1), String(n));

  // ---- diálogo para ponerle o cambiarle el nombre a un animal
  function askName(id, isNew) {
    const a = sim.find(W(), id);
    if (!a) return;
    const input = h('input', {
      type: 'text', class: 'text', id: 'animalName', maxlength: '24', value: a.name,
      autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false', 'aria-describedby': 'animalNameHint',
    });
    const save = () => app.renameAnimal(id, input.value);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); save(); } });
    const content = h('div', { class: 'name-dialog' },
      h('div', { class: 'name-head' },
        portrait(a.species, a.variant, a.stage, 3, a.shiny),
        h('p', { class: 'muted' }, `${kindName(a)} · ${stageName(a)} `, rarityBadge(a))),
      h('label', { class: 'meter-label', for: 'animalName', text: 'Nombre' }), input,
      h('p', { id: 'animalNameHint', class: 'muted small', text: 'Hasta 24 letras. Puedes cambiarlo cuando quieras.' }),
      h('div', { class: 'actions' },
        btn('Guardar nombre', save, { cls: 'primary', key: 'name-save' }),
        btn('Dejar este nombre', closeSheet, { key: 'name-keep' })));
    openSheet('name', isNew || a.named === false ? 'Ponle nombre' : 'Cambiar nombre', () => content, {
      keep: true, focus: () => { input.focus(); input.select(); },
    });
  }

  // ---- panel: animales (agrupados por corral)
  let animalsTab = 'mios';
  function panelAnimals() {
    const tabBar = h('div', { class: 'tabs', role: 'tablist' }, [['mios', 'Mis animales'], ['guia', 'Guía']].map(([id, label]) => h('button', {
      class: 'tab', type: 'button', role: 'tab', 'aria-selected': String(animalsTab === id), 'data-key': `tab-${id}`,
      onclick: () => { animalsTab = id; refreshSheet(); },
    }, label)));
    return h('div', null, tabBar, animalsTab === 'guia' ? panelGuide() : panelMine());
  }
  /** Guía de especies: qué es cada una, qué come, qué produce y un dato curioso; «???» hasta conocerla. */
  function panelGuide() {
    const w = W();
    return h('div', null, ORDER.map((s) => {
      const sp = SPECIES[s];
      const known = w.unlocked.includes(s);
      return row(
        known ? portrait(s, 0, 'adult', 2) : icon('candado', 2),
        h('div', { class: 'grow' },
          h('strong', { text: known ? sp.nombre : '???' }),
          h('div', { class: 'muted small', text: known ? `Vive en ${CORRAL_TYPES[corralTypeOf(s)].nombre} · le gusta ${FOODS[sp.food].nombre.toLowerCase()} · produce ${PRODUCTS[sp.product].nombre.toLowerCase()}` : 'Avanza en la historia para conocerlo.' }),
          known && h('div', { class: 'small', text: sp.dato })));
    }));
  }
  function panelMine() {
    const w = W();
    const groups = sim.corralInfo(w).filter((c) => c.built).map((c) => {
      const list = w.animals.filter((a) => a.corral === c.id).sort((a, b) => a.species.localeCompare(b.species) || a.id - b.id);
      return h('section', { class: 'group' },
        row(h('h3', { class: 'grow', text: `${c.nombre} ${c.used}/${c.capacity}` }),
          btn('Ir al corral', () => { closeSheet(); app.goTo(c.id); }, { key: `go-${c.tipo}` })),
        list.length ? list.map((a) => row(
          portrait(a.species, a.variant, a.stage, 2, a.shiny),
          h('div', { class: 'grow' },
            h('strong', { text: a.name }), ' ', hearts(a),
            h('div', { class: 'muted small', text: `${kindName(a)} · ${stageName(a)}${rarityOf(a) === 'comun' ? '' : ` · ${rarityLabel(a)}`}${a.ready ? ` · ${a.ready} listo${a.ready > 1 ? 's' : ''}` : ''}${a.named === false ? ' · sin bautizar' : ''}` }),
            sickNote(a, false),
            h('div', { class: 'meters tight' }, bar('fed', a), bar('happy', a))),
          btn('Ver', () => { closeSheet(); app.goTo(a.corral); app.selectedId = a.id; refresh(); }, { key: `ver-${a.id}` })))
          : h('p', { class: 'muted small', text: 'Aún no hay animales aquí.' }));
    });
    const { used, capacity } = totals(w);
    return h('div', null,
      h('p', { class: 'muted', text: `En la granja: ${used} de ${capacity}${w.eggs.length ? ` (incluye ${w.eggs.length} ${plural(w.eggs.length, 'huevo', 'huevos')})` : ''}` }),
      groups);
  }

  // ---- panel: tienda
  let shopTab = 'animals';
  function panelShop() {
    const w = W();
    const tabs = [['animals', 'Animales'], ['food', 'Comida'], ['corrales', 'Corrales']];
    const tabBar = h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([id, label]) => h('button', {
      class: 'tab', type: 'button', role: 'tab', 'aria-selected': String(shopTab === id), 'data-key': `tab-${id}`,
      onclick: () => { shopTab = id; refreshSheet(); },
    }, label)));
    let content;
    if (shopTab === 'animals') {
      content = ORDER.filter((s) => SPECIES[s].price != null).map((s) => {
        const sp = SPECIES[s];
        const locked = !w.unlocked.includes(s);
        const c = sim.canBuyAnimal(w, s);
        return row(
          h('span', { class: locked ? 'locked' : '' }, portrait(s, 0, 'baby', 2)),
          h('div', { class: 'grow' },
            h('strong', { text: locked ? '???' : sp.nombre }),
            h('div', { class: 'muted small', text: locked ? 'Avanza en la historia para conocerlo.' : `Vive en ${CORRAL_TYPES[corralTypeOf(s)].nombre} · le gusta ${FOODS[sp.food].nombre.toLowerCase()} · produce ${PRODUCTS[sp.product].nombre.toLowerCase()}` }),
            !c.ok && !locked && h('div', { class: 'warn small', text: c.msg })),
          price(sp.price),
          btn('Comprar', () => app.buyAnimal(s), { cls: 'primary', disabled: !c.ok, key: `buy-${s}` }));
      });
    } else if (shopTab === 'food') {
      content = Object.keys(FOODS).map((f) => {
        const fans = ORDER.filter((s) => SPECIES[s].food === f && w.unlocked.includes(s)).map((s) => SPECIES[s].nombre);
        const p = FOODS[f].price;
        return row(icon(f, 3),
          h('div', { class: 'grow' },
            h('strong', { text: FOODS[f].nombre }),
            h('div', { class: 'muted small', text: `Tienes ${w.foods[f] || 0}${fans.length ? ` · favorita de: ${fans.join(', ')}` : ''}` })),
          btn(`×1`, () => app.buyFood(f, 1), { icon: icon('coin', 1), key: `food1-${f}`, disabled: w.coins < p }),
          btn(`×5`, () => app.buyFood(f, 5), { icon: icon('coin', 1), key: `food5-${f}`, disabled: w.coins < p * 5 }),
          h('span', { class: 'muted small', text: `${p} c/u` }));
      });
    } else {
      content = sim.corralInfo(w).map((c) => row(
        icon(c.built ? 'mapa' : 'candado', 3),
        h('div', { class: 'grow' },
          h('strong', { text: c.nombre }),
          h('div', { class: 'muted small', text: c.built
            ? `Nivel ${c.nivel} · caben ${c.capacity} (${c.used} ocupados)`
            : c.buildCost == null ? 'Llega con la historia.'
              : `Hogar de ${CORRAL_TYPES[c.tipo].species.map((s) => SPECIES[s].nombre.toLowerCase()).join(', ')}.` })),
        c.built
          ? (c.upgradeCost == null ? h('span', { class: 'muted', text: 'Al máximo' }) : price(c.upgradeCost))
          : (c.buildCost != null && price(c.buildCost)),
        c.built && btn('Visitar', () => { closeSheet(); app.goTo(c.id); }, { key: `visit-${c.tipo}` }),
        c.built
          ? c.upgradeCost != null && btn('Ampliar', () => app.upgradeCorral(c.id), { cls: 'primary', disabled: w.coins < c.upgradeCost, key: `up-${c.tipo}` })
          : c.buildCost != null && btn('Construir', () => app.buildCorral(c.tipo), { cls: 'primary', disabled: w.coins < c.buildCost, key: `build-${c.tipo}` })));
    }
    return h('div', null, tabBar, h('div', { class: 'tabpanel', role: 'tabpanel' }, content));
  }

  // ---- panel: veterinaria (lista de enfermos y curar por monedas)
  function panelVet() {
    const w = W();
    const sick = w.animals.filter((a) => a.sick).sort((a, b) => a.id - b.id);
    return h('div', null,
      h('p', { class: 'muted', text: 'La Dra. Pita revisa a tus animales. Curar aquí es inmediato; en casa también se curan solos, más despacio, si están bien comidos y contentos.' }),
      sick.length ? sick.map((a) => {
        const d = DISEASES[a.sick];
        const cost = BALANCE.cureCost[a.sick];
        return row(
          portrait(a.species, a.variant, a.stage, 2, a.shiny),
          h('div', { class: 'grow' },
            h('strong', { text: a.name }),
            h('div', { class: 'small sick-line' }, icon(d.icon, 1), d.nombre),
            h('div', { class: 'muted small', text: `En ${getCorralName(a)} · ${d.hint}` })),
          price(cost),
          btn('Curar', () => app.cure(a.id), { cls: 'primary', disabled: w.coins < cost, key: `cure-${a.id}` }));
      }) : h('div', { class: 'empty' },
        icon('vet', 3),
        h('p', { text: 'Todos tus animales están sanos. ¡Buen trabajo!' })));
  }
  const getCorralName = (a) => W().corrales.find((c) => c.id === a.corral)?.nombre || '';

  // ---- panel: mochila
  function panelPack() {
    const w = W();
    const foods = Object.keys(w.foods);
    const prods = Object.keys(w.products);
    const total = prods.reduce((n, p) => n + w.products[p] * PRODUCTS[p].price, 0);
    return h('div', null,
      h('h3', { text: 'Productos' }),
      prods.length ? prods.map((p) => row(icon(p, 3),
        h('div', { class: 'grow' }, h('strong', { text: `${PRODUCTS[p].nombre} ×${w.products[p]}` }),
          h('div', { class: 'muted small', text: `${PRODUCTS[p].price} monedas cada uno` })),
        btn(`Vender (+${w.products[p] * PRODUCTS[p].price})`, () => app.sell(p), { cls: 'primary', key: `sell-${p}` })))
        : h('p', { class: 'muted', text: 'Aún no tienes productos. Toca las burbujas sobre tus animales para recogerlos.' }),
      prods.length > 1 && btn(`Vender todo (+${total})`, () => app.sellAll(), { cls: 'mint', key: 'sell-all' }),
      h('h3', { text: 'Comida' }),
      foods.length ? foods.map((f) => row(icon(f, 2), h('strong', { class: 'grow', text: `${FOODS[f].nombre} ×${w.foods[f]}` })))
        : h('p', { class: 'muted', text: 'Sin comida. Puedes comprar en la tienda.' }));
  }

  /** Retrato pixel art de un personaje (`mood`: 0 normal, 1 contento, 2 triste); sin retrato, la inicial de color. */
  function face(id, z = 2, mood = 0) {
    const c = CHARACTERS[id];
    const row = S().portraits?.index[id];
    const el = h('span', { class: 'ico face', 'aria-hidden': 'true' });
    if (row == null) {
      el.className = 'avatar';
      el.textContent = c.nombre.replace(/^(Dra\.|Don|Abuela)\s+/, '')[0];
      el.style.background = c.color;
      return el;
    }
    const cols = S().portraits.expressions.length, rows = Object.keys(S().portraits.index).length;
    el.style.cssText = `width:${32 * z}px;height:${32 * z}px;background-image:url(${S().urls.portraits});` +
      `background-size:${32 * cols * z}px ${32 * rows * z}px;background-position:-${mood * 32 * z}px -${row * 32 * z}px;background-color:${c.color}55;`;
    return el;
  }

  /** Quién habla en una misión: su retrato y su nombre y rol en texto. */
  function speaker(id, short = false, mood = 0) {
    const c = CHARACTERS[id];
    if (!c) return null;
    return h('p', { class: 'speaker' }, face(id, short ? 1 : 2, mood), h('span', null, h('strong', { text: c.nombre }), !short && h('span', { class: 'muted small', text: ` · ${c.rol}` })));
  }

  // ------------------------------------------------------------ escenas
  let storyEl = null;
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** Diálogo de una escena: toque o Enter avanzan (primero completan el texto), «Saltar» o Escape la cierran. */
  function playStory(scene, onDone) {
    let i = 0, shown = 0, timer = 0;
    const portraitBox = h('div', { class: 'story-face' });
    const nameEl = h('strong', { class: 'story-name' });
    const textEl = h('p', { class: 'story-text', 'aria-live': 'polite' });
    const next = btn('Siguiente', () => advance(), { cls: 'primary', key: 'story-next' });
    const skip = btn('Saltar', () => end(), { cls: 'small', key: 'story-skip' });
    storyEl = h('div', { class: 'story', role: 'dialog', 'aria-modal': 'true', 'aria-label': scene.title },
      h('div', { class: 'story-card' }, h('div', { class: 'story-head' }, portraitBox, nameEl),
        textEl, h('div', { class: 'story-actions' }, skip, next)));
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end(); } // sin cerrar también la hoja de debajo
      else if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === next ? skip : next).focus(); }
    };
    function line() {
      const [who, mood, text] = scene.lines[i];
      portraitBox.replaceChildren(face(who, 3, mood));
      nameEl.textContent = CHARACTERS[who]?.nombre || '';
      next.textContent = i === scene.lines.length - 1 ? 'Seguir jugando' : 'Siguiente';
      clearInterval(timer);
      shown = reduceMotion() ? text.length : 0;
      textEl.textContent = text.slice(0, shown);
      if (shown < text.length) {
        timer = setInterval(() => {
          shown++;
          textEl.textContent = text.slice(0, shown);
          if (shown >= text.length) clearInterval(timer);
        }, 22);
      }
    }
    function advance() {
      const text = scene.lines[i][2];
      if (shown < text.length) { clearInterval(timer); shown = text.length; textEl.textContent = text; return; }
      if (++i >= scene.lines.length) end(); else { app.audio?.play('tap'); line(); }
    }
    function end() {
      clearInterval(timer);
      document.removeEventListener('keydown', onKey, true);
      storyEl?.remove();
      storyEl = null;
      lastStoryFocus?.isConnected && lastStoryFocus.focus?.();
      onDone?.();
    }
    const lastStoryFocus = document.activeElement;
    document.body.append(storyEl);
    document.addEventListener('keydown', onKey, true);
    app.audio?.play('open');
    line();
    next.focus();
  }
  // ------------------------------------------------------------ tutorial
  let tutoEl = null;
  // El lienzo lógico mide 320×224 (igual que W y H de render.js).
  const LOGIC_W = 320, LOGIC_H = 224;
  /** Rectángulo en pantalla de lo que explica un paso, o null si no hay (o no se ve). */
  function tutorialRect(step) {
    if (!step.target) return null;
    if (step.target === 'animal') {
      const a = app.scene === 'mapa' ? null : W().animals.find((x) => x.corral === app.scene);
      if (!a) return null;
      const r = $('game').getBoundingClientRect();
      const k = r.width / LOGIC_W, size = 38 * k;
      return { left: r.left + a.x * k - size / 2, top: r.top + (a.y - 14) * (r.height / LOGIC_H) - size / 2, width: size, height: size };
    }
    const el = document.querySelector(step.target);
    if (!el || el.closest('[hidden]')) return null;
    const r = el.getBoundingClientRect();
    return r.width && r.height ? r : null;
  }
  /** Guía de Tomás paso a paso: ilumina lo que explica y deja pasar los toques para hacerlo de verdad. */
  function startTutorial(onDone) {
    if (tutoEl) return;
    let i = 0, base = {}, timer = 0, celebrating = 0, raf = 0;
    const faceBox = h('div', { class: 'tuto-face' });
    const textEl = h('p', { class: 'tuto-text' });
    const stepEl = h('span', { class: 'muted small' });
    const next = btn('Siguiente', () => go(), { cls: 'primary', key: 'tuto-next' });
    const skip = btn('Saltar tutorial', () => end(), { cls: 'small', key: 'tuto-skip' });
    const hole = h('div', { class: 'tuto-hole' });
    const card = h('section', { class: 'tuto-card', role: 'region', 'aria-label': 'Tutorial' },
      h('div', { class: 'tuto-head' }, faceBox, h('div', null, h('strong', { text: CHARACTERS.tomas.nombre }), h('div', null, stepEl))),
      textEl, h('div', { class: 'story-actions' }, skip, next));
    tutoEl = h('div', { class: 'tuto' }, hole, card);
    const step = () => TUTORIAL_STEPS[i];
    function place() {
      const r = tutorialRect(step());
      tutoEl.classList.toggle('dim', !r);
      hole.hidden = !r;
      if (r) {
        const pad = 6;
        Object.assign(hole.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
      }
      // la tarjeta se va al lado contrario del elemento para no taparlo
      card.classList.toggle('top', !!r && r.top + r.height / 2 > innerHeight / 2);
    }
    function begin() {
      const st = step();
      base = { fed: W().stats.fed, petted: W().stats.petted };
      celebrating = 0;
      if (current) closeSheet();
      if (st.act === 'select') { app.selectedId = null; refresh(); }
      faceBox.replaceChildren(face('tomas', 2, st.mood || 0));
      textEl.textContent = st.text;
      stepEl.textContent = `Paso ${i + 1} de ${TUTORIAL_STEPS.length}`;
      next.disabled = false;
      next.textContent = st.act ? 'Saltar paso' : (nextIndex(i, W()) >= TUTORIAL_STEPS.length ? 'Terminar' : 'Siguiente');
      place();
    }
    function go() {
      i = nextIndex(i, W());
      if (i >= TUTORIAL_STEPS.length) end(); else begin();
    }
    function tick() {
      if (!tutoEl) return;
      const st = step();
      if (st.needsCard && !app.selectedId) { // el jugador cerró la tarjeta: se vuelve a abrir la de un animal
        const a = W().animals.find((x) => x.corral === app.scene) || W().animals[0];
        if (a) { if (a.corral !== app.scene) app.goTo(a.corral, true); app.selectedId = a.id; refresh(); }
      }
      if (!celebrating && stepDone(st, { w: W(), selectedId: app.selectedId, base })) {
        next.disabled = true;
        textEl.textContent = '¡Muy bien!';
        celebrating = setTimeout(() => { if (tutoEl) go(); }, 900);
      }
    }
    function end() {
      clearInterval(timer);
      clearTimeout(celebrating);
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      tutoEl?.remove();
      tutoEl = null;
      onDone?.();
    }
    const onKey = (e) => { if (e.key === 'Escape' && !e.defaultPrevented) end(); }; // la hoja abierta se cierra primero
    document.body.append(tutoEl);
    document.addEventListener('keydown', onKey);
    i = TUTORIAL_STEPS.findIndex((st) => !stepSkipped(st, W()));
    begin();
    timer = setInterval(tick, 250);
    const follow = () => { if (!tutoEl) return; place(); raf = requestAnimationFrame(follow); }; // el recuadro sigue al elemento aunque se mueva o cambie de tamaño
    follow();
  }
  /** Hay una hoja, una escena o el tutorial abiertos: no conviene empezar otra escena ni visita. */
  const busy = () => !!current || !!storyEl || !!tutoEl;

  // ---- panel: misiones
  let historyOpen = false;
  /** Barra de progreso de una misión (con su texto). */
  function questBar(p, label) {
    const fill = h('i');
    fill.style.width = `${(p.current / p.target) * 100}%`;
    return [
      h('div', { class: 'bar quest', role: 'progressbar', 'aria-label': label, 'aria-valuemin': '0', 'aria-valuemax': String(p.target), 'aria-valuenow': String(p.current) }, fill),
      h('p', { class: 'small', text: `Progreso: ${p.current} de ${p.target}` }),
    ];
  }
  function questsMain() {
    const w = W();
    const q = activeQuest(w);
    const card = q ? (() => {
      const p = progress(w, q);
      return h('div', { class: 'quest-card' },
        h('p', { class: 'chapter', text: `Capítulo ${q.ch} · ${CHAPTERS[q.ch]}` }),
        h('h3', { text: q.title }),
        speaker(q.who),
        h('p', { class: 'quest-text-body', text: q.text }),
        questBar(p, 'Progreso de la misión'),
        h('p', { class: 'small' }, h('strong', { text: 'Premio: ' }), rewardText(q.reward)),
        btn(p.done ? '¡Reclamar premio!' : 'Aún falta', () => app.claimQuest(), { cls: 'primary', disabled: !p.done, key: 'claim' }));
    })() : h('div', { class: 'quest-card' },
      h('p', { class: 'chapter', text: 'Epílogo' }),
      h('h3', { text: '¡Historia completa!' }),
      h('p', { text: EPILOGUE }));

    const side = activeSide(w);
    const sideCards = side.map((x) => {
      const p = sideProgress(w, x);
      return h('div', { class: `quest-card side${p.done ? ' ready' : ''}` },
        h('h4', { text: x.title }),
        speaker(x.who, true),
        h('p', { class: 'small', text: x.text }),
        questBar(p, `Progreso de ${x.title}`),
        h('div', { class: 'side-foot' },
          h('p', { class: 'small grow' }, h('strong', { text: 'Premio: ' }), rewardText(x.reward)),
          btn(p.done ? 'Reclamar' : 'Aún falta', () => app.claimSide(x.id), { cls: p.done ? 'primary' : '', disabled: !p.done, key: `side-${x.id}` })));
    });

    const done = [...QUESTS.filter((x) => w.quests.claimed[x.id]).map((x) => ['Historia', x]), ...doneSide(w).map((x) => ['Secundaria', x])];
    const history = h('details', { class: 'history', open: historyOpen },
      h('summary', null, `Historial (${done.length})`),
      done.length ? h('ul', { class: 'done-list' }, done.map(([kind, x]) => h('li', null,
        h('span', { class: 'ok', 'aria-hidden': 'true', text: '✓ ' }), x.title, h('span', { class: 'muted small', text: ` · ${kind}` }))))
        : h('p', { class: 'muted small', text: 'Aquí verás las misiones que vayas completando.' }));
    history.addEventListener('toggle', () => { historyOpen = history.open; });

    return h('div', null, card,
      h('h3', { text: `Secundarias${side.length ? ` (${side.length} activas)` : ''}` }),
      sideCards.length ? h('div', { class: 'side-list' }, sideCards)
        : h('p', { class: 'muted small', text: 'No hay secundarias activas ahora. Avanza en la historia para que aparezcan más.' }),
      secretsSection(),
      history);
  }

  let questsTab = 'misiones';
  function panelQuests() {
    const tabBar = h('div', { class: 'tabs', role: 'tablist' }, [['misiones', 'Misiones'], ['diario', 'Diario']].map(([id, label]) => h('button', {
      class: 'tab', type: 'button', role: 'tab', 'aria-selected': String(questsTab === id), 'data-key': `tab-${id}`,
      onclick: () => { questsTab = id; refreshSheet(); },
    }, label)));
    return h('div', null, tabBar, questsTab === 'diario' ? panelDiary() : questsMain());
  }

  /** Diario: las cartas de Cosi que ya llegaron y las escenas vistas, que se pueden repetir sin marcarlas de nuevo. */
  function panelDiary() {
    const w = W();
    const act = activeQuest(w)?.id;
    const letters = QUESTS.filter((q) => LETTERS.includes(q.id) && (w.quests.claimed[q.id] || q.id === act));
    const seen = SCENES.filter((sc) => w.story.seen[sc.id]);
    return h('div', null,
      h('h3', { text: `Cartas de Cosi (${letters.length} de ${LETTERS.length})` }),
      letters.length ? letters.map((q) => h('div', { class: 'quest-card side' }, h('h4', { text: q.title }), speaker(q.who, true), h('p', { class: 'small', text: q.text })))
        : h('p', { class: 'muted small', text: 'Todavía no llegó ninguna carta.' }),
      h('h3', { text: `Escenas vistas (${seen.length} de ${SCENES.length})` }),
      seen.length ? h('ul', { class: 'done-list diary' }, seen.map((sc) => h('li', null,
        h('span', { class: 'grow', text: sc.title }),
        btn('Ver otra vez', () => playStory(sc), { cls: 'small', key: `replay-${sc.id}` }))))
        : h('p', { class: 'muted small', text: 'Aquí podrás repetir las escenas de la historia.' }));
  }

  /** Logros por descubrir secretos: los encontrados con su texto, el resto como «???». */
  function secretsSection() {
    const w = W();
    const found = SECRET_ORDER.filter((id) => w.secrets[id]).length;
    return h('section', { class: 'group secrets' },
      h('h3', { text: `Secretos encontrados: ${found} de ${SECRET_ORDER.length}` }),
      h('ul', { class: 'secret-list' }, SECRET_ORDER.map((id) => (w.secrets[id]
        ? h('li', { class: 'found' }, h('strong', { text: `✦ ${SECRETS[id].title}` }), h('span', { class: 'muted small', text: ` ${SECRETS[id].text}` }))
        : h('li', { class: 'muted' }, h('span', { 'aria-hidden': 'true', text: '??? ' }), h('span', { class: 'visually-hidden', text: 'Secreto sin descubrir' }))))));
  }

  /** Etiquetas sobre los animales del corral (el seleccionado siempre muestra su nombre y su especie). */
  function labelsSection() {
    const modes = [['ninguna', 'Ninguna'], ['nombre', 'Nombre'], ['todo', 'Nombre y especie']];
    return h('section', { class: 'group', 'aria-labelledby': 'labelsTitle' },
      h('h3', { id: 'labelsTitle', text: 'Etiquetas en el corral' }),
      h('div', { class: 'tabs', role: 'group', 'aria-label': 'Etiquetas en el corral' }, modes.map(([id, label]) => h('button', {
        class: 'tab', type: 'button', 'aria-pressed': String(app.labels === id), 'data-key': `labels-${id}`, onclick: () => app.setLabels(id),
      }, label))),
      h('p', { class: 'muted small', text: 'Se guarda en este dispositivo.' }));
  }

  function tutorialSection() {
    return h('section', { class: 'group', 'aria-labelledby': 'tutoTitle' },
      h('h3', { id: 'tutoTitle', text: 'Tutorial' }),
      row(h('div', { class: 'grow muted small', text: 'Tomás te enseña otra vez lo básico de la granja.' }),
        btn('Ver otra vez', () => { closeSheet(); app.startTutorial(); }, { key: 'tuto-replay' })));
  }

  // ---- sección de sonido del panel Mundo (se guarda en este dispositivo, no en el archivo del mundo)
  function soundSection() {
    const { muted, volume } = app.audio.prefs;
    const pct = Math.round(volume * 100 / 5) * 5;
    const out = h('output', { class: 'muted small', for: 'volume', id: 'volumeOut', text: `${pct} %` });
    const slider = h('input', { type: 'range', id: 'volume', class: 'range', min: '0', max: '100', step: '5', value: String(pct), 'aria-valuetext': `${pct} por ciento` });
    // sin redibujar la hoja mientras se arrastra: se perdería el control
    slider.addEventListener('input', () => {
      const v = Number(slider.value);
      app.audio.setVolume(v / 100);
      out.textContent = `${v} %`;
      slider.setAttribute('aria-valuetext', `${v} por ciento`);
    });
    slider.addEventListener('change', () => app.audio.play('tap'));
    return h('section', { class: 'group', 'aria-labelledby': 'soundTitle' },
      h('h3', { id: 'soundTitle', text: 'Sonido' }),
      row(
        h('div', { class: 'grow' }, h('strong', { text: muted ? 'Sonido: silenciado' : 'Sonido: activado' }),
          h('div', { class: 'muted small', text: 'Efectos y voces de los animales.' })),
        h('button', {
          class: `btn${muted ? '' : ' mint'}`, type: 'button', 'aria-pressed': String(!muted), 'data-key': 'sound-toggle',
          onclick: () => { app.audio.setMuted(!muted); refreshSheet(); if (muted) app.audio.play('tap'); },
        }, muted ? 'Activar' : 'Silenciar')),
      h('div', { class: 'volume-row' },
        h('label', { class: 'meter-label', for: 'volume', text: 'Volumen' }), slider, out));
  }

  // ---- panel: mundo
  let worldView = 'main'; // main | confirmNew | { import: world }
  function panelWorld() {
    const w = W();
    if (worldView === 'confirmNew') {
      return h('div', { class: 'confirm' },
        h('h3', { text: '¿Empezar un mundo nuevo?' }),
        h('p', { text: `Se reemplazará «${w.name}». Si quieres conservarlo, descárgalo primero.` }),
        h('div', { class: 'actions' },
          btn('Descargar este mundo', () => app.download(), { key: 'dl-first' }),
          btn('Sí, empezar de nuevo', () => { worldView = 'main'; app.newWorld(); }, { cls: 'primary', key: 'new-yes' }),
          btn('Cancelar', () => { worldView = 'main'; refreshSheet(); }, { key: 'new-no' })));
    }
    if (worldView && worldView.import) {
      const n = worldView.import;
      return h('div', { class: 'confirm' },
        h('h3', { text: '¿Cargar este mundo?' }),
        h('p', { text: `«${n.name}»: ${n.animals.length} ${plural(n.animals.length, 'animal', 'animales')}, ${n.coins} monedas.` }),
        h('p', { text: `Reemplazará tu mundo actual «${w.name}» (${w.animals.length} ${plural(w.animals.length, 'animal', 'animales')}).` }),
        h('div', { class: 'actions' },
          btn('Sí, cargar', () => { const next = worldView.import; worldView = 'main'; app.replaceWorld(next); }, { cls: 'primary', key: 'imp-yes' }),
          btn('Cancelar', () => { worldView = 'main'; refreshSheet(); }, { key: 'imp-no' })));
    }
    const input = h('input', { type: 'file', accept: '.json,.farmweb.json,application/json', class: 'visually-hidden', id: 'fileInput', tabindex: '-1' });
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;
      try {
        worldView = { import: await app.readFile(file) };
        refreshSheet();
      } catch (err) {
        toast(err.message, 'warn');
      }
    });
    const nameInput = h('input', { type: 'text', class: 'text', id: 'worldName', maxlength: '40', value: w.name, 'aria-label': 'Nombre de la granja' });
    nameInput.addEventListener('change', () => { app.rename(nameInput.value); });
    return h('div', null,
      h('label', { class: 'meter-label', for: 'worldName', text: 'Nombre de la granja' }), nameInput,
      soundSection(),
      labelsSection(),
      tutorialSection(),
      row(h('div', { class: 'grow' }, h('strong', { text: 'Jugadores' }),
        h('div', { class: 'muted small', text: `${w.players.length} de ${w.maxPlayers} · modo local en este dispositivo` })),
        h('span', { class: 'muted small', text: 'La nube con cuentas llega pronto' })),
      h('p', { class: 'muted small', text: `Guardado automático en este navegador${app.lastSaved ? ` · último: ${new Date(app.lastSaved).toLocaleTimeString()}` : ''}.` }),
      h('div', { class: 'actions col' },
        btn('Guardar ahora', () => app.saveNow(true), { key: 'save' }),
        btn('Descargar mundo', () => app.download(), { cls: 'primary', key: 'download' }),
        btn('Cargar mundo desde archivo', () => input.click(), { key: 'upload' }),
        btn('Empezar mundo nuevo', () => { worldView = 'confirmNew'; refreshSheet(); }, { key: 'new' })),
      input);
  }

  const PANELS = {
    animals: ['Tus animales', panelAnimals],
    shop: ['Tienda', panelShop],
    pack: ['Mochila', panelPack],
    quests: ['Misiones', panelQuests],
    vet: ['Veterinaria', panelVet],
    world: ['Mundo', panelWorld],
  };
  function openPanel(name, tab) {
    if (name === 'shop' && tab) shopTab = tab;
    if (name === 'world') worldView = 'main';
    const [title, render] = PANELS[name];
    openSheet(name, title, render);
  }

  // -------------------------------------------------------------- general
  function refresh() {
    refreshHud();
    refreshSelected();
    refreshSheet();
    updateLive();
  }
  function tickLight() {
    refreshHud();
    refreshSelected();
    updateLive();
  }

  function init() {
    fillSlots();
    document.querySelectorAll('[data-panel]').forEach((b) => b.addEventListener('click', () => openPanel(b.dataset.panel)));
    document.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => app.goTo(b.dataset.goto)));
    $('questChip').addEventListener('click', () => openPanel('quests'));
    $('collectAll').addEventListener('click', () => app.collectAll());
    $('giftChip').addEventListener('click', () => app.claimGift());
    $('sheetClose').addEventListener('click', closeSheet);
    backdrop().addEventListener('click', (e) => { if (e.target === backdrop()) closeSheet(); });
    document.addEventListener('keydown', trapTab);
  }

  return { init, refresh, tickLight, toast, openPanel, closeSheet, icon, askName, playStory, startTutorial, busy };
}
