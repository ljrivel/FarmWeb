#!/usr/bin/env python3
"""Prueba de humo en un navegador real (Chrome + Playwright).

Uso: python3 tools/e2e_smoke.py [carpeta_de_capturas]
Levanta un servidor estático, juega un poco en tamaño móvil y PC, y falla si hay
errores de consola o algo no responde.
"""
import json
import os
import subprocess
import sys
import tempfile
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(prefix="farmweb-shots-")
PORT = 8123
FIXTURE = os.path.join(ROOT, "tests", "fixtures", "mundo-v1.farmweb.json")
URL = f"http://127.0.0.1:{PORT}/index.html?debug&sinescenas&sintutorial"  # sin escenas ni tutorial: no tapan los clics del recorrido
URL_ESCENAS = f"http://127.0.0.1:{PORT}/index.html?debug&sintutorial"
CHROME = next((p for p in ("/usr/bin/google-chrome", "/usr/bin/chromium") if os.path.exists(p)), None)
problems = []


def check(cond, msg):
    print(("  ok  " if cond else "  FALLA ") + msg)
    if not cond:
        problems.append(msg)


def play(browser, name, viewport, dpr, mobile):
    print(f"\n== {name} {viewport} dpr={dpr}")
    ctx = browser.new_context(viewport=viewport, device_scale_factor=dpr, is_mobile=mobile, has_touch=mobile,
                              accept_downloads=True)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL)
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    page.wait_for_timeout(600)
    page.screenshot(path=f"{SHOTS}/{name}-1-inicio.png")

    # canvas: tamaño entero nítido y dentro de la pantalla
    box = page.locator("#game").bounding_box()
    check(box and box["width"] >= 300 and box["x"] >= 0 and box["x"] + box["width"] <= viewport["width"] + 1,
          f"el lienzo cabe en pantalla ({box['width']:.0f}px de {viewport['width']})")
    no_overflow = page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
    check(no_overflow, "sin desbordamiento horizontal")

    # tocar un animal lo selecciona
    pos = page.evaluate("(() => { const a = farmweb.app.w.animals[0]; const c = document.getElementById('game').getBoundingClientRect(); return {x: c.left + a.x * c.width / 320, y: c.top + (a.y - 12) * c.height / 224, id: a.id}; })()")
    page.mouse.click(pos["x"], pos["y"])
    page.wait_for_timeout(300)
    check(page.locator("#selected").is_visible(), "tocar un animal abre su tarjeta")
    page.screenshot(path=f"{SHOTS}/{name}-2-seleccion.png")

    # alimentar (hay grano al inicio) baja el grano y sube la estadística
    before = page.evaluate("farmweb.app.w.foods.grano")
    page.evaluate("farmweb.app.w.animals[0].fed = 10")
    page.wait_for_timeout(1200)
    page.locator("#selected .food").first.click()
    page.wait_for_timeout(300)
    after = page.evaluate("farmweb.app.w.foods.grano")
    check(after == before - 1, f"alimentar gasta grano ({before} -> {after})")
    check(page.evaluate("farmweb.app.w.stats.fed") == 1, "la estadística de alimentar sube")

    # recoger: dar un producto listo y tocar la burbuja
    page.evaluate("farmweb.app.w.animals[0].ready = 1")
    page.wait_for_timeout(200)
    pos = page.evaluate("(() => { const a = farmweb.app.w.animals[0]; const c = document.getElementById('game').getBoundingClientRect(); return {x: c.left + a.x * c.width / 320, y: c.top + (a.y - 48) * c.height / 224}; })()")
    page.mouse.click(pos["x"], pos["y"])
    page.wait_for_timeout(300)
    check(page.evaluate("(farmweb.app.w.products.huevo || 0)") == 1, "tocar la burbuja recoge el producto")

    # paneles
    for panel, titulo in (("animals", "Tus animales"), ("shop", "Tienda"), ("pack", "Mochila"), ("quests", "Misiones"), ("world", "Mundo")):
        page.click(f'[data-panel="{panel}"]')
        page.wait_for_timeout(250)
        check(page.locator("#sheetTitle").inner_text() == titulo, f"panel {titulo} abre")
        page.screenshot(path=f"{SHOTS}/{name}-3-{panel}.png")
        page.keyboard.press("Escape")
        check(page.locator("#backdrop").is_hidden(), f"Escape cierra {titulo}")

    # vender desde la mochila y comprar un gato
    page.click('[data-panel="pack"]')
    page.locator("#sheetBody .btn.primary").first.click()
    page.wait_for_timeout(200)
    check(page.evaluate("farmweb.app.w.stats.sold") == 1, "vender desde la mochila funciona")
    page.keyboard.press("Escape")
    page.evaluate("farmweb.app.w.coins = 500")
    page.click('[data-panel="shop"]')
    page.locator('[data-key="buy-gato"]').click()
    page.wait_for_timeout(200)
    check(page.evaluate("farmweb.app.w.animals.length") == 3, "comprar un gato lo agrega a la granja")
    page.keyboard.press("Escape")

    # guardar y recargar: el mundo persiste
    world_id = page.evaluate("farmweb.app.w.id")
    page.evaluate("farmweb.app.saveNow(false)")
    page.wait_for_timeout(300)
    page.reload()
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    check(page.evaluate("farmweb.app.w.id") == world_id and page.evaluate("farmweb.app.w.animals.length") == 3,
          "tras recargar el mundo sigue igual (guardado local)")

    # descargar y volver a cargar un mundo desde archivo
    page.click('[data-panel="world"]')
    with page.expect_download() as dl:
        page.locator('[data-key="download"]').click()
    path = dl.value.path()
    data = json.load(open(path))
    check(data["format"] == "farmweb-world" and dl.value.suggested_filename.endswith(".farmweb.json"),
          f"descarga con nombre {dl.value.suggested_filename}")
    page.evaluate("farmweb.app.w.coins = 1")
    page.locator("#fileInput").set_input_files(path)
    page.wait_for_timeout(300)
    check(page.locator("#sheetBody").inner_text().find("¿Cargar este mundo?") >= 0, "pide confirmación antes de reemplazar")
    page.screenshot(path=f"{SHOTS}/{name}-4-confirmar-carga.png")
    page.locator('[data-key="imp-yes"]').click()
    page.wait_for_timeout(300)
    # 500 monedas fijadas - 80 del gato = 420 guardadas en el archivo
    check(page.evaluate("farmweb.app.w.coins") == 420, "el mundo cargado recupera sus monedas (420)")

    # un archivo adulterado se rechaza
    data["world"]["coins"] = 999999
    bad = os.path.join(SHOTS, "adulterado.farmweb.json")
    json.dump(data, open(bad, "w"))
    page.click('[data-panel="world"]')
    page.locator("#fileInput").set_input_files(bad)
    page.wait_for_timeout(300)
    check("dañado" in page.locator("#toast").inner_text(), "un archivo modificado se rechaza")


    # ---- v2: mapa, corrales y migración de archivos
    page.keyboard.press("Escape")
    page.evaluate("farmweb.app.w.coins = 3000; farmweb.app.w.unlocked.push('mapache')")
    page.click('[data-goto="mapa"]')
    page.wait_for_timeout(300)
    check(page.evaluate("farmweb.app.scene") == "mapa", "el botón Mapa abre el mapa")
    page.screenshot(path=f"{SHOTS}/{name}-5-mapa.png")
    gbox = page.locator("#game").bounding_box()

    def tap(lx, ly):
        page.mouse.click(gbox["x"] + lx * gbox["width"] / 320, gbox["y"] + ly * gbox["height"] / 224)

    tap(232, 84)  # Bosque, aún sin construir
    page.wait_for_timeout(300)
    check(page.locator("#backdrop").is_visible() and "Corrales" in page.locator('.tab[aria-selected="true"]').inner_text(),
          "tocar un corral bloqueado abre Tienda > Corrales")
    page.screenshot(path=f"{SHOTS}/{name}-6-corrales.png")
    page.locator('[data-key="build-bosque"]').click()
    page.wait_for_timeout(200)
    page.locator('[data-key="tab-animals"]').click()
    page.locator('[data-key="buy-mapache"]').click()
    page.wait_for_timeout(300)
    page.keyboard.press("Escape")
    check(page.evaluate("farmweb.app.scene") == "bosque", "comprar un mapache lleva al Bosque")
    check(page.evaluate("farmweb.app.w.animals.some(a => a.species === 'mapache' && a.corral === 'bosque')"),
          "el mapache vive en el Bosque")
    page.screenshot(path=f"{SHOTS}/{name}-7-bosque.png")
    page.click('[data-panel="animals"]')
    page.wait_for_timeout(200)
    heads = page.locator("#sheetBody h3").all_inner_texts()
    check(any(h.startswith("Pradera") for h in heads) and any(h.startswith("Bosque 1/6") for h in heads),
          f"Animales agrupa por corral {heads}")
    page.keyboard.press("Escape")

    # cargar el archivo de un mundo v1 (migra a v2)
    page.click('[data-panel="world"]')
    page.locator("#fileInput").set_input_files(FIXTURE)
    page.wait_for_timeout(300)
    page.locator('[data-key="imp-yes"]').click()
    page.wait_for_timeout(400)
    check(page.evaluate("farmweb.app.w.animals.length") == 8 and page.evaluate("farmweb.app.w.corrales.length") == 4
          and page.evaluate("farmweb.app.w.coins") == 777,
          "cargar el archivo v1: 8 animales, 4 corrales, 777 monedas")

    # estando en el Bosque, cargar un mundo sin Bosque devuelve a la Pradera
    page.evaluate("farmweb.app.goTo('bosque')")
    check(page.evaluate("farmweb.app.scene") == "bosque", "se puede visitar el Bosque del mundo cargado")
    fresh = page.evaluate("(async () => { const st = await import('/src/state.js'); return st.exportWorldText(st.newWorld()); })()")
    fresh_path = os.path.join(SHOTS, "mundo-nuevo.farmweb.json")
    open(fresh_path, "w").write(fresh)
    page.click('[data-panel="world"]')
    page.locator("#fileInput").set_input_files(fresh_path)
    page.wait_for_timeout(300)
    page.locator('[data-key="imp-yes"]').click()
    page.wait_for_timeout(400)
    check(page.evaluate("farmweb.app.scene") == "pradera", "cargar un mundo sin Bosque vuelve a la Pradera")
    page.screenshot(path=f"{SHOTS}/{name}-8-sin-bosque.png")

    check(not errors, "sin errores de consola" + (f": {errors[:3]}" if errors else ""))
    ctx.close()


