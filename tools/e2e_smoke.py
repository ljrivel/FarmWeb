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
