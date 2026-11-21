// Sonido sintetizado con Web Audio: efectos cortos y voces de cada especie, sin archivos de audio.
// Todo es opcional: sin AudioContext, silenciado o antes del primer toque, el juego sigue igual y en silencio.

const PREFS_KEY = 'farmweb:audio:v1';
const DEFAULT_PREFS = { muted: false, volume: 0.5 };
const MAX_ACTIVE_NOTES = 8;
const EFFECT_GAP = 0.06;   // s: el mismo efecto no se repite antes
const VOICE_GAP = 1.2;     // s: la voz de una especie no se repite antes
const LEAD = 0.01;         // s de margen para programar sin cortar el arranque
const TYPES = ['sine', 'triangle', 'square', 'sawtooth', 'noise'];

// ------------------------------------------------------------------ datos
// Nota: t = inicio y d = duración (s), f0/f1 = frecuencia inicial/final (Hz), g = ganancia, lp = pasabajos opcional.
const n = (type, t, d, f0, g, extra = {}) => ({ t, d, type, f0, g, ...extra });

export const SOUNDS = {
  tap: [n('sine', 0, 0.06, 620, 0.16, { f1: 760 })],
  pet: [n('sine', 0, 0.1, 660, 0.2), n('sine', 0.07, 0.14, 880, 0.2)],
  feed: [n('noise', 0, 0.05, 1000, 0.22, { lp: 2200 }), n('noise', 0.08, 0.05, 1000, 0.2, { lp: 1800 }), n('triangle', 0.15, 0.08, 520, 0.14, { f1: 640 })],
  feedFav: [n('noise', 0, 0.05, 1000, 0.2, { lp: 2200 }), n('triangle', 0.06, 0.1, 660, 0.18), n('triangle', 0.13, 0.1, 880, 0.18), n('triangle', 0.2, 0.18, 1175, 0.18)],
  collect: [n('triangle', 0, 0.07, 988, 0.22), n('triangle', 0.07, 0.22, 1319, 0.22)],
  sell: [n('triangle', 0, 0.08, 880, 0.2), n('triangle', 0.07, 0.08, 1047, 0.2), n('triangle', 0.14, 0.24, 1319, 0.2)],
  buy: [n('sine', 0, 0.12, 440, 0.2, { f1: 660 }), n('triangle', 0.1, 0.16, 880, 0.18)],
  build: [n('triangle', 0, 0.14, 140, 0.35, { f1: 90 }), n('noise', 0.12, 0.06, 900, 0.2, { lp: 900 }), n('triangle', 0.2, 0.12, 150, 0.3, { f1: 100 }), n('sine', 0.34, 0.22, 523, 0.15)],
  upgrade: [n('triangle', 0, 0.12, 523, 0.2), n('triangle', 0.09, 0.12, 659, 0.2), n('triangle', 0.18, 0.12, 784, 0.2), n('triangle', 0.27, 0.32, 1047, 0.2)],
  quest: [n('triangle', 0, 0.12, 523, 0.2), n('triangle', 0.1, 0.12, 659, 0.2), n('triangle', 0.2, 0.12, 784, 0.2), n('triangle', 0.32, 0.45, 1047, 0.22), n('sine', 0.32, 0.45, 1319, 0.1)],
  hatch: [n('noise', 0, 0.05, 1000, 0.2, { lp: 3000 }), n('sine', 0.08, 0.1, 700, 0.18, { f1: 1000 }), n('triangle', 0.2, 0.12, 1047, 0.18), n('triangle', 0.3, 0.28, 1319, 0.2)],
  egg: [n('sine', 0, 0.14, 330, 0.22, { f1: 520 }), n('sine', 0.1, 0.1, 660, 0.12)],
  grown: [n('triangle', 0, 0.14, 523, 0.2, { f1: 659 }), n('triangle', 0.12, 0.14, 784, 0.2), n('triangle', 0.24, 0.3, 1047, 0.2)],
  named: [n('sine', 0, 0.12, 784, 0.2), n('sine', 0.1, 0.12, 988, 0.2), n('sine', 0.2, 0.32, 1175, 0.2), n('sine', 0.2, 0.32, 1568, 0.08)],
  rare: [n('sine', 0, 0.1, 1047, 0.16), n('sine', 0.08, 0.1, 1319, 0.16), n('sine', 0.16, 0.1, 1568, 0.16), n('sine', 0.24, 0.32, 2093, 0.16)],
  shiny: [n('sine', 0, 0.1, 1319, 0.15), n('sine', 0.07, 0.1, 1568, 0.15), n('sine', 0.14, 0.1, 1976, 0.15), n('sine', 0.21, 0.1, 2349, 0.15), n('triangle', 0.28, 0.45, 1047, 0.14), n('sine', 0.28, 0.45, 3136, 0.07)],
  warn: [n('triangle', 0, 0.12, 330, 0.2, { f1: 260 }), n('triangle', 0.13, 0.18, 247, 0.2)],
  map: [n('noise', 0, 0.18, 800, 0.12, { lp: 1200 }), n('sine', 0, 0.15, 392, 0.12, { f1: 523 })],
  open: [n('sine', 0, 0.09, 520, 0.14, { f1: 700 })],
  close: [n('sine', 0, 0.09, 700, 0.12, { f1: 480 })],
  // fase 2B: corazón ganado, enfermar (suave, nada alarmante) y curarse
  heart: [n('sine', 0, 0.1, 784, 0.16), n('sine', 0.08, 0.18, 1175, 0.16), n('sine', 0.08, 0.18, 1568, 0.06)],
  sick: [n('sine', 0, 0.16, 523, 0.12, { f1: 440 }), n('sine', 0.15, 0.24, 440, 0.12, { f1: 392 })],
  heal: [n('triangle', 0, 0.1, 659, 0.16), n('triangle', 0.09, 0.1, 880, 0.16), n('sine', 0.18, 0.3, 1319, 0.14)],
};

