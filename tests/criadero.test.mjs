// Criadero: construir y mejorar, parejas en nidos, huevos en incubadora, calor, ausentes y compra de dinosaurios.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE, QUESTS, SPECIES, MIN } from '../src/data.js';
import { newWorld, addAnimal, addCorral, validateWorld } from '../src/state.js';
import * as sim from '../src/sim.js';

const DOS = (w, species = 'gallina') => {
  const a = addAnimal(w, species, 0, 'adult'), b = addAnimal(w, species, 1, 'adult');
  for (const x of [a, b]) { x.fed = 90; x.happy = 90; }
  return [a, b];
};
/** Mundo en el capítulo 2 (el Criadero ya se puede construir) con dos gallinas adultas listas y monedas. */
const listo = () => {
  const w = newWorld('T', 1, 1);
  for (const q of QUESTS) { if (q.id === 'c2-mapache') break; w.quests.claimed[q.id] = true; }
  w.animals = [];
  w.coins = 10_000;
  return w;
};
const correr = (w, ms, paso = 5000) => { const ev = []; for (let t = 0; t < ms; t += paso) ev.push(...sim.tick(w, Math.min(paso, ms - t))); return ev; };

test('una partida nueva trae el Criadero sin construir y los corrales en cría automática', () => {
  const w = newWorld('T', 1, 1);
  assert.deepEqual(w.criadero, { built: false, level: 0, lanes: [] });
  assert.ok(w.corrales.every((c) => c.breed === 'auto'));
  assert.ok(w.animals.every((a) => a.away === false));
});

test('el Criadero se abre en el capítulo 2, cuesta monedas y se mejora hasta el nivel 4', () => {
  const w = newWorld('T', 1, 1);
  w.coins = 99_999;
  assert.equal(sim.buildCriadero(w).ok, false, 'en el capítulo 1 todavía no');
  const l = listo();
  l.coins = BALANCE.criaderoCost - 1;
  assert.equal(sim.buildCriadero(l).ok, false, 'sin monedas no');
  l.coins = 10_000;
  assert.ok(sim.buildCriadero(l).ok);
  assert.equal(l.coins, 10_000 - BALANCE.criaderoCost);
  assert.equal(sim.buildCriadero(l).ok, false, 'no se construye dos veces');
  for (let n = 0; n < BALANCE.criaderoUpgradeCosts.length; n++) {
    assert.equal(sim.criaderoInfo(l).slots, BALANCE.criaderoSlots[n]);
    assert.ok(sim.upgradeCriadero(l).ok);
  }
  assert.equal(sim.criaderoInfo(l).level, 4);
  assert.equal(sim.upgradeCriadero(l).ok, false, 'el nivel máximo no se pasa');
});

test('emparejar: mismas reglas que la cría y los padres quedan ausentes', () => {
  const w = listo();
  sim.buildCriadero(w);
  const [a, b] = DOS(w);
  const gato = addAnimal(w, 'gato', 0, 'adult'); gato.fed = gato.happy = 90;
  assert.equal(sim.pairAnimals(w, a.id, gato.id).ok, false, 'otra especie');
  assert.equal(sim.pairAnimals(w, a.id, a.id).ok, false, 'el mismo animal');
  b.sick = 'resfriado';
  assert.equal(sim.pairAnimals(w, a.id, b.id).ok, false, 'enfermo');
  b.sick = null; b.fed = 10;
  assert.equal(sim.pairAnimals(w, a.id, b.id).ok, false, 'con hambre');
  b.fed = 90; b.stage = 'baby';
  assert.equal(sim.pairAnimals(w, a.id, b.id).ok, false, 'una cría');
  b.stage = 'adult'; b.cool = 1000;
  assert.equal(sim.pairAnimals(w, a.id, b.id).ok, false, 'descansando');
  b.cool = 0;
  const r = sim.pairAnimals(w, a.id, b.id);
  assert.ok(r.ok, r.msg);
  assert.ok(a.away && b.away);
  assert.equal(sim.pairAnimals(w, a.id, b.id).ok, false, 'ya están en el nido');
  assert.equal(sim.eligibleParents(w, 'gallina').length, 0);
});

