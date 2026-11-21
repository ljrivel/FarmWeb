#!/usr/bin/env python3
"""Genera el pixel art de FarmWeb: animales (32x32), iconos y tiles (16x16) y lugares del mapa (48x48).

Uso:  python3 tools/gen_sprites.py
Salida: assets/sprites/{animals,icons,tiles,places}.png + .json, docs/preview-sprites.png

Estilo kawaii: formas redondas, ojos grandes con brillo, mejillas rosadas,
contorno con el tono oscuro del propio color (nunca negro).
"""
import json
import math
import os
import random

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "sprites")
DOCS = os.path.join(ROOT, "docs")
CELL = 32
IDLE_SY = [1.0, 1.06, 0.95, 1.0]  # cuadros 0..3: normal, estira, encoge, parpadeo
IDLE_SEQ = [0, 1, 0, 2, 0, 1, 0, 3]
BLINK_FRAME = 3
EYE = (58, 39, 64, 255)
WHITE = (255, 255, 255, 255)
BLUSH = (255, 159, 180, 255)
PLUM = (95, 60, 90)


def hx(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def shade(c, k):
    return (int(c[0] * k), int(c[1] * k), int(c[2] * k), 255)


def lighten(c, k):
    return (int(c[0] + (255 - c[0]) * k), int(c[1] + (255 - c[1]) * k),
            int(c[2] + (255 - c[2]) * k), 255)


def auto_line(body):
    d = shade(body, 0.6)
    return (int(d[0] * 0.5 + PLUM[0] * 0.5), int(d[1] * 0.5 + PLUM[1] * 0.5),
            int(d[2] * 0.5 + PLUM[2] * 0.5), 255)


def rnd(v):
    """Redondeo simetrico (mitad lejos de cero) para que el espejo no se descuadre."""
    return int(math.copysign(math.floor(abs(v) + 0.5), v))


class Canvas:
    """Lienzo con origen en los pies (animales) o absoluto (iconos)."""

    def __init__(self, size, ox=0, oy=0, s=1.0, sy=1.0):
        self.size = size
        self.img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.img)
        self.ox, self.oy, self.s, self.sy = ox, oy, s, sy

    def P(self, x, y):
        return self.ox + rnd(x * self.s), self.oy + rnd(y * self.s * self.sy)

    def ell(self, x, y, rx, ry, col):
        cx, cy = self.P(x, y)
        rx, ry = rnd(rx * self.s), rnd(ry * self.s * self.sy)
        self.d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=col)

    def rect(self, x0, y0, x1, y1, col):
        a, b = self.P(x0, y0), self.P(x1, y1)
        self.d.rectangle([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])], fill=col)

    def poly(self, pts, col):
        self.d.polygon([self.P(x, y) for x, y in pts], fill=col)

    def px(self, x, y, col):
        p = self.P(x, y)
        if 0 <= p[0] < self.size and 0 <= p[1] < self.size:
            self.img.putpixel(p, col)


def shade_pass(img):
    """Sombra inferior y brillo superior-izquierdo, antes del contorno."""
    w, h = img.size
    src = img.copy().load()
    dst = img.load()

    def a(x, y):
        return src[x, y][3] if 0 <= x < w and 0 <= y < h else 0

    for y in range(h):
        for x in range(w):
            if src[x, y][3] == 0:
                continue
            c = src[x, y]
            if a(x, y + 1) == 0:
                dst[x, y] = shade(c, 0.80)
            elif a(x, y + 2) == 0:
                dst[x, y] = shade(c, 0.91)
            elif x <= w // 2 and (a(x, y - 1) == 0 or a(x - 1, y) == 0):
                dst[x, y] = lighten(c, 0.28)
    return img


def outline(img, col):
    w, h = img.size
    src = img.copy().load()
    out = img.copy()
    dst = out.load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3] != 0:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3] != 0:
                    dst[x, y] = col
                    break
    return out


# ---------------------------------------------------------------- cara comun
def eyes(c, y, sp, blink):
    for sign in (-1, 1):
        cx, cy = c.P(sign * sp, y)
        x0 = cx - 1 if sign < 0 else cx
        if blink:
            c.img.putpixel((x0, cy + 1), EYE)
            c.img.putpixel((x0 + 1, cy + 1), EYE)
        else:
            for dx in (0, 1):
                for dy in (-1, 0, 1):
                    c.img.putpixel((x0 + dx, cy + dy), EYE)
            c.img.putpixel((x0, cy - 1), WHITE)


