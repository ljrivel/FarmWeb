#!/usr/bin/env python3
"""Genera el pixel art de FarmWeb: animales (32x32), iconos y tiles (16x16) y lugares del mapa (48x48).

Uso:  python3 tools/gen_sprites.py
Salida: assets/sprites/{animals,icons,tiles,places,portraits}.png + .json, docs/preview-sprites.png

Estilo kawaii: formas redondas, ojos grandes con brillo, mejillas rosadas,
contorno con el tono oscuro del propio color (nunca negro).
"""
import hashlib
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


# -------------------------------------------------------------------- conejo
def conejo_body(c, p):
    c.ell(11, -3, 3, 3, p["belly"])               # colita de algodón
    c.ell(-5, -20, 3, 7, p["body"])               # orejas largas
    c.ell(5, -20, 3, 7, p["body"])
    c.ell(-5, -20, 1, 5, p["ear"])
    c.ell(5, -20, 1, 5, p["ear"])
    c.ell(0, -8, 10, 8, p["body"])
    c.ell(0, -5, 6, 4, p["belly"])
    c.ell(-5, -1, 3, 2, p["belly"])
    c.ell(5, -1, 3, 2, p["belly"])


def conejo_face(c, p, blink):
    eyes(c, -10, 5, blink)
    blush(c, -7, 8)
    c.rect(-1, -8, 1, -8, p["nose"])
    pxs(c, [(0, -7), (-1, -6), (1, -6)], EYE)


# ---------------------------------------------------------------------- pato
def pato_body(c, p):
    c.ell(0, -20, 2, 2, p["body"])                # copete
    c.ell(1, -22, 1, 1, p["body"])
    c.ell(0, -9, 11, 9, p["body"])
    c.ell(-10, -7, 3, 4, p["wing"])
    c.ell(10, -7, 3, 4, p["wing"])
    c.rect(-5, -1, -2, 1, p["feet"])
    c.rect(2, -1, 5, 1, p["feet"])


def pato_face(c, p, blink):
    eyes(c, -12, 5, blink)
    blush(c, -8, 8)
    c.ell(0, -7, 4, 2, p["beak"])
    c.rect(-3, -7, 3, -7, shade(p["beak"], 0.85))


# ------------------------------------------------------------- triceratops
def triceratops_body(c, p):
    c.ell(11, -4, 3, 3, p["body"])
    c.ell(0, -16, 12, 8, p["frill"])              # gola
    c.px(-7, -19, p["spot"]); c.px(7, -19, p["spot"]); c.px(0, -23, p["spot"])
    c.ell(0, -9, 10, 8, p["body"])
    c.ell(0, -4, 6, 4, p["belly"])
    c.ell(0, -6, 5, 3, p["snout"])
    c.poly([(-6, -17), (-9, -25), (-3, -18)], p["horn"])
    c.poly([(6, -17), (9, -25), (3, -18)], p["horn"])
    c.ell(-5, -1, 3, 2, p["foot"])
    c.ell(5, -1, 3, 2, p["foot"])


def triceratops_face(c, p, blink):
    eyes(c, -12, 4, blink)
    blush(c, -8, 7)
    pxs(c, [(-2, -5), (-1, -4), (0, -4), (1, -4), (2, -5)], EYE)


# ------------------------------------------------------------- estegosaurio
def estego_body(c, p):
    c.ell(12, -4, 3, 3, p["body"])
    c.poly([(13, -6), (18, -10), (16, -3)], p["plate"])    # púas de la cola
    for x, h in ((-7, 5), (-3, 7), (1, 8), (5, 6), (9, 4)):
        c.poly([(x - 2, -15), (x, -15 - h), (x + 2, -15)], p["plate"])
    c.ell(0, -9, 11, 8, p["body"])
    c.ell(0, -4, 7, 4, p["belly"])
    c.ell(-5, -1, 3, 2, p["foot"])
    c.ell(5, -1, 3, 2, p["foot"])


def estego_face(c, p, blink):
    eyes(c, -11, 5, blink)
    blush(c, -7, 8)
    pxs(c, [(-2, -5), (-1, -4), (0, -4), (1, -4), (2, -5)], EYE)