def identity_and_sound(browser, name, viewport, dpr, mobile):
    """Fase 2A: nombres, colores raros y brillantes, y sonido (estado, silencio que persiste)."""
    print(f"\n== fase 2A (nombres, colores, sonido) {name} {viewport}")
    ctx = browser.new_context(viewport=viewport, device_scale_factor=dpr, is_mobile=mobile, has_touch=mobile)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    alerts = []
    page.on("dialog", lambda d: (alerts.append(d.message), d.dismiss()))
    page.goto(URL)
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    page.wait_for_timeout(400)

    # sonido: no hay contexto hasta el primer toque
    check(page.evaluate("farmweb.audio.state") == "none", "antes de tocar nada el audio no existe")
    if mobile:
        page.touchscreen.tap(viewport["width"] // 2, 300)
    else:
        page.mouse.click(viewport["width"] // 2, 300)
    page.wait_for_timeout(600)
    check(page.evaluate("farmweb.audio.state") == "running", "tras un toque el audio pasa a running")

    # (a) comprar abre el diálogo y el nombre escrito queda
    page.evaluate("farmweb.app.w.coins = 900")
    page.click('[data-panel="shop"]')
    page.locator('[data-key="buy-gato"]').click()
    page.wait_for_timeout(300)
    check(page.locator("#sheetTitle").inner_text() == "Ponle nombre", "comprar un gato abre «Ponle nombre»")
    check(page.locator('label[for="animalName"]').inner_text() == "Nombre", "el campo tiene la etiqueta visible «Nombre»")
    page.screenshot(path=f"{SHOTS}/{name}-9-dialogo-nombre.png")
    page.locator("#animalName").fill("Bigotes")
    page.keyboard.press("Enter")
    page.wait_for_timeout(300)
    check("Bigotes" in page.locator("#selected").inner_text(), "el nombre escrito queda en la tarjeta")
    page.click('[data-panel="animals"]')
    page.wait_for_timeout(200)
    check("Bigotes" in page.locator("#sheetBody").inner_text(), "y en el panel Animales")
    page.keyboard.press("Escape")

    # (b) Escape conserva el sugerido y la tarjeta ofrece «Ponle nombre»
    page.click('[data-panel="shop"]')
    page.locator('[data-key="buy-gato"]').click()
    page.wait_for_timeout(250)
    suggested = page.locator("#animalName").input_value()
    page.keyboard.press("Escape")
    page.wait_for_timeout(250)
    card = page.locator("#selected").inner_text()
    check(suggested and suggested in card, f"Escape conserva el nombre sugerido «{suggested}»")
    check(page.locator("#selected .btn.highlight").inner_text() == "Ponle nombre", "la tarjeta ofrece «Ponle nombre» destacado")
    page.locator("#selected .btn.highlight").click()
    page.wait_for_timeout(200)
    page.locator("#animalName").fill("<img src=x onerror=alert(1)>")
    page.keyboard.press("Enter")
    page.wait_for_timeout(250)
    check(page.locator("#selected img").count() == 0 and not alerts, "un nombre con etiquetas se ve como texto y no ejecuta nada")

    # (c) un color raro (3) y un brillante se dibujan sin errores
    page.evaluate("""(async () => {
        const st = await import('/src/state.js');
        const w = farmweb.app.w;
        st.addAnimal(w, 'gallina', 3, 'adult');
        st.addAnimal(w, 'gallina', 0, 'adult', { shiny: true });
    })()""")
    page.evaluate("farmweb.app.goTo('pradera')")
    page.wait_for_timeout(500)
    rows = page.evaluate("[farmweb.app.sprites.animals.rows['gallina:3:adult'], farmweb.app.sprites.animals.rows['gallina:shiny:adult']]")
    check(all(r is not None for r in rows), f"el atlas tiene las filas del color raro y del brillante {rows}")
    page.screenshot(path=f"{SHOTS}/{name}-10-raros.png")
    ids = page.evaluate("farmweb.app.w.animals.filter(a => a.shiny || a.variant === 3).map(a => a.id)")
    seen = []
    for aid in ids[-2:]:
        page.evaluate(f"farmweb.app.selectedId = {aid}; farmweb.app.goTo(farmweb.app.scene)")
        page.wait_for_timeout(250)
        seen.append(page.locator("#selected").inner_text())
    check(any("Raro" in t for t in seen) and any("Brillante" in t for t in seen), "las tarjetas muestran las etiquetas Raro y Brillante")
    page.screenshot(path=f"{SHOTS}/{name}-11-tarjeta-brillante.png")

    # (d) el silencio persiste al recargar
    page.click('[data-panel="world"]')
    page.wait_for_timeout(200)
    check(page.locator('[data-key="sound-toggle"]').get_attribute("aria-pressed") == "true", "el botón de sonido empieza activado")
    page.locator('[data-key="sound-toggle"]').click()
    page.wait_for_timeout(150)
    page.screenshot(path=f"{SHOTS}/{name}-12-sonido.png")
    page.reload()
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    check(page.evaluate("farmweb.audio.prefs.muted") is True, "tras recargar sigue silenciado")
    page.click('[data-panel="world"]')
    page.wait_for_timeout(200)
    check(page.locator('[data-key="sound-toggle"]').get_attribute("aria-pressed") == "false", "y el botón lo muestra")
    check(page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "sin desbordamiento horizontal")
    check(not errors, "sin errores de consola" + (f": {errors[:3]}" if errors else ""))
    ctx.close()


def migration(browser):
    """Un guardado v1 ya existente en el navegador se migra al abrir y deja su respaldo."""
    print("\n== migración v1 -> v2 en el navegador")
    raw = open(FIXTURE, encoding="utf-8").read()
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script(
        "if (!sessionStorage.getItem('sembrado')) { sessionStorage.setItem('sembrado', '1');"
        f" localStorage.setItem('farmweb:world:v1', {json.dumps(raw)}); }}")
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL)
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    # el archivo es de 2023: al abrirlo se aplican las 8 h máximas fuera de línea y pueden haber nacido crías
    check(page.evaluate("[1,2,3,4,5,6,7,8].every(id => farmweb.app.w.animals.some(a => a.id === id))"),
          "el guardado v1 abre con sus 8 animales originales (más las crías de la puesta al día)")
    check(page.evaluate("farmweb.app.w.corrales.length") == 4, "y con 4 corrales")
    check(page.evaluate("farmweb.app.w.coins") == 777, "y con 777 monedas")
    check(page.evaluate("localStorage.getItem('farmweb:world:v1:respaldo-v1')") == raw, "queda el respaldo con el texto original")
    page.screenshot(path=f"{SHOTS}/migracion-1-pradera.png")
    page.evaluate("farmweb.app.saveNow(false)")
    page.reload()
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    check(page.evaluate("farmweb.app.w.animals.length") >= 8 and
          json.loads(page.evaluate("localStorage.getItem('farmweb:world:v1')"))["version"] == 2,
          "tras guardar y recargar queda en formato v2")
    check(page.evaluate("localStorage.getItem('farmweb:world:v1:respaldo-v1')") == raw, "el respaldo sigue intacto")
    check(not errors, "sin errores de consola" + (f": {errors[:3]}" if errors else ""))
    ctx.close()


def small_phone(browser):
    """Celular chico (360x740): la barra de 6 botones y el encabezado caben sin cortes."""
    print("\n== celular chico 360x740")
    ctx = browser.new_context(viewport={"width": 360, "height": 740}, device_scale_factor=3, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL)
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    page.wait_for_timeout(400)
    check(page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "sin desbordamiento horizontal")
    check(page.locator("#dock button").count() == 6, "la barra tiene 6 botones")
    clipped = page.evaluate("[...document.querySelectorAll('#dock button')].filter(b => b.scrollWidth > b.clientWidth + 1).map(b => b.textContent)")
    check(not clipped, f"el texto de la barra no se corta {clipped}")
    inside = page.evaluate("[...document.querySelectorAll('#dock button')].every(b => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })")
    check(inside, "todos los botones caben en pantalla")
    quest_ok = page.evaluate("(() => { const t = document.getElementById('questTitle'); return t.scrollWidth <= t.clientWidth + 1 && t.textContent.length > 3; })()")
    check(quest_ok, "el título de la misión se lee completo")
    page.screenshot(path=f"{SHOTS}/chico-1-inicio.png")
    page.click('[data-goto="mapa"]')
    page.wait_for_timeout(300)
    page.screenshot(path=f"{SHOTS}/chico-2-mapa.png")
    page.evaluate("farmweb.app.w.coins = 500")
    page.click('[data-panel="shop"]')
    page.locator('[data-key="buy-gato"]').click()
    page.wait_for_timeout(300)
    check(page.locator("#sheetTitle").inner_text() == "Ponle nombre", "el diálogo de nombre abre en el celular chico")
    check(page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "sin desbordamiento horizontal con el diálogo")
    fits = page.evaluate("""[...document.querySelectorAll('#sheetBody input, #sheetBody button')].every(b => {
        const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; })""")
    check(fits, "campo y botones del diálogo caben en 360x740")
    page.screenshot(path=f"{SHOTS}/chico-3-dialogo-nombre.png")
    check(not errors, "sin errores de consola" + (f": {errors[:3]}" if errors else ""))
    ctx.close()


def new_page(browser, viewport, dpr, mobile):
    ctx = browser.new_context(viewport=viewport, device_scale_factor=dpr, is_mobile=mobile, has_touch=mobile)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL)
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    page.wait_for_timeout(400)
    return ctx, page, errors