def blush(c, y, x, col=BLUSH):
    for sign in (-1, 1):
        cx, cy = c.P(sign * x, y)
        x0 = cx - 1 if sign < 0 else cx
        for dx in (0, 1):
            c.img.putpixel((x0 + dx, cy), col)


def pxs(c, pts, col):
    for x, y in pts:
        c.px(x, y, col)


# ------------------------------------------------------------------- gallina
def gallina_body(c, p):
    c.ell(0, -10, 10, 9, p["body"])
    c.ell(-10, -8, 3, 4, p["wing"])
    c.ell(10, -8, 3, 4, p["wing"])
    for x, y in ((-3, -19), (0, -20), (3, -19)):
        c.ell(x, y, 2, 2, p["comb"])
    c.ell(0, -5, 1, 2, p["comb"])
    c.rect(-5, -1, -3, 1, p["feet"])
    c.rect(3, -1, 5, 1, p["feet"])


def gallina_face(c, p, blink):
    eyes(c, -11, 5, blink)
    blush(c, -8, 8)
    c.poly([(-2, -9), (2, -9), (0, -6)], p["beak"])


# ---------------------------------------------------------------------- gato
def gato_body(c, p):
    c.ell(12, -7, 2, 6, p["body"])
    c.ell(12, -12, 2, 2, p["dark"])
    c.poly([(-10, -14), (-10, -24), (-2, -19)], p["body"])
    c.poly([(10, -14), (10, -24), (2, -19)], p["body"])
    c.ell(0, -9, 11, 9, p["body"])
    c.poly([(-8, -16), (-8, -21), (-4, -18)], p["ear"])
    c.poly([(8, -16), (8, -21), (4, -18)], p["ear"])
    c.ell(-5, -1, 3, 2, p["paw"])
    c.ell(5, -1, 3, 2, p["paw"])
    c.rect(-3, -17, -3, -15, p["dark"])
    c.rect(0, -17, 0, -14, p["dark"])
    c.rect(3, -17, 3, -15, p["dark"])


def gato_face(c, p, blink):
    eyes(c, -10, 5, blink)
    blush(c, -7, 8)
    c.rect(-1, -8, 1, -8, hx("#ff8fa3"))
    pxs(c, [(0, -7), (-1, -6), (1, -6), (-2, -7), (2, -7)], EYE)


# --------------------------------------------------------------------- vaca
def vaca_body(c, p):
    c.ell(-11, -14, 3, 2, p["body"])
    c.ell(11, -14, 3, 2, p["body"])
    c.ell(0, -9, 11, 9, p["body"])
    c.ell(-11, -14, 1, 1, p["muzzle"])
    c.ell(11, -14, 1, 1, p["muzzle"])
    c.ell(-6, -20, 2, 2, p["horn"])
    c.ell(6, -20, 2, 2, p["horn"])
    c.ell(-7, -16, 3, 2, p["spot"])
    c.ell(8, -6, 3, 3, p["spot"])
    c.ell(0, -5, 6, 4, p["muzzle"])
    c.rect(-6, -1, -3, 1, p["hoof"])
    c.rect(3, -1, 6, 1, p["hoof"])


def vaca_face(c, p, blink):
    eyes(c, -12, 5, blink)
    blush(c, -9, 8)
    pxs(c, [(-2, -5), (2, -5)], hx("#c97a8c"))


# ------------------------------------------------------------------- mapache
def mapache_body(c, p):
    c.ell(11, -7, 3, 6, p["body"])
    c.rect(9, -10, 13, -9, p["mask"])
    c.rect(9, -6, 13, -5, p["mask"])
    c.ell(-7, -19, 3, 3, p["body"])
    c.ell(7, -19, 3, 3, p["body"])
    c.ell(0, -9, 10, 9, p["body"])
    c.ell(-7, -19, 1, 1, p["mask"])
    c.ell(7, -19, 1, 1, p["mask"])
    c.ell(0, -12, 9, 3, p["mask"])
    c.ell(0, -6, 5, 4, p["light"])
    c.ell(-5, -1, 3, 2, p["mask"])
    c.ell(5, -1, 3, 2, p["mask"])


def mapache_face(c, p, blink):
    eyes(c, -12, 5, blink)
    blush(c, -7, 8)
    c.rect(-1, -8, 1, -8, EYE)


