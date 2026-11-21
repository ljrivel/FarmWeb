# FarmWeb

Juego web de granja, **tierno y familiar** (por ahora de un solo jugador; el mundo compartido queda para más adelante). Cría gallinas, gatos, vacas, mapaches, chanchitos, ajolotes y hasta dinosaurios bebé (carnotauro y spinosaurus), con misiones, historia por capítulos y pixel art propio. Funciona en el navegador del móvil y de la PC.

## Estado (v0.2 — fase 1: corrales y mapa)

- **Varios corrales y un mapa.** La granja ya no es una sola pradera: hay cuatro lugares (Pradera, Bosque, Estanque y Jurásico) y un **mapa** con un botón en la barra de abajo para viajar entre ellos tocando. Cada especie vive en su corral; cada corral tiene nivel y capacidad propios y se construye o se amplía desde *Tienda › Corrales*. El Jurásico llega con la historia.
- Granja jugable: alimentar, acariciar, recoger productos, vender, comprar animales, criar.
- 8 especies con 2 colores, bebé y adulto, animadas (respirar y parpadear).
- Misiones de historia, capítulos 1 a 4 (las metas ya pueden pedir construir un corral).
- Guardado automático en el navegador, **descarga y carga del mundo** en un archivo `.farmweb.json` (con suma de verificación).
- **Los guardados anteriores se migran solos** al formato nuevo (v2); antes de migrar se guarda un respaldo del original en el navegador (`farmweb:world:v1:respaldo-v1`). Los archivos `.farmweb.json` de la v1 también se pueden cargar.
- Progreso sin conexión (hasta 8 horas).
- Viene después (ver el plan en [`docs/superpowers/specs/`](docs/superpowers/specs/2026-11-20-farmweb-v2-diseno.md)): cuidado profundo con enfermedades y veterinaria, economía tipo Hay Day, pueblo y calendario tipo Stardew, más misiones y secundarias. Más lejos: cuentas y nube, publicación, sonido.

El diseño completo está en [`docs/DISENO.md`](docs/DISENO.md). Vista previa del arte: [`docs/preview-sprites.png`](docs/preview-sprites.png).

## Probar en local

Sin dependencias ni compilación. Necesita un servidor estático (los módulos ES no funcionan abriendo `index.html` directamente). Hay uno incluido:

- **Windows:** doble clic en `iniciar.bat`.
- **Cualquier sistema:** `node tools/serve.mjs` (o `npm start`; puerto opcional: `node tools/serve.mjs 9000`).

Al arrancar imprime dos direcciones: `http://localhost:8080` para la PC y `http://<IP-de-tu-PC>:8080` para el celular conectado al mismo Wi-Fi. La primera vez, Windows pregunta si permites el acceso en redes privadas: acepta. Cada dispositivo guarda su propio mundo (se puede pasar de uno a otro con *Descargar mundo / Cargar mundo*).

**En el celular:** abre la segunda dirección en el navegador con la PC encendida y en el mismo Wi-Fi. El mapa y los botones están pensados para tocar con el dedo; la barra de abajo cabe en pantallas de hasta 360 px de ancho.

## Pruebas

```bash
npm test                          # lógica del juego (Node 20+, sin dependencias)
python3 tools/e2e_smoke.py [carpeta]  # prueba en navegador real (Chrome + Playwright): móvil, PC, celular chico y migración v1→v2
python3 tools/gen_sprites.py      # regenera el pixel art (Python + Pillow)
```

## Estructura

```
index.html, styles.css   Interfaz
src/                     Juego: data (datos), migrate (v1→v2), state, sim (reglas), quests, storage, render (escenas y mapa), ui, main
assets/                  Sprites generados (animales 32x32, iconos y tiles 16x16, lugares del mapa 48x48)
tools/                   Generador de sprites y prueba de humo en navegador
tests/                   Pruebas de la lógica
docs/                    Diseño y vista previa
```

## Publicación

Es un sitio estático: en Cloudflare Pages se conecta este repositorio, sin comando de compilación y con el directorio de salida en la raíz (`/`).