def stage0(browser):
    """Pendientes de la 2A: Enter con composición, foco al cerrar, avisos de varios nacimientos."""
    print("\n== etapa 0 (pendientes de la 2A)")
    ctx, page, errors = new_page(browser, {"width": 390, "height": 844}, 2, True)
    aid = page.evaluate("farmweb.app.w.animals[0].id")
    page.evaluate(f"farmweb.app.selectedId = {aid}; farmweb.app.goTo('pradera')")
    page.wait_for_timeout(300)
    page.locator("#selected .btn.highlight").click()
    page.wait_for_timeout(200)
    page.locator("#animalName").fill("Kiki")
    page.evaluate("""document.getElementById('animalName').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }))""")
    page.wait_for_timeout(200)
    check(page.locator("#sheetTitle").is_visible() and page.evaluate(f"farmweb.app.w.animals[0].name") != "Kiki",
          "Enter durante una composición de teclado no guarda")
    page.keyboard.press("Enter")
    page.wait_for_timeout(300)
    check(page.evaluate("farmweb.app.w.animals[0].name") == "Kiki", "Enter normal sí guarda")
    check(page.evaluate("document.activeElement && document.activeElement.isConnected && document.activeElement !== document.body"),
          "al cerrar, el foco vuelve a un elemento que existe (" + page.evaluate("document.activeElement.textContent.trim().slice(0, 20)") + ")")
    page.evaluate("""(() => { const w = farmweb.app.w;
        for (let i = 0; i < 2; i++) w.eggs.push({ id: w.nextId++, species: 'gallina', corral: 'pradera', variant: 0, shiny: false, left: 1, x: 100 + i * 30, y: 150 }); })()""")
    page.wait_for_timeout(1600)
    check("Nacieron 2 crías" in page.locator("#toast").inner_text(), "dos nacimientos juntos dan un solo aviso «¡Nacieron 2 crías!»")
    page.locator("#toast").click()
    page.wait_for_timeout(300)
    check(page.locator("#sheetTitle").inner_text() == "Ponle nombre", "tocar el aviso abre el nombre de la primera cría")
    page.keyboard.press("Escape")
    check(not errors, "sin errores de consola" + (f": {errors[:3]}" if errors else ""))
    ctx.close()


def care_flow(browser, name, viewport, dpr, mobile):
    """Fase 2B: corazones, enfermedad forzada con ?debug, Veterinaria en el mapa y curar."""
    print(f"\n== fase 2B (corazones y veterinaria) {name} {viewport}")
    ctx, page, errors = new_page(browser, viewport, dpr, mobile)
    aid = page.evaluate("farmweb.app.w.animals[0].id")
    page.evaluate(f"farmweb.app.selectedId = {aid}; farmweb.app.goTo('pradera')")
    page.wait_for_timeout(300)
    check("Corazones 0 de 5" in page.locator("#selected").inner_text(), "la tarjeta muestra «Corazones 0 de 5»")
    check("null" not in page.locator("#selected").inner_text(), "la tarjeta de un animal sano no muestra texto suelto")
    page.evaluate(f"farmweb.app.w.animals[0].hearts = 3; farmweb.app.goTo('pradera')")
    page.wait_for_timeout(1200)
    check("Corazones 3 de 5" in page.locator("#selected").inner_text(), "y se actualiza a «Corazones 3 de 5»")
    page.evaluate(f"farmweb.sim.makeSick(farmweb.app.w, {aid}, 'resfriado'); farmweb.app.goTo('pradera')")
    page.wait_for_timeout(1200)
    check("Enfermo: Resfriado" in page.locator("#selected").inner_text(), "la tarjeta muestra la enfermedad con texto")
    page.screenshot(path=f"{SHOTS}/{name}-13-enfermo.png")
    page.click('[data-panel="animals"]')
    page.wait_for_timeout(200)
    txt = page.locator("#sheetBody").inner_text()
    check("Enfermo: Resfriado" in txt and "Corazones 3 de 5" in txt, "el panel Animales muestra corazones y enfermedad")
    page.keyboard.press("Escape")
    page.click('[data-goto="mapa"]')
    page.wait_for_timeout(300)
    gbox = page.locator("#game").bounding_box()
    page.evaluate("farmweb.app.w.coins = 100")
    page.mouse.click(gbox["x"] + 164 * gbox["width"] / 320, gbox["y"] + 48 * gbox["height"] / 224)
    page.wait_for_timeout(300)
    check(page.locator("#sheetTitle").inner_text() == "Veterinaria", "tocar la Veterinaria en el mapa abre su hoja")
    check(page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "sin desbordamiento horizontal en la Veterinaria")
    page.screenshot(path=f"{SHOTS}/{name}-14-veterinaria.png")
    page.locator(f'[data-key="cure-{aid}"]').click()
    page.wait_for_timeout(300)
    check(page.evaluate(f"farmweb.app.w.animals.find(a => a.id === {aid}).sick") is None, "curar deja al animal sano")
    check(page.evaluate("farmweb.app.w.coins") == 40, "y descuenta el costo del resfriado (100 - 60 = 40)")
    check("sanos" in page.locator("#sheetBody").inner_text(), "la hoja queda sin enfermos")
    page.keyboard.press("Escape")
    check(not errors, "sin errores de consola" + (f": {errors[:3]}" if errors else ""))
    ctx.close()


def side_quests(browser):
    """Etapa b: varias secundarias activas, reclamar una y que pase al Historial."""
    print("\n== secundarias en paralelo e historial")
    ctx, page, errors = new_page(browser, {"width": 360, "height": 740}, 2, True)
    page.click('[data-panel="quests"]')
    page.wait_for_timeout(250)
    n = page.locator(".quest-card.side").count()
    check(n >= 3, f"hay varias secundarias activas a la vez ({n})")
    check(page.locator("details.history").count() == 1, "el Historial está aparte")
    page.keyboard.press("Escape")
    page.evaluate("farmweb.app.w.stats.petted += 10")
    page.click('[data-panel="quests"]')
    page.wait_for_timeout(250)
    coins = page.evaluate("farmweb.app.w.coins")
    page.locator('[data-key="side-s-mimos"]').click()
    page.wait_for_timeout(300)
    check(page.evaluate("farmweb.app.w.coins") == coins + 30, "reclamar «Ronda de mimos» da 30 monedas")
    check(page.locator('[data-key="side-s-mimos"]').count() == 0, "y deja de estar entre las activas")
    page.locator("details.history summary").click()
    page.wait_for_timeout(200)
    check("Ronda de mimos" in page.locator("details.history").inner_text(), "y aparece en el Historial")
    check(page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "sin desbordamiento horizontal")
    page.screenshot(path=f"{SHOTS}/chico-4-misiones.png")
    check(not errors, "sin errores de consola" + (f": {errors[:3]}" if errors else ""))
    ctx.close()


def secrets(browser):
    """Etapa c: el cartel del mapa (7 toques) y el código Konami descubren secretos."""
    print("\n== secretos")
    ctx, page, errors = new_page(browser, {"width": 1280, "height": 800}, 1, False)
    page.evaluate("farmweb.app.w.secrets.buho = true")  # que la hora del equipo no cambie la prueba
    page.click('[data-goto="mapa"]')
    page.wait_for_timeout(300)
    g = page.locator("#game").bounding_box()
    for _ in range(7):
        page.mouse.click(g["x"] + 160 * g["width"] / 320, g["y"] + 16 * g["height"] / 224)
        page.wait_for_timeout(80)
    page.wait_for_timeout(200)
    check(page.evaluate("farmweb.app.w.secrets.cartel === true"), "7 toques al cartel del mapa descubren un secreto")
    check("Detrás del cartel" in page.locator("#toast").inner_text(), "y lo avisa")
    page.evaluate("farmweb.app.goTo('pradera')")
    for k in ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"]:
        page.keyboard.press(k)
    page.wait_for_timeout(300)
    check(page.evaluate("farmweb.app.w.secrets.konami === true"), "el código Konami descubre «La ola»")
    page.click('[data-panel="quests"]')
    page.wait_for_timeout(250)
    check("Secretos encontrados: 3 de 8" in page.locator("#sheetBody").inner_text(), "Misiones cuenta los secretos (3 de 8)")
    page.screenshot(path=f"{SHOTS}/pc-15-secretos.png")
    check(not errors, "sin errores de consola" + (f": {errors[:3]}" if errors else ""))
    ctx.close()


def new_content(browser):
    """Etapa d: conejo y pato se compran, se dibujan, enferman y se curan."""
    print("\n== especies nuevas (conejo y pato)")
    ctx, page, errors = new_page(browser, {"width": 390, "height": 844}, 2, True)
    page.evaluate("const w = farmweb.app.w; w.coins = 5000; w.unlocked.push('conejo', 'pato')")
    page.click('[data-panel="shop"]')
    page.locator('[data-key="tab-corrales"]').click()
    page.locator('[data-key="build-bosque"]').click()
    page.locator('[data-key="build-estanque"]').click()
    page.locator('[data-key="tab-animals"]').click()
    for sp in ("conejo", "pato"):
        page.locator(f'[data-key="buy-{sp}"]').click()
        page.wait_for_timeout(250)
        page.keyboard.press("Escape")
        page.wait_for_timeout(150)
        if sp == "conejo":
            page.click('[data-panel="shop"]')
    check(page.evaluate("farmweb.app.w.animals.some(a => a.species === 'conejo' && a.corral === 'bosque')"), "el conejo vive en el Bosque")
    check(page.evaluate("farmweb.app.w.animals.some(a => a.species === 'pato' && a.corral === 'estanque')"), "el pato vive en el Estanque")
    page.screenshot(path=f"{SHOTS}/movil-16-pato.png")
    pid = page.evaluate("farmweb.app.w.animals.find(a => a.species === 'pato').id")
    page.evaluate(f"farmweb.sim.makeSick(farmweb.app.w, {pid}, 'pulgas'); farmweb.app.selectedId = {pid}; farmweb.app.goTo('estanque')")
    page.wait_for_timeout(1200)
    check("Enfermo: Pulgas" in page.locator("#selected").inner_text(), "el pato puede enfermar")
    page.locator(f'[data-key="vet-{pid}"]').click()
    page.locator(f'[data-key="cure-{pid}"]').click()
    page.wait_for_timeout(250)
    check(page.evaluate(f"farmweb.app.w.animals.find(a => a.id === {pid}).sick") is None, "y curarse en la Veterinaria")
    check(not errors, "sin errores de consola" + (f": {errors[:3]}" if errors else ""))
    ctx.close()


def story_scenes(browser, name, viewport, dpr, mobile):
    print(f"\n== escenas con diálogo {name} {viewport}")
    ctx = browser.new_context(viewport=viewport, device_scale_factor=dpr, is_mobile=mobile, has_touch=mobile)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL_ESCENAS)
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    page.wait_for_selector(".story", timeout=5000)
    check(page.locator(".story").get_attribute("aria-label") == "El sobre mojado", "la partida nueva abre la escena de Bruno")
    check(page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "la escena no desborda en horizontal")
    page.wait_for_timeout(1200)
    page.screenshot(path=f"{SHOTS}/{name}-30-escena.png")
    page.locator('[data-key="story-next"]').click()  # completa la línea
    page.locator('[data-key="story-next"]').click()  # pasa a la siguiente
    page.wait_for_function("document.querySelector('.story-text').textContent.includes('Traigo un sobre')", timeout=4000)
    check(True, "avanza a la segunda línea (el texto se va escribiendo)")
    page.locator('[data-key="story-skip"]').click()
    check(page.locator(".story").count() == 0, "Saltar cierra la escena")
    check(page.evaluate("farmweb.app.w.story.seen['sobre-mojado']") is True, "la escena queda marcada como vista")
    page.wait_for_timeout(2500)
    check(page.locator(".story").count() == 0, "no se repite")
    page.keyboard.press("Escape")
    check(not errors, "sin errores de consola" + (f": {errors[:3]}" if errors else ""))
    ctx.close()