SPECIES = {
    "gallina": (gallina_body, gallina_face, [
        dict(body="#fffaf0", wing="#f1e0cc", comb="#ff7b8e", beak="#ffb347", feet="#ffb347"),
        dict(body="#e9b685", wing="#cf9660", comb="#ff7b8e", beak="#ffb347", feet="#f0a030"),
        dict(body="#ffc6a5", wing="#f5a883", comb="#ff7b8e", beak="#ffb347", feet="#f0a030"),  # Durazno
        dict(body="#d9c8f5", wing="#bda5e6", comb="#ff8fc0", beak="#ffc15e", feet="#ffb347"),  # Lavanda
    ]),
    "gato": (gato_body, gato_face, [
        dict(body="#ffbc78", dark="#e8924a", ear="#ffc4cf", paw="#fff0e0"),
        dict(body="#bfc3d2", dark="#9aa0b6", ear="#ffc4cf", paw="#f4f4fb"),
        dict(body="#f4e3cf", dark="#8a6a58", ear="#c9a08c", paw="#a07c68"),  # Siamés
        dict(body="#6a6fa8", dark="#4a4f86", ear="#ffb3d1", paw="#c9ccf0"),  # Medianoche
    ]),
    "vaca": (vaca_body, vaca_face, [
        dict(body="#fffdf8", spot="#5b5266", muzzle="#ffc4cf", horn="#f0d08a", hoof="#7a6a80"),
        dict(body="#d09a6a", spot="#fff1dc", muzzle="#ffc4cf", horn="#f0d08a", hoof="#7a5a48"),
        dict(body="#ffd0dc", spot="#ff8fb0", muzzle="#fff0f4", horn="#f0d08a", hoof="#c0708a"),  # Fresa
        dict(body="#5d5b9a", spot="#b9b7ff", muzzle="#ffc4e0", horn="#ffe08a", hoof="#3f3d74"),  # Galaxia
    ]),
    "mapache": (mapache_body, mapache_face, [
        dict(body="#a3a8ba", mask="#6b6883", light="#fff6f6"),
        dict(body="#c9a073", mask="#7a5640", light="#fff1e0"),
        dict(body="#f08c58", mask="#9c4430", light="#fff3e6"),  # Rojizo
        dict(body="#f2f4fb", mask="#9aa6c8", light="#ffffff"),  # Nieve
    ]),
    "chanchito": (chanchito_body, chanchito_face, [
        dict(body="#ffb9c8", dark="#f598ad", snout="#ffd3dc", nostril="#d9788f"),
        dict(body="#fff0e6", dark="#e9b9a0", snout="#ffd9d3", nostril="#d9788f", patch="#e7b58f"),
        dict(body="#b98563", dark="#9a6a4c", snout="#d9ac8c", nostril="#6e4632"),  # Chocolate
        dict(body="#d9c6ff", dark="#bfa6f0", snout="#eadcff", nostril="#a07cd0"),  # Algodón
    ]),
    "ajolote": (ajolote_body, ajolote_face, [
        dict(body="#ffb8ca", belly="#ffe3ea", gill="#ff7497"),
        dict(body="#ffd98e", belly="#fff1cf", gill="#ff9a62"),
        dict(body="#a8ead2", belly="#e6fff4", gill="#4fc79a"),  # Menta
        dict(body="#5a6aa8", belly="#b9c4f0", gill="#7fe3ff"),  # Medianoche
    ]),
    "carnotauro": (carnotauro_body, carnotauro_face, [
        dict(body="#f08a68", belly="#ffe6cf", horn="#ffe6a8", dark="#cf6247", foot="#dc7355", snout="#f7a98a"),
        dict(body="#86d6b6", belly="#f2ffe8", horn="#fff0a8", dark="#55b394", foot="#6fc4a4", snout="#a8e6cf"),
        dict(body="#b9a2f0", belly="#f3ecff", horn="#ffe6a8", dark="#9078d6", foot="#a68ae6", snout="#d0bff7"),  # Lavanda
        dict(body="#5b6aa6", belly="#c8d0f2", horn="#ffe08a", dark="#414f86", foot="#4a5894", snout="#7e8cc4"),  # Medianoche
    ]),
    "spinosaurus": (spino_body, spino_face, [
        dict(body="#74c7da", belly="#f0fbff", sail="#ff9fbd", ribs="#e0709a", dark="#4aa2ba", snout="#a6e0ec"),
        dict(body="#94d68e", belly="#f5ffe9", sail="#ffc66e", ribs="#e39b3f", dark="#62b45e", snout="#bfe8ba"),
        dict(body="#ffae7a", belly="#fff1e4", sail="#74c7da", ribs="#4aa2ba", dark="#e8844a", snout="#ffc9a3"),  # Naranja
        dict(body="#b79af0", belly="#f4eeff", sail="#ffc66e", ribs="#e39b3f", dark="#9378d6", snout="#d2c0f7"),  # Violeta
    ]),
    "conejo": (conejo_body, conejo_face, [
        dict(body="#fffaf4", ear="#ffc4cf", belly="#ffffff", nose="#ff8fa3"),
        dict(body="#c3c6d4", ear="#ffc4cf", belly="#f4f4fb", nose="#ff8fa3"),
        dict(body="#e2b48a", ear="#ffc9b0", belly="#fff1e0", nose="#d97a6a"),  # Canela
        dict(body="#bfe1ff", ear="#ffc4e6", belly="#f2f9ff", nose="#ff8fb8"),  # Cielo
    ]),
    "pato": (pato_body, pato_face, [
        dict(body="#ffe27a", wing="#f5c94a", beak="#ffa64d", feet="#ff9a3c"),
        dict(body="#fffdf8", wing="#e9e2d6", beak="#ffb04d", feet="#ffa040"),
        dict(body="#b9ecd6", wing="#8fd8bc", beak="#ffb36b", feet="#ff9f5a"),  # Menta
        dict(body="#ffc9dc", wing="#ffa8c4", beak="#ffb36b", feet="#ff9f5a"),  # Rosado
    ]),
    "triceratops": (triceratops_body, triceratops_face, [
        dict(body="#8fd49b", belly="#f1ffe9", frill="#ff9fb4", spot="#ffd0dc", horn="#fff0b8", snout="#b4e6bb", foot="#6fbe7c"),
        dict(body="#e6c89a", belly="#fff6e4", frill="#ffb27a", spot="#ffd9b8", horn="#fffbe0", snout="#f0dcb8", foot="#cfaa78"),
        dict(body="#8fc7ee", belly="#f0f9ff", frill="#c9b6f2", spot="#e6dcfa", horn="#fff0b8", snout="#b4dcf5", foot="#6fadd8"),  # Cielo
        dict(body="#ff9f8f", belly="#fff1ea", frill="#ffd36e", spot="#fff0b0", horn="#fffbe0", snout="#ffbfb2", foot="#e07a6a"),  # Atardecer
    ]),
    "estegosaurio": (estego_body, estego_face, [
        dict(body="#a8d98f", belly="#f4ffe8", plate="#ffb27a", foot="#86c06d"),
        dict(body="#c9a8f0", belly="#f6efff", plate="#ffe08a", foot="#a98ad8"),
        dict(body="#ff9f8f", belly="#fff1ea", plate="#ffd9b8", foot="#e07a6a"),  # Coral
        dict(body="#4fb3a9", belly="#d9f7f2", plate="#ffe08a", foot="#3a968d"),  # Turquesa
    ]),
}
STAGES = {"baby": 0.74, "adult": 1.0}

