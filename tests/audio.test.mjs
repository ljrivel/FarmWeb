import test from 'node:test';
import assert from 'node:assert/strict';
import { ORDER } from '../src/data.js';
import { SOUNDS, VOICES, scheduleNotes, loadPrefs, savePrefs, createAudio } from '../src/audio.js';

// ---- AudioContext falso: registra nodos y deja controlar el reloj
function makeParam(v = 0) {
  return { value: v, calls: [],
    setValueAtTime(x, t) { this.calls.push(['set', x, t]); return this; },
    linearRampToValueAtTime(x, t) { this.calls.push(['lin', x, t]); return this; },
    exponentialRampToValueAtTime(x, t) { this.calls.push(['exp', x, t]); return this; },
    setTargetAtTime(x) { this.value = x; return this; },
    cancelScheduledValues() { return this; } };
}
function makeNode(ctx, kind, extra = {}) {
  const n = { kind, ctx, outs: [], connect(o) { this.outs.push(o); return o; }, disconnect() {}, ...extra };
  ctx.nodes.push(n);
  return n;
}
function makeFake() {
  const instances = [];
  class FakeContext {
    constructor() {
      this.currentTime = 0; this.state = 'suspended'; this.sampleRate = 44100; this.nodes = []; this.resumes = 0; this.suspends = 0;
      this.destination = makeNode(this, 'destination');
      instances.push(this);
    }
    createOscillator() { const n = makeNode(this, 'osc', { type: 'sine', frequency: makeParam(), starts: [], stops: [], start(t) { this.starts.push(t); }, stop(t) { this.stops.push(t); } }); return n; }
    createBufferSource() { return makeNode(this, 'noise', { buffer: null, loop: false, starts: [], stops: [], start(t) { this.starts.push(t); }, stop(t) { this.stops.push(t); } }); }
    createGain() { return makeNode(this, 'gain', { gain: makeParam(1) }); }
    createBiquadFilter() { return makeNode(this, 'filter', { type: 'lowpass', frequency: makeParam(), Q: makeParam() }); }
    createDynamicsCompressor() { return makeNode(this, 'comp', { threshold: makeParam(), knee: makeParam(), ratio: makeParam(), attack: makeParam(), release: makeParam() }); }
    createBuffer(ch, len, rate) { return { numberOfChannels: ch, length: len, sampleRate: rate, getChannelData: () => new Float32Array(len) }; }
    resume() { this.resumes++; this.state = 'running'; return Promise.resolve(); }
    suspend() { this.suspends++; this.state = 'suspended'; return Promise.resolve(); }
  }
  return { FakeContext, instances };
}
const sources = (ctx) => ctx.nodes.filter((n) => n.kind === 'osc' || n.kind === 'noise');
const started = (ctx) => sources(ctx).filter((n) => n.starts.length).length;
function makeStorage(initial) {
  const m = new Map(initial ? Object.entries(initial) : []);
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
}
async function ready(opts = {}) {
  const { FakeContext, instances } = makeFake();
  const storage = opts.storage || makeStorage();
  const audio = createAudio({ storage, AudioContextClass: FakeContext });
  if (!opts.locked) await audio.unlock();
  return { audio, ctx: instances[0], instances, storage };
}

const EFFECTS = ['tap', 'pet', 'feed', 'feedFav', 'collect', 'sell', 'buy', 'build', 'upgrade', 'quest', 'hatch', 'egg', 'grown', 'named', 'rare', 'shiny', 'warn', 'map', 'open', 'close', 'heart', 'sick', 'heal'];

