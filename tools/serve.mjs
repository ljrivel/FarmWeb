// Servidor estático mínimo para probar FarmWeb en local y desde el celular (misma red Wi-Fi).
// Sin dependencias.  Uso:  node tools/serve.mjs [puerto]      (por defecto 8080)

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.argv[2] || process.env.PORT || 8080);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function send(res, code, body, headers = {}) {
  res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Método no permitido', { Allow: 'GET, HEAD' });
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = resolve(join(root, normalize(path)));
    if (!file.startsWith(root + sep)) return send(res, 403, 'Prohibido');
    // nada de carpetas/archivos ocultos (.git, .env…)
    if (file.slice(root.length + 1).split(sep).some((p) => p.startsWith('.'))) return send(res, 404, 'No encontrado');
    if (!(await stat(file)).isFile()) return send(res, 404, 'No encontrado');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    send(res, 404, 'No encontrado');
  }
});

server.on('error', (err) => {
  console.error(err.code === 'EADDRINUSE'
    ? `\nEl puerto ${port} ya está en uso. Prueba otro:  node tools/serve.mjs ${port + 1}\n`
    : err);
  process.exit(1);
});

server.listen(port, '0.0.0.0', () => {
  const lan = Object.values(networkInterfaces()).flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
  console.log('\n  FarmWeb está corriendo 🐔\n');
  console.log(`  En esta PC:        http://localhost:${port}`);
  for (const ip of lan) console.log(`  En tu celular:     http://${ip}:${port}   (misma red Wi-Fi)`);
  console.log('\n  Para detenerlo: Ctrl+C\n');
});