# Look brillante: una paleta propia por especie (cuerpo nacarado y dorado con acentos aguamarina).
SHINY = {
    "gallina": dict(body="#fff3c4", wing="#ffd77a", comb="#7fe0d4", beak="#ffd04d", feet="#ffd04d"),
    "gato": dict(body="#ffe9a8", dark="#f5c16a", ear="#9fe8e0", paw="#fffbea"),
    "vaca": dict(body="#fff5cf", spot="#9fe3d8", muzzle="#ffc4cf", horn="#ffd04d", hoof="#c9a85a"),
    "mapache": dict(body="#ffe9b0", mask="#e0a850", light="#fffbea"),
    "chanchito": dict(body="#fff0b8", dark="#f5cf72", snout="#ffe39a", nostril="#d9a24a", patch="#a8ece0"),
    "ajolote": dict(body="#fff0b0", belly="#fffbe6", gill="#7fe3d6"),
    "carnotauro": dict(body="#ffe39a", belly="#fffbe6", horn="#9fe8e0", dark="#f0b84a", foot="#f5c562", snout="#ffeebb"),
    "spinosaurus": dict(body="#fff0b0", belly="#fffbe6", sail="#7fe3d6", ribs="#3fbfae", dark="#f0c85a", snout="#fff3c8"),
    "conejo": dict(body="#fff3c4", ear="#9fe8e0", belly="#fffbea", nose="#ffb04d"),
    "pato": dict(body="#fff6d0", wing="#ffd77a", beak="#7fe0d4", feet="#7fe0d4"),
    "triceratops": dict(body="#fff0b0", belly="#fffbe6", frill="#7fe3d6", spot="#c9f5ee", horn="#ffd04d", snout="#fff3c8", foot="#f5c562"),
    "estegosaurio": dict(body="#fff0b0", belly="#fffbe6", plate="#7fe3d6", foot="#f5c562"),
}


