#!/usr/bin/env python3
"""Calcula el contraste WCAG de los pares texto/fondo REALES de css/styles.css.

Lee los tokens de :root, evalúa una lista de pares (texto, fondo, umbral, dónde se usa) y
sale con código 1 si algún par de texto baja de 4.5:1 (o de 3:1 en texto grande / elementos
no textuales). Uso:  python3 scripts/contraste.py
Sin dependencias (solo la biblioteca estándar)."""
import re, sys, pathlib

css = pathlib.Path(__file__).resolve().parent.parent.joinpath("css/styles.css").read_text(encoding="utf-8")
raiz = re.search(r":root\s*\{(.*?)\n\}", css, re.S).group(1)
# Cada token de paleta es #hex fijo o light-dark(#claro, #oscuro) (D37). Se evalúan los DOS temas.
TOK_CLARO, TOK_OSCURO = {}, {}
for nombre, valor in re.findall(r"--([\w-]+):\s*([^;]+);", raiz):
    m = re.match(r"light-dark\(\s*(#[0-9A-Fa-f]{6})\s*,\s*(#[0-9A-Fa-f]{6})\s*\)", valor.strip())
    if m:
        TOK_CLARO[nombre], TOK_OSCURO[nombre] = m.group(1), m.group(2)
    else:
        m = re.match(r"(#[0-9A-Fa-f]{6})\b", valor.strip())
        if m:
            TOK_CLARO[nombre] = TOK_OSCURO[nombre] = m.group(1)
tokens = TOK_OSCURO

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
ACENTOS = ("amarillo", "menta", "rosa", "coral", "azul")

def pares_de(tema):
    pares = []
    for fondo in ("bg", "surface", "nav", "superficie-hundida"):
        pares.append(("texto", fondo, TEXTO, "texto principal"))
        pares.append(("texto-2", fondo, TEXTO, "texto secundario"))
    pares.append(("texto", "surface-relleno", TEXTO, "pastillas y fichas de relleno neutro"))
    pares.append(("texto-2", "surface-relleno", TEXTO, "texto secundario sobre relleno neutro"))
    for acento in ACENTOS + ("crema",):
        pares.append(("tinta", acento, TEXTO, f"texto sobre calcomanía {acento} (incluye 'HOY TE TOCA' = amarillo)"))
    # Color de ACENTO usado como texto/ícono: variante -texto sobre las superficies del tema.
    for acento in ("amarillo", "menta", "rosa", "coral", "azul"):
        for fondo in ("bg", "surface", "nav"):
            pares.append((acento + "-texto", fondo, TEXTO, f"texto/ícono {acento} sobre {fondo}"))
    pares.append(("amarillo", "tinta", TEXTO, "botón oscuro con texto amarillo (.boton-tinta)"))
    pares.append(("menta", "tinta", TEXTO, "número de paso hecho (menta sobre tinta)"))
    pares.append(("crema", "tinta", TEXTO, "pastillas oscuras con texto crema"))
    # No textuales (3:1)
    if tema == "claro":
        pares.append(("tinta", "bg", GRANDE, "borde de calcomanía/tarjeta sobre el fondo (no textual)"))
        pares.append(("tinta", "surface", GRANDE, "borde de tarjeta sobre superficie (no textual)"))
        for acento in ACENTOS:
            pares.append((acento, "tinta", GRANDE, f"relleno de barra {acento} contra su borde de tinta (no textual)"))
    else:
        pares.append(("surface-borde", "bg", GRANDE, "borde de superficies sobre el fondo (no textual)"))
        for acento in ACENTOS:
            pares.append((acento, "surface", GRANDE, f"relleno de barra {acento} sobre superficie (no textual)"))
    return pares

# EXCEPCIÓN DOCUMENTADA (solo oscuro): --surface-borde (#3A3A70) sobre --bg da ~1.76:1. Es el borde
# decorativo de las paleta exacta aprobada por Alex; no es texto ni lo único que identifica un control.
EXCEPCIONES = {("oscuro", "surface-borde", "bg")}

def lum_par(tema, a, b):
    t = TOK_CLARO if tema == "claro" else TOK_OSCURO
    return t[a], t[b]

malos = 0
total = 0
for tema in ("claro", "oscuro"):
    t = TOK_CLARO if tema == "claro" else TOK_OSCURO
    print(f"\n=== Tema {tema} ===")
    print(f"{'par':44} {'ratio':>7}  umbral  estado")
    for a, f, umbral, uso in pares_de(tema):
        total += 1
        if a not in t or f not in t:
            print(f"{a}/{f}: token no encontrado"); malos += 1; continue
        r = ratio(t[a], t[f])
        ok = r >= umbral
        exc = (not ok) and (tema, a, f) in EXCEPCIONES
        malos += 0 if (ok or exc) else 1
        estado = "ok" if ok else ("EXCEPCION documentada" if exc else "FALLA")
        print(f"{a + ' / ' + f:44} {r:6.2f}:1  {umbral:>4}   {estado}  {uso}")

# Distinguibilidad por LUMINOSIDAD (no solo matiz): las 4 habilidades deben diferir >= 1.2:1 entre sí.
print("\n=== Luminosidad entre colores de habilidad (>= 1.2:1 entre cada par) ===")
import itertools
for tema in ("claro", "oscuro"):
    t = TOK_CLARO if tema == "claro" else TOK_OSCURO
    for a, b in itertools.combinations(("azul", "amarillo", "menta", "rosa"), 2):
        r = ratio(t[a], t[b])
        print(f"[{tema}] {a:8}/{b:8} {r:5.2f}:1 {'ok' if r >= 1.2 else 'BAJO (se distinguen también por ícono y etiqueta, nunca solo por color)'}")

print(f"\n{total - malos}/{total} pares cumplen (incluye excepciones documentadas)" + ("" if not malos else f"; {malos} FALLAS SIN DOCUMENTAR"))
sys.exit(1 if malos else 0)