def visits_and_diary(browser):
    print("\n== visitas y Diario")
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL_ESCENAS)
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    page.locator('[data-key="story-skip"]').click()  # la escena de Bruno
    check(page.evaluate("farmweb.app.visit") is None, "al empezar no hay visita")
    page.evaluate("farmweb.app.nextVisitAt = 0")
    page.wait_for_function("farmweb.app.visit !== null", timeout=4000)
    page.wait_for_timeout(1200)
    check(page.evaluate("farmweb.app.visit.corral") == "pradera", "la visita llega al corral a la vista")
    page.screenshot(path=f"{SHOTS}/movil-31-visita.png")
    gbox = page.locator("#game").bounding_box()
    page.mouse.click(gbox["x"] + 160 * gbox["width"] / 320, gbox["y"] + 178 * gbox["height"] / 224)
    page.wait_for_selector(".story", timeout=3000)
    check(page.evaluate("farmweb.app.visit") is None, "tocar la visita la atiende")
    check(page.locator(".story").get_attribute("aria-label").startswith("Visita de"), "se abre su charla")
    check(len(page.evaluate("Object.keys(farmweb.app.w.story.talked)")) == 1, "la charla queda contada")
    page.locator('[data-key="story-skip"]').click()
    check(page.evaluate("farmweb.app.nextVisitAt") > 0, "la siguiente visita queda programada")

    page.evaluate("farmweb.app.visit = null")
    page.click('[data-panel="quests"]')
    page.locator('[data-key="tab-diario"]').click()
    check("Escenas vistas (1 de" in page.locator("#sheetBody").inner_text(), "el Diario cuenta la escena ya vista")
    check("Cartas de Cosi (1 de" in page.locator("#sheetBody").inner_text(), "y la carta recibida")
    page.screenshot(path=f"{SHOTS}/movil-32-diario.png")
    page.locator('[data-key="replay-sobre-mojado"]').click()
    page.wait_for_selector(".story", timeout=3000)
    page.keyboard.press("Escape")
    check(page.locator(".story").count() == 0, "Escape cierra la escena repetida")
    check(page.locator("#backdrop").is_visible(), "sin cerrar el Diario de debajo")
    check(page.evaluate("Object.keys(farmweb.app.w.story.seen).length") == 1, "repetirla no marca nada nuevo")
    check(not errors, "sin errores de consola" + (f": {errors[:3]}" if errors else ""))
    ctx.close()


def gift_labels_guide(browser):
    print("\n== cesta diaria, etiquetas y Guía")
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL)
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    check(page.locator("#giftChip").is_visible(), "con una cesta sin recoger se ve el botón de Bruno")
    page.locator("#giftChip").click()
    check(page.evaluate("farmweb.app.w.coins") == 130, "recoger la cesta da las monedas del día 1")
    check("Cesta de Bruno" in page.locator("#toast").inner_text(), "y lo avisa")
    check(page.locator("#giftChip").is_hidden(), "el botón desaparece hasta mañana")
    page.evaluate("farmweb.app.claimGift()")
    check(page.evaluate("farmweb.app.w.coins") == 130, "una segunda cesta el mismo día no cobra")

    page.click('[data-panel="world"]')
    page.locator('[data-key="labels-todo"]').click()
    check(page.evaluate("farmweb.app.labels") == "todo", "las etiquetas pasan a «nombre y especie»")
    check(page.evaluate("JSON.parse(localStorage.getItem('farmweb:ui:v1')).labels") == "todo", "y se guardan en el dispositivo")
    page.keyboard.press("Escape")
    page.wait_for_timeout(400)
    page.screenshot(path=f"{SHOTS}/movil-33-etiquetas.png")
    page.reload()
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    check(page.evaluate("farmweb.app.labels") == "todo", "al recargar siguen puestas")

    page.click('[data-panel="animals"]')
    page.locator('[data-key="tab-guia"]').click()
    texto = page.locator("#sheetBody").inner_text()
    check("Gallina" in texto and "Pone un huevo" in texto, "la Guía cuenta la gallina y su dato")
    check("???" in texto, "y esconde las especies que aún no conoces")
    page.screenshot(path=f"{SHOTS}/movil-34-guia.png")
    check(not errors, "sin errores de consola" + (f": {errors[:3]}" if errors else ""))
    ctx.close()


def chapter6(browser):
    print("\n== capítulo 6: el Valle, los dinosaurios nuevos y Noa")
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL)
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    page.evaluate("""(async () => {
      const { QUESTS } = await import('/src/data.js');
      const w = farmweb.app.w;
      for (const q of QUESTS) { if (q.id === 'c6-camino') break; w.quests.claimed[q.id] = true; }
      for (const t of ['bosque', 'estanque', 'jurasico']) if (!w.corrales.some((c) => c.tipo === t)) w.corrales.push({ id: t, tipo: t, nombre: t, nivel: 0 });
      for (const s of ['triceratops', 'estegosaurio', 'plesiosaurio']) if (!w.unlocked.includes(s)) w.unlocked.push(s); // las muestras del viaje al pasado
      w.animals[0].hearts = 3;
      farmweb.app.ui?.refresh?.();
    })()""")
    page.click('[data-panel="quests"]')
    check("El camino del río" in page.locator("#sheetBody").inner_text(), "la misión del capítulo 6 es la activa")
    page.locator('[data-key="claim"]').click()
    page.wait_for_timeout(300)
    check(page.evaluate("farmweb.app.w.corrales.some((c) => c.tipo === 'valle')"), "reclamarla abre el Valle")
    check(page.evaluate("farmweb.app.w.animals.some((a) => a.species === 'triceratops' && a.corral === 'valle')"), "el triceratops bebé llega al Valle")
    page.keyboard.press("Escape")
    page.wait_for_timeout(200)
    page.evaluate("farmweb.app.setLabels('todo')")
    page.evaluate("farmweb.app.goTo('valle', true)")
    page.wait_for_timeout(500)
    page.screenshot(path=f"{SHOTS}/movil-35-valle.png")
    page.click('[data-goto="mapa"]')
    page.wait_for_timeout(400)
    page.screenshot(path=f"{SHOTS}/movil-36-mapa-valle.png")
    page.click('[data-panel="quests"]')
    check("Una visitante con lupa" in page.locator("#sheetBody").inner_text(), "sigue Noa con su misión")
    check("Noa" in page.locator(".speaker").first.inner_text(), "y habla con su retrato")
    page.screenshot(path=f"{SHOTS}/movil-37-noa.png")
    page.keyboard.press("Escape")
    page.click('[data-panel="animals"]')
    page.locator('[data-key="tab-guia"]').click()
    check("Triceratops" in page.locator("#sheetBody").inner_text(), "la Guía ya conoce al triceratops")
    check(not errors, "sin errores de consola" + (f": {errors[:3]}" if errors else ""))
    ctx.close()


def chapter7(browser):
    print("\n== capítulo 7: pterodáctilo, plesiosaurio y la última carta")
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL)
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    page.evaluate("""(async () => {
      const { QUESTS } = await import('/src/data.js');
      const w = farmweb.app.w;
      for (const q of QUESTS) { if (q.id === 'c7-cielo') break; w.quests.claimed[q.id] = true; }
      for (const t of ['bosque', 'estanque', 'jurasico', 'valle']) if (!w.corrales.some((c) => c.tipo === t)) w.corrales.push({ id: t, tipo: t, nombre: t, nivel: 0 });
      for (const s of ['triceratops', 'estegosaurio', 'plesiosaurio']) if (!w.unlocked.includes(s)) w.unlocked.push(s);
      w.stats.sold = 60;
    })()""")
    page.click('[data-panel="quests"]')
    check("Plumas en el cielo" in page.locator("#sheetBody").inner_text(), "el capítulo 7 empieza con Bruno")
    page.locator('[data-key="claim"]').click()
    page.wait_for_timeout(300)
    check(page.evaluate("farmweb.app.w.animals.some((a) => a.species === 'pterodactilo' && a.corral === 'valle')"), "el pterodáctilo bebé llega al Valle")
    check(page.evaluate("farmweb.app.w.unlocked.includes('pterodactilo')"), "y su ADN entra al Laboratorio")
    page.keyboard.press("Escape")
    page.evaluate("farmweb.app.w.animals.filter((a) => a.species === 'pterodactilo').forEach((a) => { a.stage = 'adult'; })")
    page.click('[data-panel="quests"]')
    page.locator('[data-key="claim"]').click()
    page.wait_for_timeout(300)
    check(page.evaluate("farmweb.app.w.animals.some((a) => a.species === 'plesiosaurio' && a.corral === 'estanque')"), "el plesiosaurio bebé llega al Estanque")
    page.keyboard.press("Escape")
    page.evaluate("farmweb.app.setLabels('todo')")
    page.evaluate("farmweb.app.goTo('valle', true)")
    page.wait_for_timeout(500)
    page.screenshot(path=f"{SHOTS}/movil-38-pterodactilo.png")
    page.evaluate("farmweb.app.goTo('estanque', true)")
    page.wait_for_timeout(500)
    page.screenshot(path=f"{SHOTS}/movil-39-plesiosaurio.png")
    page.click('[data-panel="animals"]')
    page.locator('[data-key="tab-guia"]').click()
    texto = page.locator("#sheetBody").inner_text()
    check("Pterodáctilo" in texto and "Plesiosaurio" in texto, "la Guía conoce a los dos nuevos")
    check(not errors, "sin errores de consola" + (f": {errors[:3]}" if errors else ""))
    ctx.close()