# ------------------------------------------------------------------- ajolote
def ajolote_body(c, p):
    for sign in (-1, 1):
        for gx, gy in ((11, -16), (12, -12), (11, -8)):
            c.ell(sign * gx, gy, 2, 1, p["gill"])
    c.ell(12, -3, 3, 2, p["body"])
    c.ell(0, -8, 11, 8, p["body"])
    c.ell(-7, -1, 3, 2, p["body"])
    c.ell(7, -1, 3, 2, p["body"])
    c.ell(0, -4, 7, 4, p["belly"])


def ajolote_face(c, p, blink):
    eyes(c, -10, 7, blink)
    blush(c, -7, 9)
    pxs(c, [(-2, -6), (2, -6), (-1, -5), (0, -5), (1, -5)], EYE)


# ----------------------------------------------------------------- chanchito
def chanchito_body(c, p):
    pxs(c, [(12, -8), (13, -9), (13, -10), (12, -11)], p["dark"])
    c.poly([(-10, -14), (-10, -23), (-3, -18)], p["dark"])
    c.poly([(10, -14), (10, -23), (3, -18)], p["dark"])
    c.ell(0, -9, 11, 9, p["body"])
    if p.get("patch"):
        c.ell(-6, -16, 2, 2, p["patch"])
        c.ell(8, -6, 3, 3, p["patch"])
    c.ell(0, -6, 5, 4, p["snout"])
    c.rect(-6, -1, -3, 1, p["dark"])
    c.rect(3, -1, 6, 1, p["dark"])


def chanchito_face(c, p, blink):
    eyes(c, -13, 5, blink)
    blush(c, -9, 8)
    c.rect(-2, -6, -2, -5, p["nostril"])
    c.rect(2, -6, 2, -5, p["nostril"])


# --------------------------------------------------------------- carnotauro
def carnotauro_body(c, p):
    c.ell(11, -4, 3, 3, p["body"])
    c.poly([(11, -6), (14, -2), (11, -1)], p["body"])
    c.poly([(-4, -17), (-9, -22), (-8, -16)], p["horn"])
    c.poly([(4, -17), (9, -22), (8, -16)], p["horn"])
    c.ell(0, -9, 10, 9, p["body"])
    c.ell(0, -4, 6, 5, p["belly"])
    c.ell(0, -7, 5, 3, p["snout"])
    c.ell(-8, -10, 1, 2, p["dark"])
    c.ell(8, -10, 1, 2, p["dark"])
    c.ell(-10, -5, 2, 1, p["body"])
    c.ell(10, -5, 2, 1, p["body"])
    c.ell(-5, -1, 3, 2, p["foot"])
    c.ell(5, -1, 3, 2, p["foot"])


def carnotauro_face(c, p, blink):
    eyes(c, -12, 4, blink)
    blush(c, -8, 7)
    pxs(c, [(-1, -8), (1, -8)], p["dark"])
    c.rect(-3, -6, 3, -6, EYE)
    pxs(c, [(-2, -5), (2, -5)], WHITE)


# --------------------------------------------------------------- spinosaurus
def spino_body(c, p):
    c.ell(0, -17, 11, 9, p["sail"])
    for x, top in ((0, -25), (-3, -24), (3, -24), (-6, -22), (6, -22)):
        c.rect(x, top, x, -19, p["ribs"])
    c.ell(11, -4, 3, 3, p["body"])
    c.ell(13, -6, 1, 2, p["sail"])
    c.ell(0, -9, 10, 8, p["body"])
    c.ell(0, -4, 6, 4, p["belly"])
    c.ell(0, -6, 6, 4, p["snout"])
    c.ell(-10, -5, 2, 1, p["body"])
    c.ell(10, -5, 2, 1, p["body"])
    c.ell(-5, -1, 3, 2, p["dark"])
    c.ell(5, -1, 3, 2, p["dark"])


def spino_face(c, p, blink):
    eyes(c, -12, 5, blink)
    blush(c, -8, 8)
    pxs(c, [(-3, -7), (3, -7)], p["dark"])
    pxs(c, [(-4, -4), (-3, -3), (-2, -3), (-1, -3), (0, -3), (1, -3), (2, -3), (3, -3), (4, -4)], EYE)