def render_animal(species, variant, stage, frame):
    body_fn, face_fn, variants = SPECIES[species]
    look = SHINY[species] if variant == "shiny" else variants[variant]
    pal = {k: hx(v) for k, v in look.items()}
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


def ic_regalo(c):
    c.rect(3, 2, 3, 6, hx("#b9824a"))
    c.rect(12, 2, 12, 6, hx("#b9824a"))
    c.rect(3, 2, 12, 3, hx("#b9824a"))  # asa
    c.poly([(2, 7), (13, 7), (12, 14), (3, 14)], hx("#e0a866"))
    c.rect(2, 6, 13, 8, hx("#f1c88f"))  # borde
    c.px(7, 11, hx("#ff6f91"))
    c.px(8, 11, hx("#ff6f91"))
    c.px(7, 10, hx("#ff9fb4"))
    c.px(8, 10, hx("#ff9fb4"))


def ic_helecho(c):
    c.rect(8, 3, 8, 14, hx("#4f9a5e"))
    for y, w in ((4, 2), (6, 3), (8, 4), (10, 4), (12, 3)):
        c.rect(8 - w, y, 8, y + 1, hx("#7cc68b"))
        c.rect(8, y, 8 + w, y + 1, hx("#7cc68b"))


def ic_cuerno_cristal(c):
    c.poly([(8, 1), (12, 10), (8, 14), (4, 10)], hx("#9fd8ff"))
    c.poly([(8, 1), (8, 14), (4, 10)], hx("#d6efff"))
    c.px(7, 6, WHITE)


def ic_placa_dorada(c):
    c.poly([(8, 2), (13, 6), (11, 14), (5, 14), (3, 6)], hx("#ffd95e"))
    c.poly([(8, 2), (8, 14), (5, 14), (3, 6)], hx("#ffeb9a"))
    c.px(6, 7, WHITE)


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


# ---- especies nuevas: comida y productos
def ic_zanahoria(c):
    c.poly([(5, 5), (11, 5), (8, 14)], hx("#ff9a4d"))
    for x in (6, 8, 10):
        c.rect(x, 2, x, 4, hx("#6fbf6a"))
    c.px(7, 7, hx("#e07a3a"))
    c.px(9, 9, hx("#e07a3a"))


def ic_lana(c):
    for x, y in ((6, 7), (10, 7), (8, 10), (5, 10), (11, 10)):
        c.ell(x, y, 3, 3, hx("#f4ecff"))
    c.px(6, 6, WHITE)


def ic_pluma(c):
    c.poly([(11, 2), (13, 4), (5, 13), (3, 11)], hx("#ffe9a8"))
    c.poly([(11, 2), (12, 3), (4, 12), (3, 11)], hx("#fff6d6"))
    c.rect(3, 12, 4, 13, hx("#d9a24a"))


# ---- fase 2B: enfermedades y veterinaria
def ic_gota(c):  # resfriado
    c.poly([(8, 2), (4, 9), (12, 9)], hx("#8fd0ff"))
    c.ell(8, 10, 4, 4, hx("#8fd0ff"))
    c.px(6, 9, WHITE)
    c.px(6, 10, WHITE)


