// Minijuego «Completa la hebra» del Laboratorio: reglas puras, sin interfaz. Cada base tiene una pareja fija
// (A–T y C–G) y se distingue por color y por forma, para que no dependa solo del color.

export const BASES = {
  A: { nombre: 'Corazón', forma: '♥', color: '#ff8fa8' },
  T: { nombre: 'Estrella', forma: '★', color: '#ffd45e' },
  C: { nombre: 'Círculo', forma: '●', color: '#7fb8ff' },
  G: { nombre: 'Rombo', forma: '◆', color: '#7fd8a0' },
};
export const PAIR = { A: 'T', T: 'A', C: 'G', G: 'C' };

/** La hebra de arriba: `n` bases al azar (`rnd` devuelve 0..1). El jugador completa la de abajo con las parejas. */
export const makeStrand = (n, rnd = Math.random) => Array.from({ length: n }, () => 'ATCG'[Math.floor(rnd() * 4)]);

/** Errores que aguanta una réplica: un tercio de las bases más lo que aporte el equipo del Laboratorio. */
export const allowedErrors = (n, extra = 0) => Math.floor(n / 3) + extra;

/** perfecta (0 errores), buena (hasta lo permitido), inestable (uno más) o fallida (más). */
export const grade = (errors, allowed) => (errors === 0 ? 'perfecta' : errors <= allowed ? 'buena' : errors === allowed + 1 ? 'inestable' : 'fallida');