test('SOUNDS y VOICES tienen exactamente los nombres pedidos y cada nota es válida', () => {
  assert.deepEqual(Object.keys(SOUNDS).sort(), [...EFFECTS].sort());
  assert.deepEqual(Object.keys(VOICES).sort(), [...ORDER].sort());
  assert.equal(ORDER.length, 10);
  const all = { ...Object.fromEntries(Object.entries(SOUNDS)), ...Object.fromEntries(Object.entries(VOICES).map(([k, v]) => [`voz ${k}`, v])) };
  for (const [name, notes] of Object.entries(all)) {
    assert.ok(notes.length >= 1 && notes.length <= 6, `${name}: de 1 a 6 notas (caben en el tope de 8)`);
    let end = 0;
    for (const n of notes) {
      assert.ok(['sine', 'triangle', 'square', 'sawtooth', 'noise'].includes(n.type), `${name}: tipo ${n.type}`);
      assert.ok(n.t >= 0, `${name}: t >= 0`);
      assert.ok(n.d > 0 && n.d <= 1.5, `${name}: 0 < d <= 1.5 (${n.d})`);
      assert.ok(n.g > 0 && n.g <= 0.6, `${name}: 0 < g <= 0.6 (${n.g})`);
      assert.ok(n.f0 >= 40 && n.f0 <= 4000, `${name}: f0 en 40..4000 (${n.f0})`);
      if (n.f1 !== undefined) assert.ok(n.f1 >= 40 && n.f1 <= 4000, `${name}: f1 en 40..4000`);
      if (n.lp !== undefined) assert.ok(n.lp >= 100 && n.lp <= 12000, `${name}: lp razonable`);
      end = Math.max(end, n.t + n.d);
    }
    assert.ok(end <= 2.5, `${name}: dura ${end.toFixed(2)} s (máximo 2.5)`);
  }
});

test('scheduleNotes programa cada nota con envolvente sin clics y devuelve cuántas', async () => {
  const { FakeContext } = makeFake();
  const ctx = new FakeContext();
  const dest = ctx.createGain();
  const buf = ctx.createBuffer(1, 100, 44100);
  const n = scheduleNotes(ctx, dest, [
    { t: 0, d: 0.2, type: 'sine', f0: 440, f1: 880, g: 0.3 },
    { t: 0.1, d: 0.1, type: 'noise', f0: 1000, g: 0.2, lp: 1500 },
    { t: 0, d: -1, type: 'sine', f0: 440, g: 0.2 },        // inválida: se ignora
    { t: 0, d: 0.1, type: 'raro', f0: 440, g: 0.2 },       // tipo inválido: se ignora
  ], 5, buf);
  assert.equal(n, 2);
  const osc = sources(ctx).find((s) => s.kind === 'osc');
  const noise = sources(ctx).find((s) => s.kind === 'noise');
  assert.deepEqual(osc.starts, [5]);
  assert.ok(osc.stops[0] > 5.2 && osc.stops[0] < 5.3, 'se detiene justo después de la nota');
  assert.equal(noise.buffer, buf);
  const gains = ctx.nodes.filter((x) => x.kind === 'gain' && x !== dest);
  for (const g of gains) {
    const first = g.gain.calls[0];
    assert.equal(first[0], 'set');
    assert.ok(first[1] < 0.001, 'la ganancia arranca casi en silencio (sin clic)');
    assert.ok(g.gain.calls.some((c) => c[0] === 'exp' && c[1] < 0.001), 'y termina casi en silencio');
  }
});

test('antes de unlock no suena ni crea contexto', async () => {
  const { audio, instances } = await ready({ locked: true });
  assert.equal(audio.state, 'none');
  assert.equal(audio.play('tap'), false);
  assert.equal(audio.voice('gato'), false);
  assert.equal(instances.length, 0, 'no se creó ningún AudioContext');
});

test('unlock crea el contexto, lo reanuda y deja sonar', async () => {
  const { audio, ctx, instances } = await ready();
  assert.equal(instances.length, 1);
  assert.equal(audio.state, 'running');
  assert.ok(ctx.resumes >= 1);
  assert.equal(audio.play('tap'), true);
  assert.ok(started(ctx) >= 1);
  await audio.unlock();
  assert.equal(instances.length, 1, 'un segundo unlock no crea otro contexto');
});