def ic_pancita(c):  # dolor de pancita
    c.ell(8, 9, 6, 5, hx("#ffc9a8"))
    for x, y in ((6, 8), (7, 7), (9, 7), (10, 8), (9, 10), (7, 10), (8, 9)):
        c.px(x, y, hx("#e07a5f"))


def ic_pulga(c):  # pulgas
    c.ell(8, 9, 4, 3, hx("#b08968"))
    c.ell(5, 7, 2, 2, hx("#b08968"))
    for x0, x1 in ((6, 4), (9, 11), (10, 13)):
        c.px(x0, 12, hx("#7f5539"))
        c.px(x1, 13, hx("#7f5539"))
    c.px(4, 6, WHITE)


def ic_nube(c):  # tristeza
    c.ell(6, 8, 4, 3, hx("#c9cbe0"))
    c.ell(10, 7, 4, 4, hx("#c9cbe0"))
    c.rect(3, 9, 13, 10, hx("#c9cbe0"))
    for x in (5, 8, 11):
        c.px(x, 13, hx("#8fd0ff"))


def ic_vet(c):  # cruz de la veterinaria
    c.ell(8, 8, 6, 6, hx("#fffdf8"))
    c.rect(7, 4, 8, 11, hx("#ff6f91"))
    c.rect(4, 7, 11, 8, hx("#ff6f91"))


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
    ("gota", "#8fd0ff", ic_gota), ("pancita", "#ffc9a8", ic_pancita), ("pulga", "#b08968", ic_pulga),
    ("nube", "#c9cbe0", ic_nube), ("vet", "#ff6f91", ic_vet),
    ("zanahoria", "#ff9a4d", ic_zanahoria), ("lana", "#e6dcf5", ic_lana), ("pluma", "#ffe9a8", ic_pluma),
    ("regalo", "#e0a866", ic_regalo),
    ("helecho", "#7cc68b", ic_helecho), ("cuerno_cristal", "#9fd8ff", ic_cuerno_cristal), ("placa_dorada", "#ffd95e", ic_placa_dorada),
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


def pl_valle(c):
    c.ell(24, 43, 21, 4, hx("#a9d98a"))
    c.poly([(2, 42), (14, 16), (26, 42)], hx("#b7a9d6"))
    c.poly([(18, 42), (34, 10), (46, 42)], hx("#9d8fc4"))
    c.poly([(30, 16), (34, 10), (38, 16)], hx("#f4f0ff"))
    c.ell(24, 40, 16, 5, hx("#7cc68b"))
    c.poly([(8, 42), (12, 31), (16, 42)], hx("#69b87b"))
    c.poly([(32, 42), (37, 29), (42, 42)], hx("#7cc68b"))
    c.ell(24, 35, 4, 5, hx("#5a4a72"))


def pl_vet(c):
    """Veterinaria: casita blanca con techo rosa, cruz y un huellita en la puerta."""
    c.ell(24, 43, 21, 4, hx("#a9d98a"))
    c.rect(9, 22, 39, 41, hx("#fffaf0"))
    c.poly([(5, 23), (24, 9), (43, 23)], hx("#ff9fb4"))
    c.rect(20, 30, 28, 41, hx("#bfe4ff"))
    c.rect(24, 30, 24, 41, hx("#9fcfee"))
    c.rect(11, 27, 16, 32, hx("#bfe4ff"))
    c.rect(32, 27, 37, 32, hx("#bfe4ff"))
    c.ell(24, 17, 4, 4, hx("#fffdf8"))
    c.rect(23, 14, 24, 20, hx("#ff6f91"))
    c.rect(21, 16, 26, 17, hx("#ff6f91"))


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


PLACES = [("pradera", pl_pradera), ("bosque", pl_bosque), ("estanque", pl_estanque), ("jurasico", pl_jurasico), ("valle", pl_valle)]
EXTRA_PLACES = [("vet", pl_vet)]  # lugares que no son corrales (sin versión bloqueada)


# ------------------------------------------------------------------ retratos
# Busto 32x32 de cada personaje, centrado en x=16. Tres expresiones: normal, contento y triste.
EXPRESSIONS = ["normal", "contento", "triste"]
MOUTH = (200, 90, 110, 255)


