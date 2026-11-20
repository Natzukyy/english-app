#!/usr/bin/env python3
"""Validador de contenido (sin dependencias). Revisa data/content/**, data/diagnostico/banco.json y
el banco de confirmación: estructura, ids únicos, respuesta correcta dentro de las opciones, opciones
distintas y de largo parecido, longitud razonable, nivel CEFR presente y válido, `revisar: true`,
`revisionIA` con fecha y conteos mínimos por nivel. Sale con código 1 si algo falla.

Uso:  python3 tools/validar_contenido.py      (también lo corre ./tests/run-tests.sh)
"""
import collections
import json
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
F1 = RAIZ / "data/content/fase1"
NIVELES = ["A1", "A2", "B1", "B2", "C1", "C2"]
# Niveles que ya tienen contenido propio (el plan deja de reutilizar B2 para ellos).
NIVELES_CON_CONTENIDO = ["A1", "A2", "B1", "B2"]  # T5 agrega C1 y C2
# Banco de confirmación (D29): se confirma el nivel SIGUIENTE, así que cubre A2..C2.
NIVELES_CONFIRMACION = ["A2", "B1", "B2", "C1", "C2"]
MINIMOS = {"lecturas": 12, "escucha": 12, "escritura": 10, "habla": 30, "tarjetas": 150}
MIN_CONFIRMACION_POR_HABILIDAD = 12
HABILIDADES_CONFIRMACION = ["lectura", "escucha", "vocabulario_gramatica"]
FECHA_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
# Límites de longitud razonables (caracteres)
MAX_TEXTO_LECTURA = 3200
MIN_TEXTO_LECTURA = 60
MAX_OPCION = 130
MAX_TARJETA = 170
EXIGIR_CONFIRMACION = False  # T5 lo activa cuando el banco esté completo
MAX_FRACCION_DESBALANCEADAS = 0.06  # tope de preguntas cuya opción correcta es mucho más larga que las demás

errores = []
resumen = {}


def err(msg):
    errores.append(msg)


def cargar(ruta, clave=None):
    d = json.loads((RAIZ / ruta).read_text(encoding="utf-8"))
    return d[clave] if clave else d


def por_nivel(items):
    return collections.Counter(i.get("nivelCEFR") for i in items)


def ids_unicos(nombre, items):
    ids = [i["id"] for i in items if "id" in i]
    for dup in [k for k, v in collections.Counter(ids).items() if v > 1]:
        err(f"{nombre}: id duplicado {dup}")


def meta(nombre, i, quien=None):
    quien = quien or i.get("id")
    if i.get("nivelCEFR") not in NIVELES:
        err(f"{nombre} {quien}: nivelCEFR ausente o inválido ({i.get('nivelCEFR')!r})")
    if i.get("revisar") is not True:
        err(f"{nombre} {quien}: falta revisar:true")
    if not FECHA_RE.match(str(i.get("revisionIA", ""))):
        err(f"{nombre} {quien}: falta revisionIA (AAAA-MM-DD)")


def desbalanceada(q):
    largos = [len(o) for o in q["opciones"]]
    c = largos[q["respuestaCorrecta"]]
    otros = [l for k, l in enumerate(largos) if k != q["respuestaCorrecta"]]
    m = sum(otros) / len(otros)
    return c >= 1.35 * m and c - m >= 10


def pregunta(nombre, p, ids_globales):
    pid = p.get("id")
    for k in ("id", "pregunta", "opciones", "respuestaCorrecta"):
        if k not in p:
            err(f"{nombre} {pid}: falta '{k}'")
            return False
    ops = p["opciones"]
    if pid in ids_globales:
        err(f"{nombre}: id de pregunta repetido {pid}")
    ids_globales.add(pid)
    if not isinstance(ops, list) or len(ops) != 4:
        err(f"{nombre} {pid}: debe tener 4 opciones (tiene {len(ops) if isinstance(ops, list) else '?'})")
        return False
    if not isinstance(p["respuestaCorrecta"], int) or not (0 <= p["respuestaCorrecta"] < len(ops)):
        err(f"{nombre} {pid}: respuestaCorrecta fuera de rango")
        return False
    if len(set(o.strip().lower() for o in ops)) != len(ops):
        err(f"{nombre} {pid}: opciones repetidas")
    for o in ops:
        if not isinstance(o, str) or not o.strip():
            err(f"{nombre} {pid}: opción vacía")
        elif len(o) > MAX_OPCION:
            err(f"{nombre} {pid}: opción demasiado larga ({len(o)} caracteres)")
    if not p["pregunta"].strip():
        err(f"{nombre} {pid}: pregunta vacía")
    return True


