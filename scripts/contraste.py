#!/usr/bin/env python3
"""Calcula el contraste WCAG de los pares texto/fondo REALES de css/styles.css.

Lee los tokens de :root, evalúa una lista de pares (texto, fondo, umbral, dónde se usa) y
sale con código 1 si algún par de texto baja de 4.5:1 (o de 3:1 en texto grande / elementos
no textuales). Uso:  python3 scripts/contraste.py
Sin dependencias (solo la biblioteca estándar)."""
import re, sys, pathlib

css = pathlib.Path(__file__).resolve().parent.parent.joinpath("css/styles.css").read_text(encoding="utf-8")
raiz = re.search(r":root\s*\{(.*?)\n\}", css, re.S).group(1)
tokens = dict(re.findall(r"--([\w-]+):\s*(#[0-9A-Fa-f]{6})\b", raiz))

def lin(c):
    c /= 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

def lum(h):
    h = h.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)

def ratio(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)

TEXTO, GRANDE = 4.5, 3.0
pares = []
for fondo in ("bg", "surface", "nav"):
    pares.append(("texto", fondo, TEXTO, "texto principal"))
    pares.append(("texto-2", fondo, TEXTO, "texto secundario"))
pares.append(("texto", "surface-borde", TEXTO, "pastillas de nivel/XP (.pastilla-nivel-xp)"))
pares.append(("texto-2", "surface-borde", TEXTO, "texto secundario sobre superficie con borde"))
for acento in ("amarillo", "menta", "rosa", "coral", "azul", "crema"):
    pares.append(("tinta", acento, TEXTO, f"texto sobre calcomanía {acento}"))
for acento in ("amarillo", "menta", "rosa", "coral", "azul"):
    pares.append((acento, "bg", TEXTO, f"texto de acento {acento} sobre el fondo (enlaces, etiquetas)"))
    pares.append((acento, "surface", TEXTO, f"texto de acento {acento} sobre superficie"))
pares.append(("amarillo", "tinta", TEXTO, "botón oscuro con texto amarillo (.boton-tinta)"))
# No textuales (3:1): bordes y relleno de barras sobre su fondo
# EXCEPCIÓN DOCUMENTADA: --surface-borde (#3A3A70) sobre --bg da ~1.76:1. Es el borde decorativo de
# tarjetas y pistas de barras, de la paleta exacta aprobada por Alex (no se puede cambiar sin
# salirse del spec). No es texto ni lo único que identifica un control (los inputs además
# cambian de relleno y muestran un anillo de foco claro). Se reporta, pero no falla el script.
EXCEPCIONES = {("surface-borde", "bg")}
pares.append(("surface-borde", "bg", GRANDE, "borde decorativo de tarjetas/barras sobre el fondo (no textual)"))
for acento in ("amarillo", "menta", "rosa", "azul", "coral"):
    pares.append((acento, "surface", GRANDE, f"relleno de barra {acento} sobre superficie (no textual)"))

malos = 0
print(f"{'par':34} {'ratio':>7}  umbral  estado")
for t, f, umbral, uso in pares:
    if t not in tokens or f not in tokens:
        print(f"{t}/{f}: token no encontrado"); malos += 1; continue
    r = ratio("#" + tokens[t].lstrip("#"), "#" + tokens[f].lstrip("#"))
    ok = r >= umbral
    exc = (not ok) and (t, f) in EXCEPCIONES
    malos += 0 if (ok or exc) else 1
    estado = "ok" if ok else ("EXCEPCION documentada" if exc else "FALLA")
    print(f"{t + ' / ' + f:34} {r:6.2f}:1  {umbral:>4}   {estado}  {uso}")
print(f"\n{len(pares) - malos}/{len(pares)} pares cumplen (incluye excepciones documentadas)" + ("" if not malos else f"; {malos} FALLAS SIN DOCUMENTAR"))
sys.exit(1 if malos else 0)