def _head(c, p, my=19):
    c.ell(0, 14, 10, 9.5, p["skin"])
    return my


def _fringe(c, p):
    c.ell(0, 7, 10.5, 5.2, p["hair"])
    c.poly([(-10, 8), (-10, 12), (-6, 10), (-3, 13), (0, 10), (3, 13), (6, 10), (10, 12), (10, 8)], p["hair"])


def _shoulders(c, p):
    c.ell(0, 32, 13, 8, p["cloth"])


def pt_abuela(c, p):
    c.ell(0, 3, 5, 4, p["hair"])  # moño
    c.ell(0, 16, 11.5, 11, p["hair"])
    _shoulders(c, p)
    _head(c, p)
    _fringe(c, p)
    c.rect(-4, 24, 4, 25, p["trim"])  # cuello del chal


def pt_tomas(c, p):
    _shoulders(c, p)
    _head(c, p)
    c.ell(0, 7, 10.5, 5, p["hair"])
    c.poly([(-10, 8), (-10, 12), (-7, 11), (-4, 12), (-1, 10), (4, 12), (8, 11), (10, 12), (10, 8)], p["hair"])
    c.ell(0, 5, 14, 2.6, p["hat"])  # sombrero de paja
    c.ell(0, 2, 8, 4.5, p["hat"])
    c.rect(-8, 4, 8, 5, p["trim"])


def pt_pita(c, p):
    c.ell(0, 16, 12, 11, p["hair"])
    _shoulders(c, p)
    _head(c, p)
    _fringe(c, p)
    c.ell(0, 3, 6.5, 3, WHITE)  # gorrito
    c.rect(-1, 2, 1, 3, p["trim"])
    c.rect(0, 1, 0, 4, p["trim"])
    c.rect(-4, 24, 4, 24, p["trim"])
    c.rect(-6, 28, -5, 29, p["trim"])  # insignia del delantal


def pt_ramon(c, p):
    _shoulders(c, p)
    _head(c, p)
    c.ell(-9.5, 13, 2.6, 4, p["hair"])
    c.ell(9.5, 13, 2.6, 4, p["hair"])
    c.ell(0, 5.5, 5, 1.6, p["hair"])
    c.ell(0, 18.5, 5.5, 1.8, p["hair"])  # bigote
    c.poly([(-2, 25), (0, 28), (2, 25)], p["trim"])  # pajarita


def pt_lia(c, p):
    c.ell(0, 17, 13, 13, p["hair"])
    c.ell(-11, 27, 3, 5, p["hair"])  # trenza
    _shoulders(c, p)
    _head(c, p)
    _fringe(c, p)
    c.ell(0, 25, 9, 2.4, p["trim"])  # bufanda


def pt_mia(c, p):
    c.ell(-12, 17, 3.5, 6.5, p["hair"])  # coletas
    c.ell(12, 17, 3.5, 6.5, p["hair"])
    _shoulders(c, p)
    _head(c, p)
    _fringe(c, p)
    c.ell(-9, 8, 2.6, 2, p["trim"])
    c.ell(9, 8, 2.6, 2, p["trim"])  # lazos
    c.ell(0, 25, 6, 1.6, WHITE)


def pt_bruno(c, p):
    _shoulders(c, p)
    c.poly([(-12, 24), (-8, 24), (8, 38), (4, 38)], p["trim"])  # correa de la bolsa
    _head(c, p)
    c.ell(0, 8, 10.5, 4.5, p["hair"])
    c.ell(0, 5, 10.5, 4, p["hat"])  # gorra de cartero
    c.rect(-10, 6, 10, 8, p["hat"])
    c.rect(-6, 8, 6, 9, p["trim"])  # visera


def pt_noa(c, p):
    c.ell(0, 16, 11.5, 11, p["hair"])
    _shoulders(c, p)
    _head(c, p)
    _fringe(c, p)
    c.rect(-8, 9, -3, 11, p["trim"])  # gafas de campo sobre la frente
    c.rect(3, 9, 8, 11, p["trim"])
    c.rect(-9, 10, 9, 10, shade(p["trim"], 0.7))