def balance(nombre, preguntas):
    if not preguntas:
        return
    malas = [q["id"] for q in preguntas if "opciones" in q and "respuestaCorrecta" in q and len(q["opciones"]) == 4 and desbalanceada(q)]
    resumen[f"{nombre} (opción correcta mucho más larga)"] = f"{len(malas)}/{len(preguntas)}"
    if len(malas) > MAX_FRACCION_DESBALANCEADAS * len(preguntas):
        err(f"{nombre}: {len(malas)} de {len(preguntas)} preguntas tienen la opción correcta mucho más larga que las demás "
            f"(máx. {int(MAX_FRACCION_DESBALANCEADAS * 100)} %): {', '.join(malas[:8])}...")


def minimos(nombre, items, minimo, niveles=None):
    c = por_nivel(items)
    resumen[nombre] = dict(sorted(c.items()))
    for n in niveles or NIVELES_CON_CONTENIDO:
        if c[n] < minimo:
            err(f"{nombre}: {n} tiene {c[n]} (mínimo {minimo})")


ids_preguntas = set()

# ------------------------------------------------------------------ lecturas
lec = cargar("data/content/fase1/lecturas.json", "lecturas")
ids_unicos("lecturas", lec)
pl = []
for i in lec:
    meta("lecturas", i)
    for k in ("tema", "texto", "preguntas", "vocabularioClave"):
        if k not in i:
            err(f"lecturas {i.get('id')}: falta '{k}'")
    t = i.get("texto", "")
    if not (MIN_TEXTO_LECTURA <= len(t) <= MAX_TEXTO_LECTURA):
        err(f"lecturas {i.get('id')}: texto con longitud fuera de rango ({len(t)})")
    if not i.get("preguntas"):
        err(f"lecturas {i.get('id')}: sin preguntas")
    for v in i.get("vocabularioClave", []):
        if not v.get("termino") or not v.get("traduccion"):
            err(f"lecturas {i.get('id')}: vocabularioClave incompleto")
    for p in i.get("preguntas", []):
        if pregunta("lecturas", p, ids_preguntas):
            pl.append(p)
minimos("lecturas", lec, MINIMOS["lecturas"])
balance("lecturas", pl)

# ------------------------------------------------------------------- escucha
esc = cargar("data/content/fase1/escucha.json", "escucha")
ids_unicos("escucha", esc)
pe = []
for i in esc:
    meta("escucha", i)
    for k in ("tema", "guion", "transcripcion", "preguntas"):
        if k not in i:
            err(f"escucha {i.get('id')}: falta '{k}'")
    g = i.get("guion", "")
    if not (40 <= len(g) <= MAX_TEXTO_LECTURA):
        err(f"escucha {i.get('id')}: guion con longitud fuera de rango ({len(g)})")
    if g.strip() != i.get("transcripcion", "").strip():
        err(f"escucha {i.get('id')}: la transcripción no coincide con el guion")
    # El guion se lee con síntesis de voz: nada de símbolos ni números que se lean mal.
    if re.search(r"[%&@#*_<>=+\\|/]|\d", g):
        err(f"escucha {i.get('id')}: el guion tiene símbolos o dígitos que la voz lee mal (escribe los números con letras)")
    if not i.get("preguntas"):
        err(f"escucha {i.get('id')}: sin preguntas")
    for p in i.get("preguntas", []):
        if pregunta("escucha", p, ids_preguntas):
            pe.append(p)
minimos("escucha", esc, MINIMOS["escucha"])
balance("escucha", pe)