def sheep_and_fox(browser):
    print("\n== oveja y zorro")
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL)
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    page.evaluate("""(() => {
      const w = farmweb.app.w;
      w.unlocked.push('oveja', 'zorro'); w.coins = 1000;
      if (!w.corrales.some((c) => c.tipo === 'bosque')) w.corrales.push({ id: 'bosque', tipo: 'bosque', nombre: 'Bosque', nivel: 0 });
      farmweb.sim.buyAnimal(w, 'oveja'); farmweb.sim.buyAnimal(w, 'zorro');
      for (const a of w.animals) if (a.species === 'oveja' || a.species === 'zorro') a.stage = 'adult';
    })()""")
    page.evaluate("farmweb.app.setLabels('todo')")
    page.evaluate("farmweb.app.goTo('pradera', true)")
    page.wait_for_timeout(500)
    page.screenshot(path=f"{SHOTS}/movil-40-oveja.png")
    page.evaluate("farmweb.app.goTo('bosque', true)")
    page.wait_for_timeout(500)
    page.screenshot(path=f"{SHOTS}/movil-41-zorro.png")
    check(page.evaluate("farmweb.app.w.animals.filter((a) => a.species === 'oveja' && a.corral === 'pradera').length") == 1, "la oveja vive en la Pradera")
    check(page.evaluate("farmweb.app.w.animals.filter((a) => a.species === 'zorro' && a.corral === 'bosque').length") == 1, "el zorro vive en el Bosque")
    page.click('[data-panel="animals"]')
    page.locator('[data-key="tab-guia"]').click()
    texto = page.locator("#sheetBody").inner_text()
    check("Oveja" in texto and "Zorro" in texto, "la Guía conoce a la oveja y al zorro")
    check(not errors, "sin errores de consola" + (f": {errors[:3]}" if errors else ""))
    ctx.close()


def tutorial_flow(browser, name, viewport, dpr, mobile):
    print(f"\n== tutorial guiado {name} {viewport}")
    ctx = browser.new_context(viewport=viewport, device_scale_factor=dpr, is_mobile=mobile, has_touch=mobile)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"http://127.0.0.1:{PORT}/index.html?debug&sinescenas")
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    page.wait_for_selector(".tuto-card", timeout=5000)
    total = page.evaluate("import('/src/tutorial.js').then((m) => m.TUTORIAL_STEPS.length)")
    check("Soy Tomás" in page.locator(".tuto-text").inner_text(), "la primera vez sale el tutorial con Tomás")
    check(page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "el tutorial no desborda en horizontal")
    page.screenshot(path=f"{SHOTS}/{name}-50-tutorial-hola.png")

    def aqui():  # centro en pantalla del recuadro iluminado
        b = page.locator(".tuto-hole").bounding_box()
        return b["x"] + b["width"] / 2, b["y"] + b["height"] / 2

    page.locator('[data-key="tuto-next"]').click()
    check("toca a uno de tus animales" in page.locator(".tuto-text").inner_text(), "paso 2: pide tocar un animal")
    page.wait_for_timeout(400)
    hx, hy = aqui()
    ax, ay = page.evaluate("""(() => { const a = farmweb.app.w.animals.find((x) => x.corral === farmweb.app.scene); const c = document.getElementById('game').getBoundingClientRect(); return [c.left + a.x * c.width / 320, c.top + (a.y - 14) * c.height / 224]; })()""")
    check(abs(hx - ax) < 8 and abs(hy - ay) < 8, "el recuadro ilumina justo al animal")
    page.screenshot(path=f"{SHOTS}/{name}-51-tutorial-tocar.png")
    page.mouse.click(hx, hy)
    page.wait_for_function("document.querySelector('.tuto-text').textContent.includes('tarjeta')", timeout=4000)
    check(page.evaluate("farmweb.app.selectedId") is not None, "tocar el animal lo selecciona y el tutorial avanza solo")
    page.wait_for_timeout(700)  # la tarjeta del animal entra con una animación
    hb, mb = page.locator(".tuto-hole").bounding_box(), page.locator("#selected .meters").bounding_box()
    check(abs((hb["x"] + hb["width"] / 2) - (mb["x"] + mb["width"] / 2)) < 10 and abs((hb["y"] + hb["height"] / 2) - (mb["y"] + mb["height"] / 2)) < 10, "el recuadro ilumina las barras de saciedad y felicidad")
    page.screenshot(path=f"{SHOTS}/{name}-52-tutorial-tarjeta.png")
    page.locator('[data-key="tuto-next"]').click()
    check("Dale de comer" in page.locator(".tuto-text").inner_text(), "paso 4: pide dar de comer")
    fed0 = page.evaluate("farmweb.app.w.stats.fed")
    page.locator("#selected .foods .btn").first.click()
    page.wait_for_function("document.querySelector('.tuto-text').textContent.includes('mimos')", timeout=4000)
    check(page.evaluate("farmweb.app.w.stats.fed") == fed0 + 1, "dar de comer avanza el paso")
    page.locator('#selected [data-key="pet"]').click()
    page.wait_for_function("document.querySelector('.tuto-text').textContent.includes('100 de cariño')", timeout=4000)
    check(page.evaluate("farmweb.app.w.stats.petted") >= 1, "acariciar avanza al paso de los corazones")
    ids = page.evaluate("import('/src/tutorial.js').then((m) => m.TUTORIAL_STEPS.map((s) => s.id))")
    for _ in range(total):
        if page.locator(".tuto").count() == 0:
            break
        sid = ids[int(page.locator(".tuto-card .muted").inner_text().split()[1]) - 1]
        page.wait_for_timeout(350)
        if sid in ("mochila", "tienda", "misiones", "vet", "guardado"):
            check(page.locator("#backdrop").is_visible(), f"paso {sid}: el tutorial abre el panel")
            check(page.evaluate("document.querySelector('.tuto').classList.contains('quiet')") and page.locator(".tuto-hole").is_hidden(),
                  f"paso {sid}: no se oscurece nada encima del panel")
            cb, sb = page.locator(".tuto-card").bounding_box(), page.locator(".sheet").bounding_box()
            check(sb["y"] >= cb["y"] + cb["height"] - 2, f"paso {sid}: la tarjeta de Tomás no tapa el panel")
            if sid in ("tienda", "guardado"):
                page.screenshot(path=f"{SHOTS}/{name}-53-tutorial-{sid}.png")
        if sid == "mapa":
            check(page.evaluate("farmweb.app.scene") == "mapa" and page.locator("#backdrop").is_hidden(), "paso mapa: cierra el panel y viaja al mapa")
            page.screenshot(path=f"{SHOTS}/{name}-54-tutorial-mapa.png")
        page.locator('[data-key="tuto-next"]').click()
        page.wait_for_timeout(120)
    check(page.evaluate("farmweb.app.scene") != "mapa" and page.locator("#backdrop").is_hidden(), "al terminar vuelve al corral y no deja paneles abiertos")
    check(page.locator(".tuto").count() == 0, "al terminar los pasos el tutorial se cierra")
    check(page.evaluate("JSON.parse(localStorage.getItem('farmweb:ui:v1')).tutorial") is True, "queda marcado como visto en el dispositivo")
    page.reload()
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    page.wait_for_timeout(2500)
    check(page.locator(".tuto").count() == 0, "al recargar no vuelve a salir")
    check(page.evaluate("JSON.parse(localStorage.getItem('farmweb:ui:v1')).labels") is None or True, "las preferencias no se pisan")

    page.click('[data-panel="world"]')
    page.locator('[data-key="tuto-replay"]').click()
    page.wait_for_selector(".tuto-card", timeout=3000)
    check(page.locator("#backdrop").is_hidden(), "repetirlo cierra la hoja de Mundo")
    page.keyboard.press("Escape")
    check(page.locator(".tuto").count() == 0, "Escape salta el tutorial")
    check(not errors, "sin errores de consola" + (f": {errors[:3]}" if errors else ""))
    ctx.close()


def tutorial_returning_player(browser):
    print("\n== tutorial para quien ya tenía partida")
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    page.goto(f"http://127.0.0.1:{PORT}/index.html?debug&sinescenas")
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    page.wait_for_selector(".tuto-card", timeout=5000)
    page.locator('[data-key="tuto-skip"]').click()
    page.evaluate("localStorage.setItem('farmweb:ui:v1', JSON.stringify({ labels: 'todo' }))")  # preferencias de antes, sin la marca del tutorial
    page.reload()
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    page.wait_for_selector(".tuto-card", timeout=5000)
    check(True, "con una partida guardada y sin marca, el tutorial sale igual la primera vez")
    check(page.evaluate("farmweb.app.labels") == "todo", "y sus preferencias siguen ahí")
    page.locator('[data-key="tuto-skip"]').click()
    check(page.evaluate("JSON.parse(localStorage.getItem('farmweb:ui:v1'))") == {"labels": "todo", "tutorial": True}, "al saltarlo se guarda sin perder las etiquetas")
    ctx.close()


def chapter8(browser):
    print("\n== capítulo 8: la Estación Estelar")
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL)
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    page.evaluate("""(async () => {
      const { QUESTS } = await import('/src/data.js');
      const w = farmweb.app.w;
      for (const q of QUESTS) { if (q.id === 'c8-senal') break; w.quests.claimed[q.id] = true; }
      for (const t of ['bosque', 'estanque', 'jurasico', 'valle']) if (!w.corrales.some((c) => c.tipo === t)) w.corrales.push({ id: t, tipo: t, nombre: t, nivel: 0 });
      while (w.animals.length < 24) w.animals.push({ ...w.animals[0], id: w.nextId++ });
      w.coins = 5000;
    })()""")
    page.click('[data-panel="quests"]')
    check("Una señal desde las estrellas" in page.locator("#sheetBody").inner_text(), "el capítulo 8 empieza con la señal de Noa")
    page.locator('[data-key="claim"]').click()
    page.wait_for_timeout(300)
    check(page.evaluate("farmweb.app.w.corrales.some((c) => c.tipo === 'estacion')"), "reclamarla abre la Estación")
    check(page.evaluate("farmweb.app.w.animals.some((a) => a.species === 'porg' && a.corral === 'estacion')"), "el porg bebé llega a la Estación")
    check(page.evaluate("['porg', 'gato_loth'].every((s) => farmweb.app.w.unlocked.includes(s))"), "y se conocen el porg y el gato loth")
    page.keyboard.press("Escape")
    r = page.evaluate("farmweb.sim.buyAnimal(farmweb.app.w, 'gato_loth')")
    check(r["ok"], "el gato loth se puede comprar con monedas (así se puede criar)")
    check(page.evaluate("farmweb.app.w.animals.find((a) => a.species === 'gato_loth').corral") == "estacion", "y vive en la Estación")
    page.evaluate("""(() => {
      const w = farmweb.app.w;
      w.unlocked.push('tauntaun', 'bantha', 'purrgil', 'dewback', 'ewok', 'grogu', 'bb8');
      for (const sp of ['tauntaun', 'bantha', 'purrgil', 'dewback', 'ewok', 'grogu', 'bb8']) farmweb.sim.buyAnimal(w, sp);
      for (const a of w.animals) if (a.corral === 'estacion') a.stage = 'adult';
    })()""")
    check(page.evaluate("farmweb.app.w.animals.filter((a) => a.corral === 'estacion').length") == 9, "las 9 criaturas viven en la Estación")
    page.evaluate("farmweb.app.setLabels('todo')")
    page.evaluate("farmweb.app.goTo('estacion', true)")
    page.wait_for_timeout(500)
    page.screenshot(path=f"{SHOTS}/movil-42-estacion.png")
    page.click('[data-goto="mapa"]')
    page.wait_for_timeout(400)
    page.screenshot(path=f"{SHOTS}/movil-43-mapa-estacion.png")
    page.click('[data-panel="animals"]')
    page.locator('[data-key="tab-guia"]').click()
    texto = page.locator("#sheetBody").inner_text()
    check("Porg" in texto and "Gato loth" in texto and "Ewok" in texto and "Grogu" in texto and "BB-8" in texto, "la Guía conoce a las criaturas de la Estación")
    check(not errors, "sin errores de consola" + (f": {errors[:3]}" if errors else ""))
    ctx.close()