export const VOICES = {
  gallina: [n('triangle', 0, 0.05, 1500, 0.12, { f1: 1900 }), n('triangle', 0.09, 0.05, 1500, 0.12, { f1: 1900 }), n('triangle', 0.18, 0.05, 1500, 0.12, { f1: 1900 })],
  gato: [n('sine', 0, 0.18, 600, 0.16, { f1: 900 }), n('sine', 0.18, 0.3, 900, 0.16, { f1: 520 })],
  vaca: [n('sawtooth', 0, 0.7, 130, 0.18, { f1: 110, lp: 600 }), n('sine', 0, 0.7, 130, 0.14)],
  mapache: [n('triangle', 0, 0.06, 700, 0.12), n('triangle', 0.08, 0.06, 820, 0.12), n('triangle', 0.16, 0.06, 700, 0.12), n('triangle', 0.24, 0.06, 860, 0.12)],
  chanchito: [n('sawtooth', 0, 0.12, 140, 0.2, { f1: 90, lp: 500 }), n('sawtooth', 0.2, 0.12, 140, 0.2, { f1: 90, lp: 500 })],
  ajolote: [n('sine', 0, 0.07, 500, 0.14, { f1: 900 }), n('sine', 0.1, 0.07, 650, 0.14, { f1: 1100 }), n('sine', 0.2, 0.08, 420, 0.14, { f1: 800 })],
  carnotauro: [n('sawtooth', 0, 0.6, 90, 0.22, { f1: 70, lp: 400 }), n('noise', 0, 0.5, 200, 0.1, { lp: 300 })],
  spinosaurus: [n('sine', 0, 0.45, 1600, 0.12, { f1: 700 }), n('triangle', 0.04, 0.4, 1200, 0.08, { f1: 500 })],
  // conejo: dos golpecitos de nariz muy suaves; pato: un «cuac» nasal corto
  conejo: [n('sine', 0, 0.04, 1800, 0.08, { f1: 2200 }), n('sine', 0.07, 0.04, 1900, 0.08, { f1: 2300 })],
  pato: [n('square', 0, 0.12, 520, 0.07, { f1: 420, lp: 1400 }), n('square', 0.16, 0.12, 500, 0.07, { f1: 400, lp: 1400 })],
  // triceratops: bufido grave con un «uuh» detrás; estegosaurio: retumbo lento y suave
  triceratops: [n('sawtooth', 0, 0.35, 180, 0.14, { f1: 140, lp: 700 }), n('sine', 0.05, 0.3, 360, 0.08, { f1: 280 })],
  estegosaurio: [n('triangle', 0, 0.5, 110, 0.18, { f1: 90, lp: 500 }), n('sine', 0.25, 0.3, 160, 0.09)],
  // pterodáctilo: dos chillidos agudos; plesiosaurio: un canto de ballena suave que sube
  pterodactilo: [n('square', 0, 0.08, 1400, 0.07, { f1: 2000, lp: 3000 }), n('square', 0.12, 0.08, 1500, 0.07, { f1: 2200, lp: 3000 })],
  plesiosaurio: [n('sine', 0, 0.6, 300, 0.14, { f1: 520 }), n('sine', 0.1, 0.5, 450, 0.07, { f1: 700 })],
  // oveja: un «beee» con vibrato; zorro: dos ladridos agudos y cortos
  oveja: [n('sawtooth', 0, 0.45, 380, 0.1, { f1: 340, lp: 1400 }), n('sawtooth', 0.1, 0.4, 400, 0.06, { f1: 360, lp: 1400 })],
  zorro: [n('square', 0, 0.06, 900, 0.07, { f1: 1300, lp: 2500 }), n('square', 0.1, 0.06, 1000, 0.07, { f1: 1400, lp: 2500 })],
};