SPECIES = {
    "gallina": (gallina_body, gallina_face, [
        dict(body="#fffaf0", wing="#f1e0cc", comb="#ff7b8e", beak="#ffb347", feet="#ffb347"),
        dict(body="#e9b685", wing="#cf9660", comb="#ff7b8e", beak="#ffb347", feet="#f0a030"),
    ]),
    "gato": (gato_body, gato_face, [
        dict(body="#ffbc78", dark="#e8924a", ear="#ffc4cf", paw="#fff0e0"),
        dict(body="#bfc3d2", dark="#9aa0b6", ear="#ffc4cf", paw="#f4f4fb"),
    ]),
    "vaca": (vaca_body, vaca_face, [
        dict(body="#fffdf8", spot="#5b5266", muzzle="#ffc4cf", horn="#f0d08a", hoof="#7a6a80"),
        dict(body="#d09a6a", spot="#fff1dc", muzzle="#ffc4cf", horn="#f0d08a", hoof="#7a5a48"),
    ]),
    "mapache": (mapache_body, mapache_face, [
        dict(body="#a3a8ba", mask="#6b6883", light="#fff6f6"),
        dict(body="#c9a073", mask="#7a5640", light="#fff1e0"),
    ]),
    "chanchito": (chanchito_body, chanchito_face, [
        dict(body="#ffb9c8", dark="#f598ad", snout="#ffd3dc", nostril="#d9788f"),
        dict(body="#fff0e6", dark="#e9b9a0", snout="#ffd9d3", nostril="#d9788f", patch="#e7b58f"),
    ]),
    "ajolote": (ajolote_body, ajolote_face, [
        dict(body="#ffb8ca", belly="#ffe3ea", gill="#ff7497"),
        dict(body="#ffd98e", belly="#fff1cf", gill="#ff9a62"),
    ]),
    "carnotauro": (carnotauro_body, carnotauro_face, [
        dict(body="#f08a68", belly="#ffe6cf", horn="#ffe6a8", dark="#cf6247", foot="#dc7355", snout="#f7a98a"),
        dict(body="#86d6b6", belly="#f2ffe8", horn="#fff0a8", dark="#55b394", foot="#6fc4a4", snout="#a8e6cf"),
    ]),
    "spinosaurus": (spino_body, spino_face, [
        dict(body="#74c7da", belly="#f0fbff", sail="#ff9fbd", ribs="#e0709a", dark="#4aa2ba", snout="#a6e0ec"),
        dict(body="#94d68e", belly="#f5ffe9", sail="#ffc66e", ribs="#e39b3f", dark="#62b45e", snout="#bfe8ba"),
    ]),
}
STAGES = {"baby": 0.74, "adult": 1.0}


def render_animal(species, variant, stage, frame):
    body_fn, face_fn, variants = SPECIES[species]
    pal = {k: hx(v) for k, v in variants[variant].items()}
    c = Canvas(CELL, ox=16, oy=29, s=STAGES[stage], sy=IDLE_SY[frame])
    body_fn(c, pal)
    c.img = outline(shade_pass(c.img), auto_line(pal["body"]))
    c.d = ImageDraw.Draw(c.img)
    face_fn(c, pal, frame == BLINK_FRAME)
    return c.img


# -------------------------------------------------------------------- iconos
def icon(fn):
    c = Canvas(16)
    fn(c)
    return c.img


def _line(col):
    return auto_line(col)


def make_icon(name, base, fn):
    c = Canvas(16)
    fn(c)
    return name, outline(shade_pass(c.img), _line(hx(base)))


def ic_coin(c):
    c.ell(8, 8, 5, 5, hx("#ffd95e"))
    c.ell(8, 8, 3, 3, hx("#ffc233"))
    c.px(6, 6, hx("#fff3b0"))


def ic_heart(c):
    c.ell(5, 6, 3, 3, hx("#ff6f91"))
    c.ell(10, 6, 3, 3, hx("#ff6f91"))
    c.poly([(2, 8), (13, 8), (8, 13)], hx("#ff6f91"))
    c.px(4, 5, hx("#ffc2d1"))


def ic_huevo(c):
    c.ell(8, 9, 4, 5, hx("#fffaf0"))
    c.px(6, 7, WHITE)


def ic_huevo_dino(c):
    c.ell(8, 9, 4, 5, hx("#cfeee0"))
    pxs(c, [(7, 8), (9, 11), (6, 11), (10, 8)], hx("#7fcfae"))


def ic_leche(c):
    c.rect(5, 5, 10, 13, hx("#fffdf8"))
    c.rect(6, 2, 9, 5, hx("#fffdf8"))
    c.rect(6, 2, 9, 3, hx("#ff9fb4"))
    c.rect(6, 8, 9, 10, hx("#bfe9ff"))


def ic_pelusa(c):
    c.ell(8, 8, 5, 5, hx("#d9dcea"))
    pxs(c, [(6, 6), (7, 6)], hx("#f2f3fa"))


