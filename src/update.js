// Actualización automática: la compilación publica `version.json` y el juego lo consulta de vez en cuando.
// Sin ese archivo (por ejemplo, jugando en local) no pasa nada.

export const CHECK_MS = 5 * 60 * 1000;

/** Identificador de la versión publicada, o null si no se puede leer. */
export async function fetchVersion(fetchFn = fetch) {
  try {
    const r = await fetchFn('version.json', { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    return typeof j?.v === 'string' && j.v ? j.v : null;
  } catch {
    return null;
  }
}

/** Hay una versión nueva distinta de la que se cargó al abrir. */
export const isNewer = (current, latest) => !!current && !!latest && current !== latest;