# ----------------------------------------------------------------- escritura
ecr = cargar("data/content/fase1/escritura.json", "escritura")
ids_unicos("escritura", ecr)
for i in ecr:
    meta("escritura", i)
    for k in ("tema", "consigna", "listaVerificacion", "respuestaModelo"):
        if not i.get(k):
            err(f"escritura {i.get('id')}: falta '{k}'")
    if len(i.get("listaVerificacion", [])) < 3:
        err(f"escritura {i.get('id')}: la lista de verificación necesita al menos 3 criterios")
minimos("escritura", ecr, MINIMOS["escritura"])

# --------------------------------------------------------------------- habla
hab = cargar("data/content/fase1/habla.json", "ejercicios")
ids_unicos("habla", hab)
frases_habla = collections.Counter()
for i in hab:
    meta("habla", i)
    texto = i.get("fraseObjetivo") or i.get("prompt")
    if not texto:
        err(f"habla {i.get('id')}: sin fraseObjetivo ni prompt")
    elif len(texto) > 220:
        err(f"habla {i.get('id')}: texto demasiado largo")
    if i.get("tipo") not in ("shadowing", "responder_prompt"):
        err(f"habla {i.get('id')}: tipo inválido")
    if i.get("tipo") == "shadowing":
        if re.search(r"[%&@#*_<>=+\\|/]|\d", texto or ""):
            err(f"habla {i.get('id')}: símbolos o dígitos en una frase para repetir en voz alta")
        frases_habla[i.get("nivelCEFR")] += 1
resumen["habla (todas)"] = dict(sorted(por_nivel(hab).items()))
resumen["habla (shadowing)"] = dict(sorted(frases_habla.items()))
# La confirmación de habla (D29) usa 10 frases para repetir del nivel siguiente: hacen falta de sobra.
MIN_SHADOWING = 12
for n in NIVELES_CON_CONTENIDO:
    if por_nivel(hab)[n] < MINIMOS["habla"]:
        err(f"habla: {n} tiene {por_nivel(hab)[n]} ejercicios (mínimo {MINIMOS['habla']})")
    if frases_habla[n] < MIN_SHADOWING:
        err(f"habla: {n} tiene {frases_habla[n]} frases para repetir (mínimo {MIN_SHADOWING}, las usa la confirmación de nivel)")

# ------------------------------------------------------ tarjetas de repaso
voc = cargar("data/content/fase1/vocabulario.json", "palabras")
ids_unicos("vocabulario", voc)
frases = cargar("data/content/fase1/frases_utiles.json", "categorias")
tarjetas = collections.Counter()
vistos = collections.Counter()
retiradas = 0
for v in voc:
    meta("vocabulario", v)
    for k in ("ingles", "espanol", "ejemplo"):
        if not v.get(k):
            err(f"vocabulario {v.get('id')}: falta '{k}'")
        elif len(v[k]) > MAX_TARJETA:
            err(f"vocabulario {v.get('id')}: '{k}' demasiado largo")
    if v.get("retirada"):
        retiradas += 1
        if not v.get("duplicadoDe"):
            err(f"vocabulario {v.get('id')}: una tarjeta retirada debe indicar duplicadoDe")
        continue  # las retiradas ya no cuentan ni se comparan
    tarjetas[v.get("nivelCEFR")] += 1
    vistos[v["ingles"].strip().lower()] += 1
ids_voc = {v["id"] for v in voc}
for v in voc:
    if v.get("retirada") and v.get("duplicadoDe") not in ids_voc:
        err(f"vocabulario {v['id']}: duplicadoDe apunta a un id que no existe ({v.get('duplicadoDe')})")
cats = [c["categoria"] for c in frases]
for dup in [k for k, v in collections.Counter(cats).items() if v > 1]:
    err(f"frases_utiles: categoría duplicada {dup}")