test('los cupos limitan las parejas y el corral lleno impide emparejar', () => {
  const w = listo();
  sim.buildCriadero(w);
  const [a, b] = DOS(w); const [c, d] = DOS(w);
  assert.ok(sim.pairAnimals(w, a.id, b.id).ok);
  assert.match(sim.pairAnimals(w, c.id, d.id).msg, /cupos/);
  sim.upgradeCriadero(w);
  assert.ok(sim.pairAnimals(w, c.id, d.id).ok);
  const lleno = listo();
  sim.buildCriadero(lleno);
  const [e, f] = DOS(lleno);
  while (sim.hasSpace(lleno, 'pradera')) addAnimal(lleno, 'vaca', 0, 'baby');
  assert.match(sim.pairAnimals(lleno, e.id, f.id).msg, /espacio/);
});

test('nido, huevo en incubadora y eclosión: la cría aparece en su corral y los padres vuelven con descanso', () => {
  const w = listo();
  sim.buildCriadero(w);
  const [a, b] = DOS(w);
  sim.pairAnimals(w, a.id, b.id);
  const sp = SPECIES.gallina;
  const nido = Math.max(15000, sp.breed * BALANCE.criaderoNestMul);
  correr(w, nido - 5000);
  assert.equal(w.criadero.lanes[0].phase, 'nest');
  assert.ok(a.away);
  correr(w, 10_000);
  assert.equal(w.criadero.lanes[0].phase, 'egg');
  assert.ok(!a.away && !b.away && a.cool > 0, 'los padres vuelven y descansan');
  assert.equal(w.animals.filter((x) => x.stage === 'baby').length, 0);
  const ev = correr(w, sp.breed + 10_000);
  assert.equal(w.criadero.lanes.length, 0);
  const bebe = w.animals.find((x) => x.stage === 'baby');
  assert.ok(bebe && bebe.species === 'gallina' && bebe.corral === 'pradera');
  assert.ok(ev.some((e) => e.type === 'hatch'));
  assert.equal(w.stats.bornTotal, 1);
});

test('con tiempo de sobra (sin conexión) el nido y el huevo se completan de una vez', () => {
  const w = listo();
  sim.buildCriadero(w);
  const [a, b] = DOS(w);
  sim.pairAnimals(w, a.id, b.id);
  sim.tick(w, 60 * MIN);
  assert.equal(w.criadero.lanes.length, 0);
  assert.equal(w.animals.filter((x) => x.stage === 'baby').length, 1);
});

test('mientras están en el nido, el hambre y el ánimo de los padres se pausan y no crían solos', () => {
  const w = listo();
  sim.buildCriadero(w);
  const [a, b] = DOS(w);
  const [c, d] = DOS(w, 'gato');
  sim.pairAnimals(w, a.id, b.id);
  const fed = a.fed;
  correr(w, 30_000, 1000); // el nido de la gallina dura 60 s
  assert.ok(a.away);
  assert.equal(a.fed, fed, 'la saciedad no baja en el nido');
  assert.ok(c.fed < 90, 'los demás sí van gastando');
  assert.equal(w.eggs.filter((e) => e.species === 'gallina').length, 0, 'ausentes no crían por su cuenta');
  assert.equal(sim.feed(w, a.id, 'grano').ok, false);
  assert.equal(sim.pet(w, a.id).ok, false);
  const x0 = a.x; sim.wander(w, 5000);
  assert.equal(a.x, x0, 'no caminan por el corral');
});