test('un nombre que no existe no suena (ni «constructor» ni «__proto__»)', async () => {
  const { audio } = await ready();
  for (const n of ['nada', 'constructor', '__proto__', 'toString', '']) assert.equal(audio.play(n), false, n);
  for (const n of ['nada', 'constructor', '__proto__', 'dragon']) assert.equal(audio.voice(n), false, n);
});

test('silenciado no crea nodos y al quitar el silencio vuelve a sonar', async () => {
  const { audio, ctx } = await ready();
  audio.setMuted(true);
  const before = ctx.nodes.length;
  assert.equal(audio.play('quest'), false);
  assert.equal(audio.voice('vaca'), false);
  assert.equal(ctx.nodes.length, before, 'no se crearon nodos');
  assert.equal(audio.prefs.muted, true);
  audio.setMuted(false);
  ctx.currentTime += 1;
  assert.equal(audio.play('quest'), true);
});

test('sin AudioContext no falla', async () => {
  const audio = createAudio({ storage: makeStorage(), AudioContextClass: undefined });
  await audio.unlock();
  assert.equal(audio.state, 'none');
  assert.equal(audio.play('tap'), false);
  assert.equal(audio.voice('gato'), false);
  audio.setMuted(true); audio.setVolume(0.2); audio.setHidden(true); audio.setHidden(false);
  const boom = createAudio({ storage: makeStorage(), AudioContextClass: class { constructor() { throw new Error('no'); } } });
  await boom.unlock();
  assert.equal(boom.state, 'none');
  assert.equal(boom.play('tap'), false);
});

test('50 veces play(tap) en el mismo instante suena una sola vez', async () => {
  const { audio, ctx } = await ready();
  const base = started(ctx);
  let ok = 0;
  for (let i = 0; i < 50; i++) if (audio.play('tap')) ok++;
  assert.equal(ok, 1);
  assert.equal(started(ctx) - base, SOUNDS.tap.length);
  ctx.currentTime += 0.1;
  assert.equal(audio.play('tap'), true, 'pasados 60 ms vuelve a sonar');
});

test('20 efectos distintos a la vez no pasan de 8 notas activas, y al terminar caben otra vez', async () => {
  const { audio, ctx } = await ready();
  const base = started(ctx);
  const sonaron = EFFECTS.filter((e) => audio.play(e));
  assert.ok(sonaron.length >= 1);
  assert.ok(started(ctx) - base <= 8, `se programaron ${started(ctx) - base} notas (máximo 8)`);
  assert.ok(sonaron.length < EFFECTS.length, 'algunos se descartaron');
  ctx.currentTime += 3;
  assert.equal(audio.play('quest'), true, 'pasado el sonido, vuelve a haber lugar');
});

test('la voz de una especie no se repite antes de 1200 ms, pero otra especie sí suena', async () => {
  const { audio, ctx } = await ready();
  assert.equal(audio.voice('gato'), true);
  ctx.currentTime += 1.0;
  assert.equal(audio.voice('gato'), false);
  assert.equal(audio.voice('gallina'), true);
  ctx.currentTime += 0.3;
  assert.equal(audio.voice('gato'), true);
});

test('oculta la pestaña: se suspende, no suena y al volver se reanuda', async () => {
  const { audio, ctx } = await ready();
  audio.setHidden(true);
  assert.equal(ctx.suspends, 1);
  assert.equal(audio.play('tap'), false);
  audio.setHidden(false);
  assert.equal(audio.state, 'running');
  ctx.currentTime += 1;
  assert.equal(audio.play('tap'), true);
  const { audio: a2, instances } = await ready({ locked: true });
  a2.setHidden(true); a2.setHidden(false);
  assert.equal(instances.length, 0, 'ocultar o mostrar sin unlock no crea contexto');
});