PORTRAITS = [
    ("abuela", pt_abuela, dict(skin="#ffe0c8", hair="#e8e2f2", cloth="#ff8fb0", trim="#ffc4d6"), dict(glasses=True)),
    ("tomas", pt_tomas, dict(skin="#ffd9b8", hair="#8a5a3c", cloth="#8fdcc0", hat="#f3d27a", trim="#d9a85a"), dict(freckles=True)),
    ("pita", pt_pita, dict(skin="#ffe3d0", hair="#3b3350", cloth="#bfe4ff", trim="#ff8fb0"), {}),
    ("ramon", pt_ramon, dict(skin="#f2c9a0", hair="#d8d2cc", cloth="#ffe08a", trim="#e0606a"), dict(my=22)),
    ("lia", pt_lia, dict(skin="#efc4a4", hair="#8d6fd1", cloth="#c9b6f2", trim="#7fd8c8"), {}),
    ("mia", pt_mia, dict(skin="#ffe0c8", hair="#a0643e", cloth="#ffc9dc", trim="#ff7fa8"), dict(freckles=True)),
    ("noa", pt_noa, dict(skin="#e8b994", hair="#2f7f86", cloth="#f7e08a", trim="#a6e0ec"), {}),
    ("bruno", pt_bruno, dict(skin="#f3cfae", hair="#5b4636", cloth="#ffd3a8", hat="#6aa5d8", trim="#a0643e"), {}),
]


def _portrait_face(c, expr, opts):
    my = opts.get("my", 19)
    for sx in (-1, 1):  # el lado derecho es el espejo exacto del izquierdo
        if expr == 1:  # contento: ojos cerrados en arco
            for x, y in ((6, 16), (5, 15), (4, 15), (3, 16)):
                c.px(sx * x, y, EYE)
        else:
            lo, hi = sorted((sx * 4, sx * 5))
            c.rect(lo, 14, hi, 16, EYE)
            c.px(lo, 14, WHITE)
            if expr == 2:  # cejas preocupadas
                for x, y in ((6, 13), (5, 12), (4, 11)):
                    c.px(sx * x, y, EYE)
        lo, hi = sorted((sx * 6, sx * 8))
        c.rect(lo, 17, hi, 18, BLUSH)
        if opts.get("freckles"):
            c.px(sx * 4, 18, shade(BLUSH, 0.85))
            c.px(sx * 6, 19, shade(BLUSH, 0.85))
    if expr == 1:
        c.rect(-2, my - 1, 2, my, MOUTH)
        c.px(0, my, BLUSH)
    elif expr == 2:
        for x, y in ((-2, my + 1), (-1, my), (0, my), (1, my), (2, my + 1)):
            c.px(x, y, MOUTH)
        c.px(-5, 18, hx("#9fd6ff"))
    else:
        for x, y in ((-2, my - 1), (-1, my), (0, my), (1, my), (2, my - 1)):
            c.px(x, y, MOUTH)
    if opts.get("glasses"):
        for x0, x1 in ((-7, -2), (2, 7)):
            a, b = c.P(x0, 13), c.P(x1, 17)
            c.d.rectangle([a[0], a[1], b[0], b[1]], outline=hx("#8a6a9a"))
        c.rect(-1, 14, 1, 14, hx("#8a6a9a"))


def render_portrait(fn, look, opts, expr):
    pal = {k: hx(v) for k, v in look.items()}
    c = Canvas(CELL, ox=16, oy=0)
    fn(c, pal)
    c.img = outline(shade_pass(c.img), auto_line(pal["cloth"]))
    c.d = ImageDraw.Draw(c.img)
    _portrait_face(c, expr, opts)
    return c.img


# --------------------------------------------------------------------- salida
def save_sheet(img, name, meta):
    """Guarda el PNG y su JSON; `version` (hash del PNG) sirve de ?v= para que el navegador no mezcle caché vieja."""
    path = os.path.join(OUT, name + ".png")
    img.save(path)
    with open(path, "rb") as fh:
        meta = {**meta, "version": hashlib.sha1(fh.read()).hexdigest()[:10]}
    with open(os.path.join(OUT, name + ".json"), "w") as fh:
        json.dump(meta, fh, indent=1)