def ic_brillito(c):
    c.poly([(8, 1), (10, 6), (14, 8), (10, 10), (8, 14), (6, 10), (2, 8), (6, 6)], hx("#ffe27a"))
    c.px(7, 5, WHITE)


def ic_burbuja(c):
    c.ell(8, 8, 5, 5, hx("#bfe9ff"))
    c.rect(5, 5, 6, 6, WHITE)


def ic_trufa(c):
    c.ell(8, 9, 5, 4, hx("#7a5240"))
    pxs(c, [(6, 8), (9, 7), (10, 10), (7, 11)], hx("#a37a62"))


def ic_escama_fuego(c):
    c.poly([(8, 1), (13, 7), (8, 14), (3, 7)], hx("#ff7a5c"))
    c.poly([(8, 4), (11, 7), (8, 11), (5, 7)], hx("#ffb08a"))


def ic_escama_rio(c):
    c.poly([(8, 1), (13, 7), (8, 14), (3, 7)], hx("#5cc8e8"))
    c.poly([(8, 4), (11, 7), (8, 11), (5, 7)], hx("#a8ecff"))


def ic_grano(c):
    for x, y in ((6, 9), (10, 9), (8, 6)):
        c.ell(x, y, 2, 3, hx("#f2c14e"))
    c.px(7, 8, hx("#fff0a8"))


def ic_heno(c):
    c.rect(3, 10, 12, 13, hx("#efd36a"))
    for x in (4, 7, 10):
        c.rect(x, 4, x, 10, hx("#e5c24c"))


def ic_pescadito(c):
    c.ell(7, 8, 5, 3, hx("#7fc4ff"))
    c.poly([(11, 8), (14, 5), (14, 11)], hx("#7fc4ff"))
    c.px(4, 7, EYE)


def ic_bayas(c):
    c.ell(5, 10, 3, 3, hx("#ff6a8a"))
    c.ell(10, 9, 3, 3, hx("#ff6a8a"))
    c.rect(7, 3, 8, 6, hx("#6bbf6b"))
    pxs(c, [(4, 9), (9, 8)], hx("#ffc2d1"))


def ic_carnita(c):
    c.ell(9, 8, 4, 4, hx("#d9744f"))
    c.rect(4, 11, 6, 12, hx("#fff6e8"))
    c.px(8, 6, hx("#f0a080"))


def ic_gusanito(c):
    for x, y in ((4, 9), (7, 7), (10, 9), (12, 7)):
        c.ell(x, y, 1, 1, hx("#ff9fb4"))
    c.px(12, 6, EYE)


def ic_destello(c):
    c.rect(7, 2, 8, 13, hx("#fff3a8"))
    c.rect(2, 7, 13, 8, hx("#fff3a8"))
    c.ell(7, 7, 2, 2, WHITE)


def ic_mapa(c):
    c.rect(2, 3, 13, 12, hx("#fff1cf"))
    c.rect(5, 3, 5, 12, hx("#f3d9a0"))
    c.rect(10, 3, 10, 12, hx("#f3d9a0"))
    for x, y in ((3, 10), (4, 9), (6, 8), (7, 8), (8, 7), (9, 6)):
        c.px(x, y, hx("#ff8fb0"))
    c.px(11, 5, hx("#e0647d"))
    c.px(12, 6, hx("#e0647d"))
    c.px(12, 5, hx("#e0647d"))
    c.px(11, 6, hx("#e0647d"))


def ic_candado(c):
    c.rect(5, 3, 6, 7, hx("#b9a9c9"))
    c.rect(9, 3, 10, 7, hx("#b9a9c9"))
    c.rect(5, 3, 10, 4, hx("#b9a9c9"))
    c.rect(3, 7, 12, 13, hx("#d9c7e6"))
    c.px(7, 9, EYE)
    c.px(7, 10, EYE)
    c.px(8, 9, EYE)
    c.px(8, 10, EYE)
    c.px(7, 11, EYE)
    c.px(8, 11, EYE)


ICONS = [
    ("coin", "#ffd95e", ic_coin), ("heart", "#ff6f91", ic_heart),
    ("huevo", "#fffaf0", ic_huevo), ("huevo_dino", "#cfeee0", ic_huevo_dino),
    ("leche", "#fffdf8", ic_leche), ("pelusa", "#d9dcea", ic_pelusa),
    ("brillito", "#ffe27a", ic_brillito), ("burbuja", "#bfe9ff", ic_burbuja),
    ("trufa", "#7a5240", ic_trufa), ("escama_fuego", "#ff7a5c", ic_escama_fuego),
    ("escama_rio", "#5cc8e8", ic_escama_rio), ("grano", "#f2c14e", ic_grano),
    ("heno", "#efd36a", ic_heno), ("pescadito", "#7fc4ff", ic_pescadito),
    ("bayas", "#ff6a8a", ic_bayas), ("carnita", "#d9744f", ic_carnita),
    ("gusanito", "#ff9fb4", ic_gusanito), ("destello", "#fff3a8", ic_destello),
    ("mapa", "#fff1cf", ic_mapa), ("candado", "#d9c7e6", ic_candado),
]