// ------------------------------------------------------------- programación
const finite = (x) => typeof x === 'number' && Number.isFinite(x);
const validNote = (o) => o && TYPES.includes(o.type) && finite(o.t) && o.t >= 0 && finite(o.d) && o.d > 0
  && finite(o.g) && o.g > 0 && finite(o.f0) && o.f0 > 0;

/** Programa las notas a partir de t0 y devuelve cuántas se programaron (ignora las inválidas). */
export function scheduleNotes(ctx, dest, notes, t0, noiseBuffer) {
  let count = 0;
  for (const note of notes) {
    if (!validNote(note)) continue;
    const start = t0 + note.t;
    const end = start + note.d;
    const src = note.type === 'noise' ? ctx.createBufferSource() : ctx.createOscillator();
    if (note.type === 'noise') {
      if (!noiseBuffer) continue;
      src.buffer = noiseBuffer;
      src.loop = true;
    } else {
      src.type = note.type;
      src.frequency.setValueAtTime(note.f0, start);
      if (finite(note.f1) && note.f1 > 0) src.frequency.exponentialRampToValueAtTime(note.f1, end);
    }
    const env = ctx.createGain();
    const attack = Math.min(0.01, note.d / 4);
    env.gain.setValueAtTime(0.0001, start);
    env.gain.linearRampToValueAtTime(note.g, start + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, end);
    let node = src;
    if (finite(note.lp) && note.lp > 0) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(note.lp, start);
      node = node.connect(lp);
    }
    node.connect(env);
    env.connect(dest);
    src.start(start);
    src.stop(end + 0.02);
    count++;
  }
  return count;
}

// -------------------------------------------------------------- preferencias
const clamp01 = (v) => Math.min(1, Math.max(0, v));

export function loadPrefs(storage) {
  const prefs = { ...DEFAULT_PREFS };
  try {
    const raw = JSON.parse(storage?.getItem(PREFS_KEY) ?? 'null');
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      if (raw.muted === true) prefs.muted = true;
      if (finite(raw.volume)) prefs.volume = clamp01(raw.volume);
    }
  } catch { /* JSON roto: valores por defecto */ }
  return prefs;
}

