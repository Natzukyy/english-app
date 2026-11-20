#!/usr/bin/env python3
"""Busca texto visible (español/inglés) escrito directo en js/screens/*.js y js/app.js.

Todo texto de interfaz debe vivir en data/i18n/strings.json y leerse con t("clave").
Heurística: por cada literal de cadena se quitan las etiquetas HTML y sus atributos; si queda
texto humano (2+ palabras, una palabra con mayúscula inicial de 4+ letras, o con ¿ ¡ … acentos
de frase) se reporta. Se ignoran comentarios, console.*, throw, claves de i18n, selectores,
rutas, nombres de evento y similares.

Uso:  python3 scripts/buscar_texto_hardcodeado.py      (sale con 1 si encuentra algo)
Excepciones: // i18n-ok al final de una línea, o un bloque entre las líneas
// i18n-ok-start y // i18n-ok-end (siempre con una razón: p. ej. prompts para el modelo de IA)."""
import glob
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ARCHIVOS = sorted(glob.glob(str(RAIZ / "js/screens/*.js"))) + [str(RAIZ / "js/app.js")]

LITERAL = re.compile(r"""(?P<q>["'])(?P<s>(?:\\.|(?!(?P=q)).)*)(?P=q)""")
LETRAS = r"A-Za-záéíóúüñÁÉÍÓÚÜÑ"
PALABRA = re.compile(rf"[{LETRAS}]{{3,}}")
IGNORAR_LINEA = re.compile(r"^\s*(//|/\*|\*)|console\.|throw |i18n-ok|querySelector|getElementById|addEventListener|classList|setAttribute|getAttribute|\.className|dataset|hasOwnProperty|require\(|typeof ")


def texto_humano(literal):
    """Devuelve el texto visible que queda de un literal, o ''."""
    s = literal
    s = re.sub(r"<[^<>]*>", " ", s)          # etiquetas completas
    s = re.sub(r"<[^<>]*$", " ", s)          # etiqueta abierta que sigue en otro literal
    if ">" in s and ("=" in s.split(">")[0] or '"' in s.split(">")[0] or s.split(">")[0].strip() == ""):
        s = s.split(">", 1)[1]               # resto de atributos + ">" de una etiqueta cortada
    s = re.sub(r"&[a-z#0-9]+;", " ", s)
    s = re.sub(r"\{[^}]*\}", " ", s)         # marcadores {n}
    s = re.sub(r"\s+", " ", s).strip()
    return s


NOMBRES_TECLA = {"Enter", "ENTER", "Space", "Escape", "Tab", "Backspace"}  # valores de ev.key, no UI


def es_interfaz(t, original):
    if not t or not PALABRA.search(t) or t in NOMBRES_TECLA:
        return False
    # una sola palabra (con o sin acentos): solo cuenta si es Capitalizada de 4+ letras (botón/etiqueta)
    if " " not in t and re.fullmatch(rf"[{LETRAS}]+[.:!?…]*", t):
        return bool(re.fullmatch(rf"[A-ZÁÉÍÓÚÑ][{LETRAS}]{{3,}}[.:!?…]*", t))
    # claves, rutas, selectores, ids, colores, funciones css, eventos
    if re.fullmatch(r"[\w.#/:\-\[\]=*>+,~% ()'\"]*", t) and " " not in t.strip() and not re.search(r"[¿¡…áéíóúñÁÉÍÓÚÑ]", t):
        # una sola "palabra" técnica: solo cuenta si es Capitalizada de 4+ letras (botón/etiqueta)
        return bool(re.fullmatch(rf"[A-ZÁÉÍÓÚÑ][{LETRAS}]{{3,}}[.:!?…]*", t))
    if re.search(r"[¿¡…]", t) or re.search(rf"[{LETRAS}]{{2,}} [{LETRAS}]{{2,}}", t):
        # varias palabras: descarta valores css/atributos ("margin-top 12px", "var(--x)")
        if re.search(r"var\(--|rgba?\(|px\b|\bcalc\(|cubic-bezier|translate|rotate\(|scale\(|inset|flex|grid|center|none\b", t) and not re.search(r"[¿¡…áéíóúñÁÉÍÓÚÑ]", t):
            return False
        if re.fullmatch(r"[a-z\-]+( [a-z\-]+)*", t) and re.search(r"calcomania|boton|pop|clase|superficie|enlace|campo|texto-|fila|seccion|barra|tarjeta|practicar", t):
            return False  # listas de clases CSS
        return True
    return False


# Texto visible o leído por lectores de pantalla en atributos HTML: placeholder, aria-label, title, alt.
ATRIBUTO = re.compile(r"""\b(?:placeholder|aria-label|title|alt)=\\?["']([^"'<>+]*)["']""")


def revisar(ruta):
    hallazgos = []
    en_comentario = False
    en_excepcion = False
    for n, linea in enumerate(pathlib.Path(ruta).read_text(encoding="utf-8").splitlines(), 1):
        if "i18n-ok-start" in linea:
            en_excepcion = True
            continue
        if "i18n-ok-end" in linea:
            en_excepcion = False
            continue
        if en_excepcion:
            continue
        # comentarios de bloque /* ... */ (abren y cierran en cualquier línea)
        if en_comentario:
            if "*/" in linea:
                en_comentario = False
            continue
        if linea.lstrip().startswith("/*") and "*/" not in linea:
            en_comentario = True
            continue
        if IGNORAR_LINEA.search(linea) or '"use strict"' in linea:
            continue
        for m in ATRIBUTO.finditer(linea):
            if PALABRA.search(m.group(1)):
                hallazgos.append((n, "[atributo] " + m.group(1)[:60]))
        for m in LITERAL.finditer(linea):
            lit = m.group("s")
            t = texto_humano(lit)
            if es_interfaz(t, lit):
                hallazgos.append((n, t[:70]))
    return hallazgos


def main():
    total = 0
    for ruta in ARCHIVOS:
        h = revisar(ruta)
        total += len(h)
        for n, t in h:
            print(f"{pathlib.Path(ruta).relative_to(RAIZ)}:{n}: {t}")
    if total:
        print(f"\n{total} texto(s) visible(s) hardcodeado(s) en JS: muévelos a data/i18n/strings.json (t(\"clave\")).")
        sys.exit(1)
    print("Sin texto de interfaz hardcodeado en js/screens y js/app.js")


if __name__ == "__main__":
    main()