# --------------------------------------------------------------------- tiles
def tile_grass(variant):
    rng = random.Random(100 + variant)
    img = Image.new("RGBA", (16, 16), hx("#bfe8a0"))
    dark, light = hx("#a9d98a"), hx("#d3f0b8")
    for _ in range(5):
        img.putpixel((rng.randrange(16), rng.randrange(16)), dark)
    for _ in range(3):
        img.putpixel((rng.randrange(16), rng.randrange(16)), light)
    if variant == 1:
        for fx, fy, col in ((4, 5, "#ff9fb4"), (11, 11, "#fff6c8")):
            img.putpixel((fx, fy), hx("#ffd95e"))
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                img.putpixel((fx + dx, fy + dy), hx(col))
    if variant == 2:
        for tx, ty in ((3, 10), (10, 4)):
            for dx, dy in ((0, 0), (-1, -1), (1, -1)):
                img.putpixel((tx + dx, ty + dy), hx("#92cc72"))
    return img


def tile_path():
    rng = random.Random(7)
    img = Image.new("RGBA", (16, 16), hx("#f3deb0"))
    for _ in range(7):
        img.putpixel((rng.randrange(16), rng.randrange(16)), hx("#e6cb98"))
    return img


def tile_water():
    img = Image.new("RGBA", (16, 16), hx("#9fdcf5"))
    for x, y in ((2, 4), (3, 4), (4, 4), (10, 10), (11, 10), (12, 10), (7, 13)):
        img.putpixel((x, y), hx("#d4f3ff"))
    return img


def tile_fence(horizontal):
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rail, post, edge = hx("#e8bf92"), hx("#cf9867"), hx("#a8704a")
    if horizontal:
        d.rectangle([0, 5, 15, 6], fill=rail)
        d.rectangle([0, 10, 15, 11], fill=rail)
        d.rectangle([6, 2, 9, 14], fill=post)
        d.rectangle([6, 14, 9, 14], fill=edge)
        d.point((7, 3), fill=hx("#f4d8b4"))
    else:
        d.rectangle([5, 0, 6, 15], fill=rail)
        d.rectangle([10, 0, 11, 15], fill=rail)
        d.rectangle([2, 6, 14, 9], fill=post)
        d.rectangle([2, 9, 14, 9], fill=edge)
        d.point((3, 7), fill=hx("#f4d8b4"))
    return img


def _speckled(base, dark, light, seed, n_dark=6, n_light=3):
    rng = random.Random(seed)
    img = Image.new("RGBA", (16, 16), hx(base))
    for _ in range(n_dark):
        img.putpixel((rng.randrange(16), rng.randrange(16)), hx(dark))
    for _ in range(n_light):
        img.putpixel((rng.randrange(16), rng.randrange(16)), hx(light))
    return img


def tile_moss():
    img = _speckled("#9fd29a", "#86c283", "#c3e6b4", 201, 8, 3)
    for x, y in ((4, 4), (11, 9)):
        img.putpixel((x, y), hx("#ffd8e4"))
    return img


def tile_fern():
    img = _speckled("#b5dfa0", "#a1d28c", "#d3f0b8", 202, 4, 2)
    for fx, fy in ((4, 5), (11, 11)):
        for dx, dy in ((0, 0), (-1, 1), (1, 1), (-2, 2), (2, 2)):
            img.putpixel((fx + dx, fy + dy), hx("#6fb76a"))
        img.putpixel((fx, fy + 1), hx("#6fb76a"))
        img.putpixel((fx, fy + 2), hx("#6fb76a"))
    return img


def tile_sand():
    return _speckled("#f6e4b8", "#ead3a0", "#fff3d6", 203, 8, 2)


def tile_rock():
    img = _speckled("#d9d2e6", "#c3bad6", "#ece8f5", 204, 6, 3)
    d = ImageDraw.Draw(img)
    d.ellipse([3, 6, 8, 10], fill=hx("#b9afcf"))
    d.ellipse([9, 3, 13, 7], fill=hx("#c3bad6"))
    img.putpixel((4, 7), hx("#ece8f5"))
    img.putpixel((10, 4), hx("#ece8f5"))
    return img


