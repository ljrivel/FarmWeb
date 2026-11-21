// Minijuegos de la Veterinaria (sin interfaz): cada doctora tiene el suyo.
//  - Dra. Pita: «Latidos», un juego de ritmo (tocar cuando la marca está en la zona verde).
//  - Mao Mao: «Mezcla de hierbas», un juego de deducción (elegir las dos hierbas que cubren lo que pide).

export const LATIDO = { period: 1400, zone: [0.38, 0.62] };

/** Posición (0..1) de la marca, que va y viene; `elapsed` en milisegundos desde que empezó. */
export function latidoPos(elapsed, period = LATIDO.period) {
  const t = (Math.max(0, elapsed) % (period * 2)) / period;
  return t <= 1 ? t : 2 - t;
}
export const latidoHit = (pos, zone = LATIDO.zone) => pos >= zone[0] && pos <= zone[1];

// Cada hierba tiene dos propiedades; los iconos son los de la comida del juego.
export const HERBS = [
  { id: 'bayas', nombre: 'Bayas', tags: ['dulce', 'fresca'] },
  { id: 'helecho', nombre: 'Helecho', tags: ['amarga', 'fresca'] },
  { id: 'zanahoria', nombre: 'Zanahoria', tags: ['dulce', 'suave'] },
  { id: 'grano', nombre: 'Grano', tags: ['suave', 'seca'] },
  { id: 'heno', nombre: 'Heno', tags: ['seca', 'amarga'] },
  { id: 'pescadito', nombre: 'Pescadito', tags: ['salada', 'fresca'] },
];

/** Una ronda siempre se puede resolver: lo que pide sale de dos hierbas distintas (una propiedad de cada una). */
export function herbRound(rnd = Math.random) {
  const a = HERBS[Math.floor(rnd() * HERBS.length)];
  let b;
  do { b = HERBS[Math.floor(rnd() * HERBS.length)]; } while (b === a);
  const t1 = a.tags[Math.floor(rnd() * 2)];
  const rest = b.tags.filter((t) => t !== t1);
  const t2 = rest[Math.floor(rnd() * rest.length)];
  return { need: [t1, t2], clue: `Necesito algo ${t1} y algo ${t2}.` };
}

/** ¿Las dos hierbas elegidas cubren lo que se pide? */
export function herbOk(round, ids) {
  if (ids.length !== 2 || ids[0] === ids[1]) return false;
  const chosen = ids.map((id) => HERBS.find((h) => h.id === id)).filter(Boolean);
  return chosen.length === 2 && round.need.every((t) => chosen.some((h) => h.tags.includes(t)));
}