for cat in frases:
    meta("frases_utiles", cat, cat.get("categoria"))
    if not cat.get("frases"):
        err(f"frases_utiles {cat.get('categoria')}: sin frases")
    for k, f in enumerate(cat.get("frases", [])):
        for campo in ("ingles", "espanol"):
            if not f.get(campo):
                err(f"frases_utiles {cat['categoria']}#{k}: falta '{campo}'")
            elif len(f[campo]) > MAX_TARJETA:
                err(f"frases_utiles {cat['categoria']}#{k}: '{campo}' demasiado largo")
        if ("?" in f.get("ingles", "")) != ("?" in f.get("espanol", "")):
            err(f"frases_utiles {cat['categoria']}#{k}: la pregunta no coincide entre inglés y español")
        tarjetas[cat.get("nivelCEFR")] += 1
        vistos[f["ingles"].strip().lower()] += 1
for k, v in vistos.items():
    if v > 1:
        err(f"tarjetas: texto en inglés duplicado '{k}'")
resumen["tarjetas (sin retiradas)"] = dict(sorted(tarjetas.items()))
resumen["tarjetas retiradas por duplicadas"] = retiradas
for n in NIVELES_CON_CONTENIDO:
    if tarjetas[n] < MINIMOS["tarjetas"]:
        err(f"tarjetas: {n} tiene {tarjetas[n]} (mínimo {MINIMOS['tarjetas']})")

# --------------------------------------------- banco del Diagnóstico (se valida, no se amplía)
diag = cargar("data/diagnostico/banco.json", "preguntas")
ids_unicos("diagnostico", diag)
for q in diag:
    meta("diagnostico", q)
    if q.get("habilidad") not in HABILIDADES_CONFIRMACION:
        err(f"diagnostico {q.get('id')}: habilidad inválida")
    pregunta("diagnostico", q, ids_preguntas)
    if q.get("habilidad") == "escucha" and not q.get("textoParaTTS"):
        err(f"diagnostico {q.get('id')}: escucha sin textoParaTTS")
    if q.get("habilidad") == "lectura" and not q.get("texto"):
        err(f"diagnostico {q.get('id')}: lectura sin texto")
resumen["diagnostico"] = len(diag)
balance("diagnostico", diag)

# ----------------------------------------------------- banco de confirmación
ruta_conf = RAIZ / "data/content/confirmacion/banco.json"
if ruta_conf.exists():
    conf = cargar("data/content/confirmacion/banco.json", "preguntas")
    ids_unicos("confirmacion", conf)
    cuenta = collections.Counter()
    for q in conf:
        meta("confirmacion", q)
        if q.get("habilidad") not in HABILIDADES_CONFIRMACION:
            err(f"confirmacion {q.get('id')}: habilidad inválida")
        pregunta("confirmacion", q, ids_preguntas)
        if q.get("habilidad") == "escucha" and not q.get("textoParaTTS"):
            err(f"confirmacion {q.get('id')}: escucha sin textoParaTTS")
        if q.get("habilidad") == "lectura" and not q.get("texto"):
            err(f"confirmacion {q.get('id')}: lectura sin texto")
        if q.get("textoParaTTS") and re.search(r"[%&@#*_<>=+\\|/]|\d", q["textoParaTTS"]):
            err(f"confirmacion {q.get('id')}: textoParaTTS con símbolos o dígitos")
        cuenta[(q.get("habilidad"), q.get("nivelCEFR"))] += 1
    resumen["confirmacion"] = {f"{h}/{n}": cuenta[(h, n)] for h in HABILIDADES_CONFIRMACION for n in NIVELES_CONFIRMACION}
    for h in HABILIDADES_CONFIRMACION:
        for n in NIVELES_CONFIRMACION:
            if EXIGIR_CONFIRMACION and cuenta[(h, n)] < MIN_CONFIRMACION_POR_HABILIDAD:
                err(f"confirmacion: {h} {n} tiene {cuenta[(h, n)]} (mínimo {MIN_CONFIRMACION_POR_HABILIDAD})")
    balance("confirmacion", conf)
else:
    err("falta data/content/confirmacion/banco.json (banco de confirmación de nivel)")


# ------------------------------------------------------------------ salida
for k, v in resumen.items():
    print(f"{k:55} {v}")
if errores:
    print("\nERRORES DE CONTENIDO:")
    for e in errores:
        print(" -", e)
    sys.exit(1)
print("\nContenido OK")