def build():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(DOCS, exist_ok=True)

    rows = {}
    keys = []
    for sp, (_, _, variants) in SPECIES.items():
        for v in [*range(len(variants)), "shiny"]:
            for st in STAGES:
                rows[f"{sp}:{v}:{st}"] = len(keys)
                keys.append((sp, v, st))
    atlas = Image.new("RGBA", (CELL * len(IDLE_SY), CELL * len(keys)), (0, 0, 0, 0))
    for r, (sp, v, st) in enumerate(keys):
        for f in range(len(IDLE_SY)):
            atlas.paste(render_animal(sp, v, st, f), (f * CELL, r * CELL))
    save_sheet(atlas, "animals", {"cell": CELL, "frames": len(IDLE_SY), "idle": IDLE_SEQ, "rows": rows,
                                  "species": {s: len(v[2]) for s, v in SPECIES.items()}})

    icons = [make_icon(n, b, f) for n, b, f in ICONS]
    sheet = Image.new("RGBA", (16 * len(icons), 16), (0, 0, 0, 0))
    for i, (_, im) in enumerate(icons):
        sheet.paste(im, (i * 16, 0))
    save_sheet(sheet, "icons", {"cell": 16, "index": {n: i for i, (n, _) in enumerate(icons)}})

    tsheet = Image.new("RGBA", (16 * len(TILES), 16), (0, 0, 0, 0))
    for i, (_, im) in enumerate(TILES):
        tsheet.paste(im, (i * 16, 0))
    save_sheet(tsheet, "tiles", {"cell": 16, "index": {n: i for i, (n, _) in enumerate(TILES)}})

    psz = [(n, [render_portrait(f, look, o, e) for e in range(len(EXPRESSIONS))]) for n, f, look, o in PORTRAITS]
    ptsheet = Image.new("RGBA", (CELL * len(EXPRESSIONS), CELL * len(psz)), (0, 0, 0, 0))
    for r, (_, ims) in enumerate(psz):
        for e, im in enumerate(ims):
            ptsheet.paste(im, (e * CELL, r * CELL))
    save_sheet(ptsheet, "portraits", {"cell": CELL, "expressions": EXPRESSIONS, "index": {n: i for i, (n, _) in enumerate(psz)}})

    places = [(n, _place(f)) for n, f in PLACES]
    places += [(n + "_bloq", desaturate(im)) for n, im in places[:len(PLACES)]]
    places += [(n, _place(f)) for n, f in EXTRA_PLACES]
    psheet = Image.new("RGBA", (48 * len(places), 48), (0, 0, 0, 0))
    for i, (_, im) in enumerate(places):
        psheet.paste(im, (i * 48, 0))
    save_sheet(psheet, "places", {"cell": 48, "index": {n: i for i, (n, _) in enumerate(places)}})

    # vista previa: 8 especies en columnas; filas = bebé/adulto de cada color y del brillante
    z, pad = 4, 8
    cols = len(SPECIES)
    cellp = CELL * z + pad
    looks = [(v, st) for v in (0, 1, 2, 3, "shiny") for st in ("baby", "adult")]
    icons_y = len(looks) * cellp + pad
    tiles_y = icons_y + 2 * (16 * z + pad)
    places_y = tiles_y + 16 * z + pad
    prev = Image.new("RGBA", (cols * cellp + pad, places_y + 48 * 2 + pad), hx("#fff6e5"))
    for ci, sp in enumerate(SPECIES):
        for ri, (v, st) in enumerate(looks):
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
    pv = Image.new("RGBA", (len(EXPRESSIONS) * (CELL * 5 + pad) + pad, len(psz) * (CELL * 5 + pad) + pad), hx("#fff6e5"))
    for r, (_, ims) in enumerate(psz):
        for e, im in enumerate(ims):
            pv.alpha_composite(im.resize((CELL * 5, CELL * 5), Image.NEAREST), (pad + e * (CELL * 5 + pad), pad + r * (CELL * 5 + pad)))
    pv.save(os.path.join(DOCS, "preview-retratos.png"))
    render_animal("gallina", 0, "adult", 0).save(os.path.join(ROOT, "assets", "favicon.png"))
    print(f"animals.png {atlas.size}, {len(keys)} filas; icons {len(icons)}; tiles {len(TILES)}; places {len(places)}")


if __name__ == "__main__":
    build()
