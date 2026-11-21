# FarmWeb

Juego web de granja, **tierno y familiar** (hasta 4 jugadores). Cría gallinas, gatos, vacas, mapaches, chanchitos, ajolotes y hasta dinosaurios bebé (carnotauro y spinosaurus), con misiones, historia por capítulos y pixel art propio. Funciona en el navegador del móvil y de la PC.

## Estado (v0.1 — base jugable)

- Granja jugable: alimentar, acariciar, recoger productos, vender, comprar animales, criar y ampliar el corral.
- 8 especies con 2 colores, bebé y adulto, animadas (respirar y parpadear).
- Misiones de historia, capítulos 1 a 4.
- Guardado automático en el navegador, **descarga y carga del mundo** en un archivo `.farmweb.json` (con suma de verificación).
- Progreso sin conexión (hasta 8 horas).
- Pendiente: cuentas y nube (Supabase), mundo compartido de hasta 4 personas, publicación en Cloudflare Pages, sonido, capítulo 5.

El diseño completo está en [`docs/DISENO.md`](docs/DISENO.md). Vista previa del arte: [`docs/preview-sprites.png`](docs/preview-sprites.png).

## Probar en local

Sin dependencias ni compilación. Necesita un servidor estático (los módulos ES no funcionan abriendo `index.html` directamente). Hay uno incluido:

- **Windows:** doble clic en `iniciar.bat`.
- **Cualquier sistema:** `node tools/serve.mjs` (o `npm start`; puerto opcional: `node tools/serve.mjs 9000`).

Al arrancar imprime dos direcciones: `http://localhost:8080` para la PC y `http://<IP-de-tu-PC>:8080` para el celular conectado al mismo Wi-Fi. La primera vez, Windows pregunta si permites el acceso en redes privadas: acepta. Cada dispositivo guarda su propio mundo (se puede pasar de uno a otro con *Descargar mundo / Cargar mundo*).

## Pruebas

```bash
npm test                          # lógica del juego (Node 20+, sin dependencias)
python3 tools/e2e_smoke.py        # prueba en navegador real (Chrome + Playwright), móvil y PC
python3 tools/gen_sprites.py      # regenera el pixel art (Python + Pillow)
```

## Estructura

```
index.html, styles.css   Interfaz
src/                     Juego: data (datos), state, sim (reglas), quests, storage, render, ui, main
assets/                  Sprites generados (animales 32x32, iconos y tiles 16x16)
tools/                   Generador de sprites y prueba de humo en navegador
tests/                   Pruebas de la lógica
docs/                    Diseño y vista previa
```

## Publicación

Es un sitio estático: en Cloudflare Pages se conecta este repositorio, sin comando de compilación y con el directorio de salida en la raíz (`/`).