test('un compresor y la ganancia maestra con el volumen protegen la salida', async () => {
  const { audio, ctx } = await ready();
  const comp = ctx.nodes.find((n) => n.kind === 'comp');
  assert.ok(comp, 'hay compresor');
  const master = ctx.nodes.find((n) => n.kind === 'gain' && n.outs.includes(ctx.destination));
  assert.ok(master, 'hay ganancia maestra conectada a la salida');
  assert.equal(master.gain.value, 0.5, 'volumen por defecto');
  audio.setVolume(0.8);
  assert.equal(master.gain.value, 0.8);
  audio.setMuted(true);
  assert.equal(master.gain.value, 0, 'silenciar corta también lo que ya sonaba');
  audio.setMuted(false);
  assert.equal(master.gain.value, 0.8);
});

test('prefs: volumen fuera de rango se corrige, JSON roto vuelve al valor por defecto, se guarda y se recupera', async () => {
  assert.deepEqual(loadPrefs(makeStorage()), { muted: false, volume: 0.5 });
  assert.equal(loadPrefs(makeStorage({ 'farmweb:audio:v1': '{"volume":7}' })).volume, 1);
  assert.equal(loadPrefs(makeStorage({ 'farmweb:audio:v1': '{"volume":-3}' })).volume, 0);
  assert.deepEqual(loadPrefs(makeStorage({ 'farmweb:audio:v1': '{roto' })), { muted: false, volume: 0.5 });
  assert.deepEqual(loadPrefs(makeStorage({ 'farmweb:audio:v1': '[1,2]' })), { muted: false, volume: 0.5 });
  assert.deepEqual(loadPrefs(makeStorage({ 'farmweb:audio:v1': '{"volume":"fuerte","muted":"si"}' })), { muted: false, volume: 0.5 });
  assert.deepEqual(loadPrefs(null), { muted: false, volume: 0.5 });
  const st = makeStorage();
  savePrefs(st, { muted: true, volume: 0.25 });
  assert.deepEqual(loadPrefs(st), { muted: true, volume: 0.25 });
  assert.doesNotThrow(() => savePrefs(null, { muted: false, volume: 1 }));
  assert.doesNotThrow(() => savePrefs({ setItem() { throw new Error('lleno'); } }, { muted: false, volume: 1 }));
  const { audio, storage } = await ready();
  audio.setVolume(7); assert.equal(audio.prefs.volume, 1);
  audio.setVolume(-3); assert.equal(audio.prefs.volume, 0);
  audio.setVolume(Number.NaN); assert.equal(audio.prefs.volume, 0, 'un NaN no cambia el volumen');
  audio.setVolume(0.3); audio.setMuted(true);
  assert.deepEqual(loadPrefs(storage), { muted: true, volume: 0.3 });
  const otra = createAudio({ storage, AudioContextClass: makeFake().FakeContext });
  assert.deepEqual(otra.prefs, { muted: true, volume: 0.3 });
});

test('play y voice nunca lanzan aunque el contexto falle al programar', async () => {
  const { audio, ctx } = await ready();
  ctx.createOscillator = () => { throw new Error('roto'); };
  ctx.createBufferSource = () => { throw new Error('roto'); };
  assert.doesNotThrow(() => audio.play('tap'));
  ctx.currentTime += 1;
  assert.equal(audio.play('quest'), false);
  assert.equal(audio.voice('gato'), false);
});

test('si build() falla a medias el motor queda limpio y en silencio', async () => {
  const { FakeContext, instances } = makeFake();
  class Half extends FakeContext { createDynamicsCompressor() { throw new Error('a medias'); } }
  const audio = createAudio({ storage: makeStorage(), AudioContextClass: Half });
  await audio.unlock();
  assert.equal(instances.length, 1, 'se intentó crear');
  assert.equal(audio.state, 'none', 'ctx vuelve a null');
  assert.equal(audio.play('tap'), false);
  assert.doesNotThrow(() => { audio.setVolume(0.2); audio.setMuted(true); audio.setHidden(true); });
});
