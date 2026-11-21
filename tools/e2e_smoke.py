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
URL = f"http://127.0.0.1:{PORT}/index.html?debug"
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
    check(page.evaluate("farmweb.app.w.coins") == 70, "y descuenta el costo (100 - 30 = 70)")
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