def tile_tree():
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([7, 10, 8, 14], fill=hx("#b9835a"))
    d.ellipse([2, 1, 13, 11], fill=hx("#7cc68b"))
    d.ellipse([4, 3, 8, 6], fill=hx("#a5dfae"))
    img.putpixel((10, 8), hx("#69b87b"))
    img.putpixel((9, 9), hx("#69b87b"))
    return outline(img, auto_line(hx("#7cc68b")))


TILES = [
    ("grass0", tile_grass(0)), ("grass1", tile_grass(1)), ("grass2", tile_grass(2)),
    ("path", tile_path()), ("water", tile_water()),
    ("fence_h", tile_fence(True)), ("fence_v", tile_fence(False)),
    ("moss", tile_moss()), ("fern", tile_fern()), ("sand", tile_sand()),
    ("rock", tile_rock()), ("tree", tile_tree()),
]


# ------------------------------------------------------------ lugares del mapa (48x48)
def _place(fn):
    c = Canvas(48)
    fn(c)
    return outline(shade_pass(c.img), hx("#6b4a63"))


def pl_pradera(c):
    c.ell(24, 42, 21, 4, hx("#a9d98a"))
    c.rect(8, 24, 40, 41, hx("#ff9fb4"))
    c.poly([(4, 25), (24, 7), (44, 25)], hx("#e0647d"))
    c.rect(18, 29, 30, 41, hx("#fff1cf"))
    c.rect(18, 29, 19, 41, hx("#f3d9a0"))
    c.rect(29, 29, 30, 41, hx("#f3d9a0"))
    c.rect(18, 35, 30, 36, hx("#f3d9a0"))
    c.ell(24, 19, 3, 3, hx("#fff1cf"))


def pl_bosque(c):
    c.ell(24, 43, 21, 4, hx("#a9d98a"))
    c.rect(21, 32, 27, 43, hx("#b9835a"))
    c.poly([(24, 20), (7, 40), (41, 40)], hx("#69b87b"))
    c.poly([(24, 12), (10, 30), (38, 30)], hx("#7cc68b"))
    c.poly([(24, 4), (13, 21), (35, 21)], hx("#8fd49b"))
    c.rect(35, 34, 44, 39, hx("#e8bf92"))
    c.rect(38, 39, 40, 44, hx("#b9835a"))
    c.px(37, 36, hx("#b9835a"))
    c.px(42, 36, hx("#b9835a"))


def pl_estanque(c):
    c.ell(24, 33, 22, 12, hx("#f6e4b8"))
    c.ell(24, 32, 18, 9, hx("#9fdcf5"))
    c.ell(24, 31, 11, 5, hx("#bfeaff"))
    c.ell(17, 33, 5, 3, hx("#7fd38f"))
    c.ell(17, 32, 2, 1, hx("#ffb3c8"))
    c.rect(38, 14, 39, 32, hx("#7fb86a"))
    c.rect(34, 20, 35, 32, hx("#7fb86a"))
    c.ell(38, 14, 2, 4, hx("#b9835a"))
    c.ell(34, 20, 2, 3, hx("#b9835a"))


def pl_jurasico(c):
    c.ell(24, 40, 21, 6, hx("#d9d2e6"))
    c.ell(24, 40, 14, 3, hx("#c3bad6"))
    c.ell(24, 23, 11, 14, hx("#cfeee0"))
    c.ell(20, 17, 4, 3, hx("#e8fbf3"))
    c.ell(28, 26, 3, 2, hx("#9fd8c0"))
    c.ell(19, 29, 2, 2, hx("#9fd8c0"))
    c.ell(25, 19, 2, 1, hx("#9fd8c0"))
    c.poly([(5, 42), (9, 28), (13, 42)], hx("#7cc68b"))
    c.poly([(36, 42), (40, 30), (44, 42)], hx("#69b87b"))


def desaturate(img):
    out = img.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            gray = 0.3 * r + 0.59 * g + 0.11 * b
            k = 0.12
            px[x, y] = (int(gray * (1 - k) + r * k + 24), int(gray * (1 - k) + g * k + 22), int(gray * (1 - k) + b * k + 28), a)
    return out


PLACES = [("pradera", pl_pradera), ("bosque", pl_bosque), ("estanque", pl_estanque), ("jurasico", pl_jurasico)]


