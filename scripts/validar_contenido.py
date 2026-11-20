#!/usr/bin/env python3
"""Valida data/content/fase1/*.json: esquema mínimo, ids únicos, respuestas en rango, sin
duplicados y conteos mínimos por nivel. Sale con código 1 si algo falla.
Uso:  python3 scripts/validar_contenido.py   (también lo corre ./tests/run-tests.sh)"""
import json, sys, pathlib, collections

D = pathlib.Path(__file__).resolve().parent.parent / "data/content/fase1"
NIVELES_CON_CONTENIDO = ["A1", "A2", "B1", "B2"]
MINIMOS = {"lecturas": 12, "escucha": 12, "escritura": 10, "habla": 40, "tarjetas": 150}
errores = []

def cargar(nombre, clave):
    return json.loads((D / f"{nombre}.json").read_text(encoding="utf-8"))[clave]

def err(msg):
    errores.append(msg)

def por_nivel(items):
    return collections.Counter(i["nivelCEFR"] for i in items)

def ids_unicos(nombre, items):
    ids = [i["id"] for i in items]
    for dup in [k for k, v in collections.Counter(ids).items() if v > 1]:
        err(f"{nombre}: id duplicado {dup}")

def comprension(nombre, items, campo_texto):
    for i in items:
        for k in ("id", "tema", "nivelCEFR", campo_texto, "preguntas"):
            if k not in i:
                err(f"{nombre} {i.get('id')}: falta '{k}'")
        if i.get("revisar") is not True:
            err(f"{nombre} {i.get('id')}: falta revisar:true")
        for p in i.get("preguntas", []):
            if not (0 <= p.get("respuestaCorrecta", -1) < len(p.get("opciones", []))):
                err(f"{nombre} {p.get('id')}: respuestaCorrecta fuera de rango")
            if len(set(p.get("opciones", []))) != len(p.get("opciones", [])):
                err(f"{nombre} {p.get('id')}: opciones repetidas")

resumen = {}
lec = cargar("lecturas", "lecturas"); comprension("lecturas", lec, "texto"); ids_unicos("lecturas", lec)
esc = cargar("escucha", "escucha"); comprension("escucha", esc, "guion"); ids_unicos("escucha", esc)
ecr = cargar("escritura", "escritura"); ids_unicos("escritura", ecr)
for i in ecr:
    for k in ("consigna", "listaVerificacion", "respuestaModelo"):
        if not i.get(k):
            err(f"escritura {i['id']}: falta '{k}'")
hab = cargar("habla", "ejercicios"); ids_unicos("habla", hab)
voc = cargar("vocabulario", "palabras"); ids_unicos("vocabulario", voc)
frases = cargar("frases_utiles", "categorias")

for nombre, items in (("lecturas", lec), ("escucha", esc), ("escritura", ecr), ("habla", hab)):
    c = por_nivel(items)
    resumen[nombre] = dict(sorted(c.items()))
    for n in NIVELES_CON_CONTENIDO:
        if c[n] < MINIMOS[nombre]:
            err(f"{nombre}: {n} tiene {c[n]} (mínimo {MINIMOS[nombre]})")

tarjetas = collections.Counter(v["nivelCEFR"] for v in voc)
vistos = collections.Counter(v["ingles"].strip().lower() for v in voc)
cats = [c["categoria"] for c in frases]
for dup in [k for k, v in collections.Counter(cats).items() if v > 1]:
    err(f"frases_utiles: categoría duplicada {dup}")
for cat in frases:
    tarjetas[cat["nivelCEFR"]] += len(cat["frases"])
    for f in cat["frases"]:
        vistos[f["ingles"].strip().lower()] += 1
for k, v in vistos.items():
    if v > 1:
        err(f"tarjetas: texto en inglés duplicado '{k}'")
resumen["tarjetas"] = dict(sorted(tarjetas.items()))
for n in NIVELES_CON_CONTENIDO:
    if tarjetas[n] < MINIMOS["tarjetas"]:
        err(f"tarjetas: {n} tiene {tarjetas[n]} (mínimo {MINIMOS['tarjetas']})")

for k, v in resumen.items():
    print(f"{k:12} {v}")
if errores:
    print("\nERRORES DE CONTENIDO:")
    for e in errores:
        print(" -", e)
    sys.exit(1)
print("\nContenido OK")