export function savePrefs(storage, prefs) {
  try { storage?.setItem(PREFS_KEY, JSON.stringify({ muted: !!prefs.muted, volume: clamp01(prefs.volume) })); } catch { /* sin espacio o bloqueado */ }
}

// ------------------------------------------------------------------- motor
export function createAudio({ storage, AudioContextClass } = {}) {
  const prefs = loadPrefs(storage);
  let ctx = null, input = null, master = null, noise = null;
  let hidden = false;
  const active = [];               // fin (en reloj del contexto) de cada nota que sigue sonando
  const lastAt = new Map();        // 'efecto:nombre' | 'voz:especie' -> último instante

  const level = () => (prefs.muted ? 0 : prefs.volume);
  const applyLevel = () => { if (master) master.gain.setTargetAtTime(level(), ctx.currentTime, 0.015); };

  function build() {
    try { buildGraph(); } catch (err) { ctx = input = master = noise = null; throw err; } // a medias: limpio y en silencio
  }
  function buildGraph() {
    ctx = new AudioContextClass();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-18, 0);
    comp.knee.setValueAtTime(24, 0);
    comp.ratio.setValueAtTime(6, 0);
    comp.attack.setValueAtTime(0.003, 0);
    comp.release.setValueAtTime(0.2, 0);
    master = ctx.createGain();
    master.gain.value = level();
    comp.connect(master);
    master.connect(ctx.destination);
    input = comp;
    const len = Math.max(1, Math.floor(ctx.sampleRate * 0.3));
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  /** Se llama dentro de un toque o tecla (los navegadores no dejan sonar antes). */
  async function unlock() {
    if (!AudioContextClass) return;
    try {
      if (!ctx) {
        build();
        // un instante de silencio dentro del gesto: algunos iPhone viejos lo piden para despertar el audio
        const s = ctx.createBufferSource();
        s.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
        s.connect(ctx.destination);
        s.start(0);
      }
      if (!hidden && ctx.state !== 'running') await ctx.resume();
    } catch { /* sin audio disponible: el juego sigue en silencio */ }
  }

  const live = () => !!ctx && !hidden && !prefs.muted && ctx.state === 'running';

  // Nunca lanza: un fallo del navegador al programar notas solo deja ese sonido sin sonar.
  function fire(key, notes, gap) {
    try { return fireUnsafe(key, notes, gap); } catch { return false; }
  }
  function fireUnsafe(key, notes, gap) {
    if (!live()) return false;
    const now = ctx.currentTime;
    if (now - (lastAt.get(key) ?? -Infinity) < gap) return false;
    while (active.length && active[0] <= now) active.shift();
    if (active.length + notes.length > MAX_ACTIVE_NOTES) return false;
    const t0 = now + LEAD;
    if (!scheduleNotes(ctx, input, notes, t0, noise)) return false;
    for (const note of notes) active.push(t0 + note.t + note.d);
    active.sort((a, b) => a - b);
    lastAt.set(key, now);
    return true;
  }

  return {
    unlock,
    play: (name) => (Object.hasOwn(SOUNDS, name) ? fire(`fx:${name}`, SOUNDS[name], EFFECT_GAP) : false),
    voice: (species) => (Object.hasOwn(VOICES, species) ? fire(`voz:${species}`, VOICES[species], VOICE_GAP) : false),
    setMuted(b) { prefs.muted = !!b; savePrefs(storage, prefs); applyLevel(); },
    setVolume(v) { if (!finite(v)) return; prefs.volume = clamp01(v); savePrefs(storage, prefs); applyLevel(); },
    setHidden(b) {
      hidden = !!b;
      if (!ctx) return;
      try { (hidden ? ctx.suspend() : ctx.resume())?.catch?.(() => {}); } catch { /* ignorar */ }
    },
    get prefs() { return { muted: prefs.muted, volume: prefs.volume }; },
    get state() { return !ctx ? 'none' : ctx.state === 'running' ? 'running' : 'suspended'; },
  };
}