test('Darle calor adelanta un 20 %, hasta 3 veces y con enfriamiento', () => {
  const w = listo();
  sim.buildCriadero(w);
  const [a, b] = DOS(w);
  sim.pairAnimals(w, a.id, b.id);
  sim.tick(w, Math.max(15000, SPECIES.gallina.breed * BALANCE.criaderoNestMul) + 1);
  const l = w.criadero.lanes[0];
  assert.equal(l.phase, 'egg');
  const antes = l.left;
  assert.ok(sim.heatEgg(w, l.id).ok);
  assert.ok(Math.abs(antes - l.left - l.total * BALANCE.heatCut) < 1);
  assert.equal(sim.heatEgg(w, l.id).ok, false, 'enfriamiento');
  sim.tick(w, BALANCE.heatCooldown);
  assert.ok(sim.heatEgg(w, l.id).ok);
  sim.tick(w, BALANCE.heatCooldown);
  assert.ok(sim.heatEgg(w, l.id).ok);
  sim.tick(w, BALANCE.heatCooldown);
  assert.equal(sim.heatEgg(w, l.id).ok, false, 'máximo de calor');
});

test('mejorar el Criadero acorta los tiempos', () => {
  const t = (nivel) => {
    const w = listo();
    sim.buildCriadero(w);
    for (let n = 0; n < nivel; n++) sim.upgradeCriadero(w);
    const [a, b] = DOS(w);
    sim.pairAnimals(w, a.id, b.id);
    return w.criadero.lanes[0].total;
  };
  assert.ok(t(4) < t(2) && t(2) < t(0));
});

test('los animales no crían solos: sin Criadero no hay huevos ni crías', () => {
  const w = listo();
  DOS(w);
  correr(w, 10 * MIN, 1000);
  assert.equal(w.eggs.length, 0);
  assert.equal(w.stats.breedStarted, 0);
});

test('guardar y cargar conserva el Criadero y limpia lo que no cuadra', () => {
  const w = listo();
  sim.buildCriadero(w);
  sim.upgradeCriadero(w);
  const [a, b] = DOS(w); const [c, d] = DOS(w);
  sim.pairAnimals(w, a.id, b.id);
  sim.tick(w, 1000);
  const v = validateWorld(JSON.parse(JSON.stringify(w)), 0);
  assert.equal(v.criadero.level, 1);
  assert.equal(v.criadero.lanes.length, 1);
  assert.equal(v.animals.filter((x) => x.away).length, 2);
  const raro = JSON.parse(JSON.stringify(w));
  raro.criadero.lanes[0].a = 99999; // un padre que no existe: el cupo se descarta y nadie queda ausente
  const limpio = validateWorld(raro, 0);
  assert.equal(limpio.criadero.lanes.length, 0);
  assert.ok(limpio.animals.every((x) => !x.away));
  const sinConstruir = JSON.parse(JSON.stringify(w));
  sinConstruir.criadero.built = false;
  assert.equal(validateWorld(sinConstruir, 0).criadero.lanes.length, 0);
  assert.deepEqual(validateWorld(JSON.parse(JSON.stringify({ ...w, criadero: undefined })), 0).criadero, { built: false, level: 0, lanes: [] }, 'una partida vieja no tiene Criadero');
  assert.ok(c && d);
});

test('los 6 dinosaurios se replican en el Laboratorio una vez desbloqueados, y no se compran sueltos', () => {
  const dinos = ['carnotauro', 'spinosaurus', 'triceratops', 'estegosaurio', 'pterodactilo', 'plesiosaurio'];
  const w = newWorld('T', 1, 1);
  w.coins = 100_000;
  w.lab.built = true;
  for (const t of ['bosque', 'estanque', 'jurasico', 'valle']) addCorral(w, t);
  for (const s of dinos) {
    assert.ok(SPECIES[s].price > 0 && SPECIES[s].dna > 0, `${s} tiene precio y hebra y entra en la tienda`);
    assert.equal(sim.canReplicate(w, s).ok, false, `${s} bloqueado hasta tener su muestra`);
    w.unlocked.push(s);
    assert.equal(sim.canBuyAnimal(w, s).ok, false, `${s} ya no se compra suelto`);
    const r = sim.replicate(w, s, 0);
    assert.ok(r.animal, `${s}: ${r.msg}`);
  }
  assert.equal(w.animals.filter((a) => dinos.includes(a.species)).length, 6);
});