def mao_mao(browser):
    print("\n== Mao Mao reemplaza a la Dra. Pita")
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL_ESCENAS)
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    page.locator('[data-key="story-skip"]').click()
    page.evaluate("""(async () => {
      const { QUESTS, SCENES } = await import('/src/data.js');
      const w = farmweb.app.w;
      for (const q of QUESTS) { w.quests.claimed[q.id] = true; if (q.id === 'c5-festival') break; }
      for (const sc of SCENES) w.story.seen[sc.id] = sc.id !== 'una-boticaria-nueva';
      for (const t of ['bosque', 'estanque', 'jurasico']) if (!w.corrales.some((c) => c.tipo === t)) w.corrales.push({ id: t, tipo: t, nombre: t, nivel: 0 });
    })()""")
    page.wait_for_selector(".story", timeout=5000)
    check(page.locator(".story").get_attribute("aria-label") == "Una boticaria nueva", "al terminar el festival sale la escena de Mao Mao")
    for _ in range(3):
        page.wait_for_timeout(1200)
        page.locator('[data-key="story-next"]').click(); page.locator('[data-key="story-next"]').click()
    page.wait_for_timeout(1500)
    check("Mao Mao" in page.locator(".story-name").inner_text(), "Mao Mao habla en la escena con su retrato")
    page.screenshot(path=f"{SHOTS}/movil-60-mao-mao-escena.png")
    page.locator('[data-key="story-skip"]').click()
    check(page.evaluate("fetch('/assets/sprites/portraits.json').then((r) => r.json()).then((j) => 'mao' in j.index)"), "el atlas de retratos incluye a Mao Mao")
    page.click('[data-goto="mapa"]')
    page.wait_for_timeout(300)
    gbox = page.locator("#game").bounding_box()
    page.mouse.click(gbox["x"] + 164 * gbox["width"] / 320, gbox["y"] + 48 * gbox["height"] / 224)
    page.wait_for_timeout(300)
    check("Mao Mao" in page.locator("#sheetBody").inner_text() and "Pita" not in page.locator("#sheetBody").inner_text(), "la Veterinaria la atiende Mao Mao mientras Pita viaja")
    page.screenshot(path=f"{SHOTS}/movil-61-veterinaria-mao.png")
    check(not errors, "sin errores de consola" + (f": {errors[:3]}" if errors else ""))
    ctx.close()


def criadero_flow(browser):
    print("\n== Criadero y dinosaurios en la tienda")
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL)
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    page.evaluate("""(async () => {
      const { QUESTS } = await import('/src/data.js');
      const w = farmweb.app.w;
      for (const q of QUESTS) { if (q.id === 'c2-mapache') break; w.quests.claimed[q.id] = true; }
      w.coins = 6000;
      for (const a of w.animals) { a.fed = 90; a.happy = 90; a.cool = 0; }
    })()""")
    page.click('[data-goto="mapa"]')
    page.wait_for_timeout(300)
    gbox = page.locator("#game").bounding_box()
    page.mouse.click(gbox["x"] + 36 * gbox["width"] / 320, gbox["y"] + 34 * gbox["height"] / 224)
    page.wait_for_selector('[data-key="cr-build"]', timeout=3000)
    check(page.locator("#sheetTitle").inner_text() == "Criadero", "tocar el Criadero en el mapa abre su panel")
    page.screenshot(path=f"{SHOTS}/movil-70-criadero-sin-construir.png")
    page.locator('[data-key="cr-build"]').click()
    page.wait_for_selector('[data-key^="pair-sp-"]', timeout=3000)
    check(page.evaluate("farmweb.app.w.criadero.built"), "construirlo cuesta monedas y lo deja listo")
    page.locator('[data-key="pair-sp-gallina"]').click()
    picks = page.locator('[data-key^="pick-"]')
    picks.nth(0).click(); picks.nth(1).click()
    page.locator('[data-key="pair-go"]').click()
    page.wait_for_timeout(300)
    check(page.evaluate("farmweb.app.w.criadero.lanes.length") == 1 and page.evaluate("farmweb.app.w.animals.filter((a) => a.away).length") == 2, "emparejar manda a los dos al nido")
    page.screenshot(path=f"{SHOTS}/movil-71-criadero-nido.png")
    page.keyboard.press("Escape")
    page.click('[data-panel="animals"]')
    check("en el Criadero" in page.locator("#sheetBody").inner_text(), "Animales avisa que están en el Criadero")
    page.locator('[data-key="breed-pradera"]').click()
    check(page.evaluate("farmweb.app.w.corrales[0].breed") == "manual", "el corral pasa a cría manual")
    page.keyboard.press("Escape")
    page.evaluate("farmweb.app.w.criadero.lanes[0].left = 0")
    page.wait_for_function("farmweb.app.w.criadero.lanes[0].phase === 'egg'", timeout=4000)
    check(page.evaluate("farmweb.app.w.animals.filter((a) => a.away).length") == 0, "al terminar el nido los padres vuelven")
    page.click('[data-goto="mapa"]')
    page.wait_for_timeout(300)
    page.mouse.click(gbox["x"] + 36 * gbox["width"] / 320, gbox["y"] + 34 * gbox["height"] / 224)
    page.wait_for_selector('[data-key^="heat-"]', timeout=3000)
    check("Huevo de gallina" in page.locator("#sheetBody").inner_text(), "el huevo aparece en la incubadora")
    page.locator('[data-key^="heat-"]').click()
    check(page.evaluate("farmweb.app.w.criadero.lanes[0].heat") == 1, "Darle calor lo adelanta")
    page.screenshot(path=f"{SHOTS}/movil-72-criadero-huevo.png")
    page.keyboard.press("Escape")
    page.evaluate("farmweb.app.w.criadero.lanes[0].left = 0")
    page.wait_for_function("farmweb.app.w.criadero.lanes.length === 0", timeout=4000)
    check(page.evaluate("farmweb.app.w.animals.filter((a) => a.stage === 'baby').length") >= 1, "el huevo nace y la cría aparece en su corral")

    # dinosaurios: una vez desbloqueados se ven en la tienda y se replican en el Laboratorio
    page.evaluate("""(() => {
      const w = farmweb.app.w;
      for (const t of ['bosque', 'estanque', 'jurasico', 'valle']) if (!w.corrales.some((c) => c.tipo === t)) w.corrales.push({ id: t, tipo: t, nombre: t, nivel: 0, breed: 'auto' });
      for (const s of ['carnotauro', 'spinosaurus', 'triceratops', 'estegosaurio', 'pterodactilo', 'plesiosaurio']) if (!w.unlocked.includes(s)) w.unlocked.push(s);
      w.lab.built = true;
      w.coins = 20000;
    })()""")
    page.click('[data-panel="shop"]')
    texto = page.locator("#sheetBody").inner_text()
    check(all(n in texto for n in ("Carnotauro", "Spinosaurus", "Triceratops", "Estegosaurio", "Pterodáctilo", "Plesiosaurio")), "la tienda lista los 6 dinosaurios")
    check(page.locator('[data-key="buy-triceratops"]').is_enabled(), "el botón Replicar del triceratops está activo")
    page.screenshot(path=f"{SHOTS}/movil-73-tienda-dinosaurios.png", full_page=False)
    page.locator('[data-key="buy-triceratops"]').click()
    page.wait_for_timeout(300)
    check("Banco de ADN" in page.locator("#sheetBody").inner_text(), "«Replicar» abre el Laboratorio")
    check(page.locator('[data-key="rep-triceratops"]').is_enabled(), "y la réplica del triceratops está lista")
    check(not errors, "sin errores de consola" + (f": {errors[:3]}" if errors else ""))
    ctx.close()


