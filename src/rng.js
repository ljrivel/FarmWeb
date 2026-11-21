// Aleatorio con semilla (mulberry32). El estado vive en world.rng (un entero),
// así la simulación es determinista, se guarda con el mundo y se puede probar.

export function rand(w) {
  w.rng = (w.rng + 0x6d2b79f5) >>> 0;
  let t = w.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(w, n) {
  return Math.floor(rand(w) * n);
}

export function chance(w, p) {
  return rand(w) < p;
}