# --------------------------------------------------------------------- salida
def build():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(DOCS, exist_ok=True)

    rows = {}
    keys = []
    for sp, (_, _, variants) in SPECIES.items():
        for v in range(len(variants)):
            for st in STAGES:
                rows[f"{sp}:{v}:{st}"] = len(keys)
                keys.append((sp, v, st))
    atlas = Image.new("RGBA", (CELL * len(IDLE_SY), CELL * len(keys)), (0, 0, 0, 0))
    for r, (sp, v, st) in enumerate(keys):
        for f in range(len(IDLE_SY)):
            atlas.paste(render_animal(sp, v, st, f), (f * CELL, r * CELL))
    atlas.save(os.path.join(OUT, "animals.png"))
    with open(os.path.join(OUT, "animals.json"), "w") as fh:
        json.dump({"cell": CELL, "frames": len(IDLE_SY), "idle": IDLE_SEQ, "rows": rows,
                   "species": {s: len(v[2]) for s, v in SPECIES.items()}}, fh, indent=1)

    icons = [make_icon(n, b, f) for n, b, f in ICONS]
    sheet = Image.new("RGBA", (16 * len(icons), 16), (0, 0, 0, 0))
    for i, (_, im) in enumerate(icons):
        sheet.paste(im, (i * 16, 0))
    sheet.save(os.path.join(OUT, "icons.png"))
    with open(os.path.join(OUT, "icons.json"), "w") as fh:
        json.dump({"cell": 16, "index": {n: i for i, (n, _) in enumerate(icons)}}, fh, indent=1)

    tsheet = Image.new("RGBA", (16 * len(TILES), 16), (0, 0, 0, 0))
    for i, (_, im) in enumerate(TILES):
        tsheet.paste(im, (i * 16, 0))
    tsheet.save(os.path.join(OUT, "tiles.png"))
    with open(os.path.join(OUT, "tiles.json"), "w") as fh:
        json.dump({"cell": 16, "index": {n: i for i, (n, _) in enumerate(TILES)}}, fh, indent=1)

    places = [(n, _place(f)) for n, f in PLACES]
    places += [(n + "_bloq", desaturate(im)) for n, im in places[:len(PLACES)]]
    psheet = Image.new("RGBA", (48 * len(places), 48), (0, 0, 0, 0))
    for i, (_, im) in enumerate(places):
        psheet.paste(im, (i * 48, 0))
    psheet.save(os.path.join(OUT, "places.png"))
    with open(os.path.join(OUT, "places.json"), "w") as fh:
        json.dump({"cell": 48, "index": {n: i for i, (n, _) in enumerate(places)}}, fh, indent=1)

    # vista previa: 8 especies en columnas; filas = bebé/adulto de cada color
    z, pad = 4, 8
    cols = len(SPECIES)
    cellp = CELL * z + pad
    icons_y = 4 * cellp + pad
    tiles_y = icons_y + 2 * (16 * z + pad)
    places_y = tiles_y + 16 * z + pad
    prev = Image.new("RGBA", (cols * cellp + pad, places_y + 48 * 2 + pad), hx("#fff6e5"))
    for ci, sp in enumerate(SPECIES):
        for ri, (v, st) in enumerate(((0, "baby"), (0, "adult"), (1, "baby"), (1, "adult"))):
            im = render_animal(sp, v, st, 0).resize((CELL * z, CELL * z), Image.NEAREST)
            prev.alpha_composite(im, (pad + ci * cellp, pad + ri * cellp))
    per_row = (len(icons) + 1) // 2
    for i, (_, im) in enumerate(icons):
        big = im.resize((16 * z, 16 * z), Image.NEAREST)
        prev.alpha_composite(big, (pad + (i % per_row) * (16 * z + pad), icons_y + (i // per_row) * (16 * z + pad)))
    for i, (_, im) in enumerate(TILES):
        prev.alpha_composite(im.resize((16 * z, 16 * z), Image.NEAREST), (pad + i * (16 * z + pad), tiles_y))
    for i, (_, im) in enumerate(places):
        prev.alpha_composite(im.resize((96, 96), Image.NEAREST), (pad + i * (96 + pad), places_y))
    prev.save(os.path.join(DOCS, "preview-sprites.png"))
    render_animal("gallina", 0, "adult", 0).save(os.path.join(ROOT, "assets", "favicon.png"))
    print(f"animals.png {atlas.size}, {len(keys)} filas; icons {len(icons)}; tiles {len(TILES)}; places {len(places)}")


if __name__ == "__main__":
    build()