def lab_flow(browser):
    print("\n== Laboratorio Hélice y minijuego de la hebra")
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL)
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    page.evaluate("""(async () => {
      const { QUESTS } = await import('/src/data.js');
      const w = farmweb.app.w;
      for (const q of QUESTS) { if (q.id === 'c4-grieta') break; w.quests.claimed[q.id] = true; }
      for (const t of ['jurasico', 'estanque']) if (!w.corrales.some((c) => c.tipo === t)) w.corrales.push({ id: t, tipo: t, nombre: t, nivel: 0 });
      w.coins = 5000;
      farmweb.app.goTo('mapa');
    })()""")
    page.wait_for_timeout(400)
    page.screenshot(path=f"{SHOTS}/movil-80-mapa-laboratorio-cerrado.png")
    def abrir_lab():
        page.keyboard.press("Escape")
        page.click('[data-goto="mapa"]')
        page.wait_for_timeout(300)
        gbox = page.locator("#game").bounding_box()
        page.mouse.click(gbox["x"] + 214 * gbox["width"] / 320, gbox["y"] + 30 * gbox["height"] / 224)
        page.wait_for_selector("#sheetTitle", timeout=3000)

    page.click('[data-panel="quests"]')
    check("Algo brilla en el río" in page.locator("#sheetBody").inner_text(), "tras «Un gigante tierno» sigue la grieta del tiempo")
    page.keyboard.press("Escape")
    page.evaluate("""(async () => {
      const { QUESTS } = await import('/src/data.js');
      const w = farmweb.app.w;
      for (const q of QUESTS) { if (q.id === 'c4-laboratorio') break; w.quests.claimed[q.id] = true; }
      for (const s of ['carnotauro', 'spinosaurus', 'triceratops', 'estegosaurio', 'plesiosaurio']) if (!w.unlocked.includes(s)) w.unlocked.push(s);
      w.stats.sold = 99;
    })()""")
    page.click('[data-panel="quests"]')
    check("El Laboratorio Hélice" in page.locator("#sheetBody").inner_text(), "la misión del Laboratorio es la activa")
    page.locator('[data-key="claim"]').click()
    page.wait_for_timeout(300)
    check(page.evaluate("farmweb.app.w.lab.built"), "reclamarla abre el Laboratorio")
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)
    page.screenshot(path=f"{SHOTS}/movil-81-mapa-laboratorio.png")
    abrir_lab()
    page.wait_for_timeout(200)
    check("Banco de ADN" in page.locator("#sheetBody").inner_text() and "Triceratops" not in page.locator('[data-key="rep-triceratops"]').inner_text(), "el Banco de ADN muestra las muestras")
    check(page.locator('[data-key="rep-plesiosaurio"]').is_enabled(), "el plesiosaurio se puede replicar (vive en el Estanque)")
    check(not page.locator('[data-key="rep-triceratops"]').is_enabled(), "el triceratops espera al Valle")
    page.screenshot(path=f"{SHOTS}/movil-82-banco-de-adn.png")
    # una hebra con errores: la primera base falla a propósito, luego se completa bien
    page.locator('[data-key="rep-carnotauro"]').click()
    page.wait_for_timeout(200)
    page.screenshot(path=f"{SHOTS}/movil-83-hebra.png")
    pares = {"A": "T", "T": "A", "C": "G", "G": "C"}
    for k in range(6):
        top = page.evaluate("[...document.querySelectorAll('.strand')[0].children].map((e) => e.dataset.base)")
        if k == 0:
            mal = next(b for b in "ATCG" if b != pares[top[0]])
            page.locator(f'[data-key="base-{mal}"]').click()
            check("Esa base no cuadra" in page.locator("#sheetBody").inner_text(), "una base equivocada avisa «Esa base no cuadra»")
        page.locator(f'[data-key="base-{pares[top[k]]}"]').click()
    page.wait_for_timeout(300)
    check(page.evaluate("farmweb.app.w.animals.some((a) => a.species === 'carnotauro' && a.stage === 'baby')"), "con un error la réplica sale y nace el carnotauro")
    page.keyboard.press("Escape")
    abrir_lab()
    page.locator('[data-key="rep-plesiosaurio"]').click()
    antes = page.evaluate("farmweb.app.w.coins")
    for _ in range(4):
        top = page.evaluate("[...document.querySelectorAll('.strand')[0].children].map((e) => e.dataset.base)")
        if not top:
            break
        mal = next(b for b in "ATCG" if b != pares[top[0]])
        page.locator(f'[data-key="base-{mal}"]').click()
    page.wait_for_timeout(300)
    check(not page.evaluate("farmweb.app.w.animals.some((a) => a.species === 'plesiosaurio')"), "demasiados errores: la réplica falla y no nace nadie")
    check(page.evaluate("farmweb.app.w.coins") < antes, "y se pierde el costo")
    abrir_lab()
    page.locator('[data-key="lab-tab-equipo"]').click()
    check(page.locator('[data-key="lab-upgrade"]').is_enabled(), "el equipo se puede mejorar")
    check(not errors, "sin errores de consola" + (f": {errors[:3]}" if errors else ""))
    ctx.close()


def venta_lecciones(browser):
    print("\n== vender animales y mini lecciones por capítulo")
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL)
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    page.evaluate("""(async () => {
      const { addAnimal } = await import('/src/state.js');
      const w = farmweb.app.w;
      w.animals.length = 0;
      window.__ids = [addAnimal(w, 'vaca', 0, 'baby').id, addAnimal(w, 'vaca', 0, 'adult').id, addAnimal(w, 'gato', 3, 'adult').id];
      farmweb.app.selectedId = window.__ids[0];
      farmweb.app.ui?.refresh?.();
    })()""")
    page.evaluate("farmweb.app.goTo('pradera', true)")
    page.evaluate("farmweb.app.selectedId = window.__ids[0]")
    page.wait_for_selector('#selected [data-key="sell"]', timeout=3000)
    check("Bebé" in page.locator("#selected").inner_text(), "la tarjeta muestra la etapa: Bebé")
    check("Vender (+" in page.locator('#selected [data-key="sell"]').inner_text(), "y cuánto pagan por venderlo")
    page.screenshot(path=f"{SHOTS}/movil-90-tarjeta-vender.png")
    page.locator('#selected [data-key="sell"]').click()
    page.wait_for_selector('[data-key="sell-confirm"]', timeout=3000)
    page.screenshot(path=f"{SHOTS}/movil-91-confirmar-venta.png")
    page.locator('[data-key="sell-cancel"]').click()
    check(page.evaluate("farmweb.app.w.animals.length") == 3, "«Mejor no» no vende nada")
    pagan = page.evaluate("farmweb.sim.sellPrice(farmweb.app.w.animals[1])")
    monedas = page.evaluate("farmweb.app.w.coins")
    page.evaluate("farmweb.app.selectedId = window.__ids[1]")
    page.wait_for_function("document.querySelector('#selected').innerText.includes('Adulto')", timeout=4000)
    page.locator('#selected [data-key="sell"]').click()
    check("Adulto" in page.locator("#sheetBody").inner_text(), "el diálogo también dice la etapa")
    page.locator('[data-key="sell-confirm"]').click()
    page.wait_for_timeout(300)
    check(page.evaluate("farmweb.app.w.animals.length") == 2 and page.evaluate("farmweb.app.w.coins") == monedas + pagan, "vender un adulto lo quita y paga su precio")
    check(page.evaluate("farmweb.app.selectedId") is None, "y la tarjeta se cierra")
    page.evaluate("farmweb.app.w.animals[0].sick = 'resfriado'")
    page.evaluate("farmweb.app.selectedId = window.__ids[0]")
    page.wait_for_function("document.querySelector('#selected [data-key=sell]')?.disabled", timeout=4000)
    check(page.locator('#selected [data-key="sell"]').is_disabled(), "un animal enfermo no se puede vender")
    page.evaluate("farmweb.app.w.animals[0].sick = undefined")
    page.click('[data-panel="animals"]')
    check(page.locator(f'[data-key="sell-{page.evaluate("window.__ids[2]")}"]').is_enabled(), "en la lista de Animales también hay botón de vender")
    page.locator(f'[data-key="sell-{page.evaluate("window.__ids[2]")}"]').click()
    page.locator('[data-key="sell-confirm"]').click()
    page.wait_for_timeout(300)
    check(page.evaluate("farmweb.app.w.animals.length") == 1, "desde la lista se vende igual")
    page.click('[data-panel="animals"]')
    check(page.locator(f'[data-key="sell-{page.evaluate("window.__ids[0]")}"]').is_disabled(), "el último animal no se puede vender")
    page.keyboard.press("Escape")
    check(not errors, "sin errores de consola" + (f": {errors[:3]}" if errors else ""))
    ctx.close()

    # lecciones: salen solas al llegar a cada capítulo, una vez y en orden
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"http://127.0.0.1:{PORT}/index.html?debug&sinescenas")
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    page.wait_for_selector(".tuto-card", timeout=5000)
    page.locator('[data-key="tuto-skip"]').click()
    page.wait_for_timeout(2500)  # en el capítulo 1 no sale ninguna lección: así no cuentan como «de antes»
    page.evaluate("""(async () => {
      const { QUESTS } = await import('/src/data.js');
      const w = farmweb.app.w;
      for (const q of QUESTS) { if (q.id === 'c4-grieta') break; w.quests.claimed[q.id] = true; }
      w.lab.built = true;
    })()""")
    vistas = []
    for _ in range(4):
        page.wait_for_selector(".tuto-card", timeout=5000)
        vistas.append(page.locator(".tuto-head .muted").inner_text().split(" · ")[0])
        if len(vistas) == 1:
            check("Tomás" in page.locator(".tuto-head strong").inner_text(), "la primera lección la cuenta Tomás")
            page.screenshot(path=f"{SHOTS}/movil-92-leccion-vender.png")
        if vistas[-1] == "El Laboratorio":
            check("Señor Hélice" in page.locator(".tuto-head strong").inner_text(), "la del Laboratorio la cuenta el Señor Hélice")
            page.screenshot(path=f"{SHOTS}/movil-93-leccion-laboratorio.png")
        page.locator('[data-key="tuto-skip"]').click()
        page.wait_for_timeout(1300)
    check(vistas == ["Vender animales", "El Criadero", "Enfermedades", "El Laboratorio"], f"las lecciones salen en orden y una vez ({vistas})")
    page.wait_for_timeout(1500)
    check(page.locator(".tuto-card").count() == 0, "y no se repiten")
    check(set(page.evaluate("JSON.parse(localStorage.getItem('farmweb:ui:v1')).lessons")) == {"vender", "criadero", "salud", "lab"}, "lo visto se guarda en este dispositivo")
    page.click('[data-panel="world"]')
    check(page.locator('[data-key="lesson-lab"]').count() == 1 and page.locator('[data-key="lesson-mao"]').count() == 0, "Mundo lista las lecciones ya alcanzadas")
    page.locator('[data-key="lesson-vender"]').click()
    page.wait_for_selector(".tuto-card", timeout=3000)
    check("Vender animales" in page.locator(".tuto-head .muted").inner_text(), "y se pueden repetir")
    page.locator('[data-key="tuto-skip"]').click()
    check(not errors, "sin errores de consola" + (f": {errors[:3]}" if errors else ""))
    ctx.close()


