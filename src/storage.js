// Guardado. La interfaz { load, save } es lo único que usa el juego, así que la nube
// (Supabase) se enchufa después reemplazando `store` sin tocar el resto.

import { exportWorldText, importWorldText } from './state.js';
import { VERSION } from './data.js';

// El nombre de la clave se conserva (no es la versión del formato): cambiarlo dejaría huérfanos los guardados.
const KEY = 'farmweb:world:v1';
const MAX_FILE_BYTES = 2 * 1024 * 1024;

/** Antes de que un guardado de formato viejo se sobrescriba, conserva su texto original (una sola vez). */
function keepBackup(raw) {
  try {
    const v = JSON.parse(raw).version;
    if (!(v < VERSION)) return;
    const key = `${KEY}:respaldo-v${v}`;
    if (localStorage.getItem(key) === null) localStorage.setItem(key, raw);
  } catch {
    /* sin espacio o ilegible: el respaldo es un extra, no debe impedir jugar */
  }
}

export const localStore = {
  async load() {
    let raw = null;
    try {
      raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const world = importWorldText(raw);
      keepBackup(raw);
      return world;
    } catch (err) {
      console.warn('Guardado local ilegible; se conserva una copia.', err);
      try { if (raw) localStorage.setItem(KEY + ':corrupto', raw); } catch { /* sin espacio */ }
      return null;
    }
  },
  async save(world) {
    try {
      localStorage.setItem(KEY, exportWorldText(world));
      return true;
    } catch {
      return false;
    }
  },
};

export let store = localStore;

export function worldFileName(world, now = new Date()) {
  const slug = world.name.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'granja';
  const d = now.toISOString().slice(0, 10);
  return `${slug}-${d}.farmweb.json`;
}

export function downloadWorld(world) {
  const blob = new Blob([exportWorldText(world)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = worldFileName(world);
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readWorldFile(file) {
  if (file.size > MAX_FILE_BYTES) throw new Error('El archivo es demasiado grande para ser un mundo.');
  return importWorldText(await file.text());
}
