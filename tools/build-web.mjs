// Prepara la carpeta dist/ con SOLO lo que el juego necesita para publicarse (hosting estático).
// Sin dependencias.  Uso:  npm run build        (Cloudflare Pages: comando de compilación = npm run build,
// directorio de salida = dist)

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const out = join(root, 'dist');
const INCLUDE = ['index.html', 'styles.css', '_headers', 'src', 'assets'];

for (const name of INCLUDE) {
  if (!existsSync(join(root, name))) {
    console.error(`Falta «${name}»: no se puede preparar el sitio.`);
    process.exit(1);
  }
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const name of INCLUDE) cpSync(join(root, name), join(out, name), { recursive: true });

let files = 0;
let bytes = 0;
(function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p);
    else { files++; bytes += statSync(p).size; }
  }
})(out);
console.log(`dist/ listo: ${files} archivos, ${(bytes / 1024).toFixed(0)} KB.`);