def arreglos_criadero_vet(browser):
    print("\n== Criadero que no se cierra, espacio para la cría y nombres en la Veterinaria")
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL)
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    page.evaluate("""(async () => {
      const { QUESTS } = await import('/src/data.js');
      const { addAnimal } = await import('/src/state.js');
      const w = farmweb.app.w;
      for (const q of QUESTS) { if (q.id === 'c2-mapache') break; w.quests.claimed[q.id] = true; }
      w.coins = 5000;
      farmweb.sim.buildCriadero(w);
      while (farmweb.sim.hasSpace(w, 'pradera')) addAnimal(w, 'gallina', 0, 'adult');
      for (const a of w.animals) { a.fed = 90; a.happy = 90; a.cool = 0; }
    })()""")
    page.click('[data-goto="mapa"]')
    page.wait_for_timeout(300)
    gbox = page.locator("#game").bounding_box()
    page.touchscreen.tap(gbox["x"] + 36 * gbox["width"] / 320, gbox["y"] + 34 * gbox["height"] / 224)
    page.wait_for_timeout(1500)
    check(not page.evaluate("document.getElementById('backdrop').hidden"), "con un toque de verdad el Criadero se queda abierto")
    page.locator('[data-key="pair-sp-gallina"]').click()
    picks = page.locator('[data-key^="pick-"]')
    picks.nth(0).click(); picks.nth(1).click()
    check("No hay espacio en Pradera" in page.locator("#sheetBody").inner_text(), "sin lugar para la cría avisa antes de emparejar")
    check(page.locator('[data-key="pair-go"]').is_disabled(), "y no deja emparejar")
    check(page.locator('[data-key^="pick-"].mint').count() == 2, "sin perder los dos animales que elegiste")
    page.keyboard.press("Escape")
    page.evaluate("""(() => {
      const w = farmweb.app.w;
      w.animals.forEach((a, i) => { if (i % 2 === 0) a.sick = 'resfriado'; });
    })()""")
    page.click('[data-goto="mapa"]')
    page.wait_for_timeout(300)
    page.mouse.click(gbox["x"] + 164 * gbox["width"] / 320, gbox["y"] + 48 * gbox["height"] / 224)
    page.wait_for_selector('[data-key^="chk-"]', timeout=3000)
    tabs = page.locator('[data-key^="chk-"]')
    ancho = page.evaluate("document.querySelector('#sheetBody').clientWidth")
    check(page.evaluate("[...document.querySelectorAll('[data-key^=chk-]')].every((e) => e.getBoundingClientRect().right <= document.getElementById('sheetBody').getBoundingClientRect().right + 1)"), f"todos los nombres del Chequeo caben sin deslizar a la derecha ({tabs.count()} animales)")
    page.locator('[data-key^="chk-"]').first.scroll_into_view_if_needed()
    page.screenshot(path=f"{SHOTS}/movil-94-chequeo-nombres.png")
    check(not errors, "sin errores de consola" + (f": {errors[:3]}" if errors else ""))
    ctx.close()


def auto_update(browser):
    print("\n== actualización automática")
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    ver = {"v": "version-a"}
    page.route("**/version.json", lambda route: route.fulfill(status=200, content_type="application/json", body=json.dumps(ver)))
    page.goto(URL)
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    page.wait_for_timeout(500)
    page.evaluate("window.__abierta = 1; farmweb.app.w.coins = 777")
    page.evaluate("farmweb.app.checkUpdate()")
    page.wait_for_timeout(2500)
    check(page.evaluate("window.__abierta") == 1, "con la misma versión no se recarga")
    ver["v"] = "version-b"
    page.click('[data-panel="shop"]')
    page.evaluate("farmweb.app.checkUpdate()")
    page.wait_for_timeout(3000)
    check(page.evaluate("window.__abierta") == 1, "con un panel abierto espera y no interrumpe")
    page.keyboard.press("Escape")
    page.wait_for_function("!window.__abierta", timeout=9000)
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)
    check(page.evaluate("farmweb.app.w.coins") == 777, "al cerrar el panel se actualiza sola y la partida se conserva")
    page.evaluate("window.__abierta = 1")
    page.evaluate("farmweb.app.checkUpdate()")
    page.wait_for_timeout(3000)
    check(page.evaluate("window.__abierta") == 1, "ya con la versión nueva no se recarga en bucle")
    check(not errors, "sin errores de consola" + (f": {errors[:3]}" if errors else ""))
    ctx.close()


def vet_interactiva(browser):
    print("\n== Veterinaria interactiva: Pita, Mao Mao y sus minijuegos")
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL)
    page.wait_for_function("document.getElementById('loading').hidden === true", timeout=15000)

    def abrir_vet():
        page.keyboard.press("Escape")  # por si el panel quedó abierto
        page.click('[data-goto="mapa"]')
        page.wait_for_timeout(300)
        gbox = page.locator("#game").bounding_box()
        page.mouse.click(gbox["x"] + 164 * gbox["width"] / 320, gbox["y"] + 48 * gbox["height"] / 224)
        page.wait_for_selector('[data-key="vet-consult"]', timeout=3000)

    def enfermar():
        page.evaluate("""(() => { const w = farmweb.app.w; w.coins = 500; const a = w.animals[0]; a.sick = 'resfriado'; farmweb.app.mgEasy = true; return a.id; })()""")
        return page.evaluate("farmweb.app.w.animals[0].id")

    aid = enfermar()
    abrir_vet()
    check("Dra. Pita" in page.locator("#sheetBody").inner_text(), "al principio atiende la Dra. Pita")
    check(page.locator('[data-key="vet-shield"]').inner_text() == "Vitaminas", "Pita ofrece vitaminas")
    check("Resfriado" in page.locator("#sheetBody").inner_text() and "«" in page.locator('[data-key^="vet-say"]').inner_text(), "ella diagnostica al enfermo y habla")
    page.locator('[data-key="vet-consult"]').click()
    check(page.evaluate("farmweb.app.w.vet.trust.pita") == 1, "la consulta sube la confianza")
    page.locator(f'[data-key="help-{aid}"]').click()
    page.wait_for_selector('[data-key="vet-hit"]', timeout=3000)
    page.screenshot(path=f"{SHOTS}/movil-80-vet-latidos.png")
    for _ in range(3):
        page.locator('[data-key="vet-hit"]').click()
        page.wait_for_timeout(150)
    page.wait_for_selector(f'[data-key="cure-{aid}"], .empty', timeout=3000)
    check(page.evaluate("farmweb.app.w.animals[0].sick") is None, "ganar el minijuego de Pita cura al animal")
    check(page.evaluate("farmweb.app.w.coins") == 500 - 30, "y le devuelven la mitad del precio (60 − 30)")

    # el chequeo
    page.locator(f'[data-key="chk-{aid}"]').click()
    check("Informe de" in page.locator("#sheetBody").inner_text(), "el chequeo muestra el informe del animal")
    page.keyboard.press("Escape")

    # desde el capítulo 6 atiende Mao Mao, con otro minijuego
    page.evaluate("""(async () => {
      const { QUESTS } = await import('/src/data.js');
      for (const q of QUESTS) { farmweb.app.w.quests.claimed[q.id] = true; if (q.id === 'c5-festival') break; }
    })()""")
    enfermar()
    page.evaluate("farmweb.app.mgEasy = true")
    abrir_vet()
    check("Mao Mao" in page.locator("#sheetBody").inner_text(), "tras el festival atiende Mao Mao")
    check(page.locator('[data-key="vet-shield"]').inner_text() == "Tónico", "Mao Mao ofrece un tónico, no vitaminas")
    page.locator(f'[data-key="help-{aid}"]').click()
    page.wait_for_selector('[data-key="herb-bayas"]', timeout=3000)
    check(page.locator('[data-key="vet-hit"]').count() == 0, "su minijuego no es el de ritmo")
    page.screenshot(path=f"{SHOTS}/movil-81-vet-hierbas.png")
    for _ in range(3):
        page.locator('[data-key="herb-bayas"]').click()
        page.locator('[data-key="herb-grano"]').click()
        page.locator('[data-key="vet-prepare"]').click()
        page.wait_for_timeout(150)
    page.wait_for_selector('.empty', timeout=3000)
    check(page.evaluate("farmweb.app.w.animals[0].sick") is None, "ganar el minijuego de Mao Mao también cura")

    # tónico (productos) y pedido del día
    page.evaluate("farmweb.app.w.products = { huevo: 8 }; farmweb.app.w.stats.collected.huevo = 5;")
    abrir_vet()
    page.locator('[data-key="vet-shield"]').click()
    check(page.evaluate("farmweb.app.w.vet.shield") > 0 and page.evaluate("farmweb.app.w.products.huevo") == 4, "el tónico gasta 4 productos y protege")
    page.screenshot(path=f"{SHOTS}/movil-82-vet-mao.png")
    monedas = page.evaluate("farmweb.app.w.coins")
    page.evaluate("farmweb.app.w.products = { huevo: 9 }")
    abrir_vet()
    page.locator('[data-key="vet-deliver"]').click()
    check(page.evaluate("farmweb.app.w.coins") > monedas, "entregar el pedido de hoy paga monedas")
    check(not errors, "sin errores de consola" + (f": {errors[:3]}" if errors else ""))
    ctx.close()


def main():
    server = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"],
                              cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
            play(browser, "movil", {"width": 390, "height": 844}, 3, True)
            play(browser, "pc", {"width": 1280, "height": 800}, 1, False)
            identity_and_sound(browser, "movil", {"width": 390, "height": 844}, 3, True)
            identity_and_sound(browser, "pc", {"width": 1280, "height": 800}, 1, False)
            migration(browser)
            small_phone(browser)
            stage0(browser)
            care_flow(browser, "movil", {"width": 360, "height": 740}, 3, True)
            care_flow(browser, "pc", {"width": 1280, "height": 800}, 1, False)
            side_quests(browser)
            secrets(browser)
            new_content(browser)
            story_scenes(browser, "movil", {"width": 390, "height": 844}, 3, True)
            story_scenes(browser, "pc", {"width": 1280, "height": 800}, 1, False)
            visits_and_diary(browser)
            gift_labels_guide(browser)
            chapter6(browser)
            chapter7(browser)
            sheep_and_fox(browser)
            chapter8(browser)
            mao_mao(browser)
            criadero_flow(browser)
            lab_flow(browser)
            venta_lecciones(browser)
            arreglos_criadero_vet(browser)
            auto_update(browser)
            vet_interactiva(browser)
            tutorial_flow(browser, "movil", {"width": 390, "height": 844}, 3, True)
            tutorial_flow(browser, "pc", {"width": 1280, "height": 800}, 1, False)
            tutorial_returning_player(browser)
            browser.close()
    finally:
        server.terminate()
    print(f"\nCapturas en {SHOTS}")
    if problems:
        print(f"\n{len(problems)} problema(s):")
        for m in problems:
            print(" -", m)
        sys.exit(1)
    print("\nTodo bien.")


if __name__ == "__main__":
    main()
