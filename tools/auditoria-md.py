#!/usr/bin/env python3
"""Convierte los resultados de tools/auditoria-margenes.js (JSON) en docs/auditoria-margenes.md.
Uso: python3 tools/auditoria-md.py antes.json [despues.json] > docs/auditoria-margenes.md
Agrupa por (regla, selector): pantalla, estados, viewports, peor medida y severidad, de peor a mejor."""
import json, re, sys, collections

ORDEN = {"alta": 0, "media": 1, "baja": 2}

def peor(medidas):
    def num(m):
        x = re.match(r"-?\d+(\.\d+)?", m)
        return float(x.group()) if x else 999
    return min(medidas, key=num)

def tabla(filas):
    g = collections.defaultdict(list)
    for f in filas:
        g[(f["regla"], f["selector"])].append(f)
    out = []
    for (regla, sel), xs in g.items():
        sev = min((x["sev"] for x in xs), key=lambda s: ORDEN[s])
        out.append((ORDEN[sev], -len(xs), regla, sel, sev, sorted({x["pantalla"] for x in xs}),
                    sorted({x["estado"] for x in xs}), sorted({x["viewport"] for x in xs}),
                    sorted({x["nivel"] for x in xs}), peor([x["medida"] for x in xs]), len(xs)))
    out.sort()
    lineas = ["| Sev. | Regla | Pantalla(s) | Estados | Viewports | Niv. | Selector | Peor medida | Veces |", "|---|---|---|---|---|---|---|---|---|"]
    for _, _, regla, sel, sev, pan, est, vp, niv, med, n in out:
        est_txt = ", ".join(est[:3]) + (f" (+{len(est) - 3})" if len(est) > 3 else "")
        lineas.append(f"| {sev} | {regla} | {', '.join(pan)} | {est_txt} | {', '.join(vp)} | {','.join(map(str, niv))} | `{sel[-110:]}` | {med} | {n} |")
    return lineas

def resumen(filas):
    por_pantalla = collections.Counter(f["pantalla"] for f in filas)
    por_regla = collections.Counter(f["regla"] for f in filas)
    por_sev = collections.Counter(f["sev"] for f in filas)
    return (f"{len(filas)} hallazgos · por regla {dict(por_regla)} · por severidad {dict(por_sev)}\n\n"
            "Por pantalla: " + ", ".join(f"{k} {v}" for k, v in por_pantalla.most_common()))

antes = json.load(open(sys.argv[1]))["filas"]
despues = json.load(open(sys.argv[2]))["filas"] if len(sys.argv) > 2 else None
print("# Auditoría de márgenes (D33)\n")
print("Generada con `tools/auditoria-margenes.js` + `tools/auditoria-md.py`. Umbrales: contenido a ≥ 12 px del borde de su tarjeta (8 px en pastillas y fichas compactas de ≤ 72 px de lado menor, 4 px en insignias de ≤ 44 px con un glifo centrado); texto a ≥ 16 px del borde de la pantalla (móvil); tarjetas hermanas a ≥ 8 px; áreas táctiles ≥ 44 px; sin desbordes. Las reglas de interior/hermanas se miden sin la rotación de ±1° de las calcomanías; la regla **hueco** (D35) mide al revés: con la sombra dura (offset/blur/spread) y la rotación incluidas, mínimo 12 px entre hermanos (16 px bajo una tarjeta hero) y también entre un hijo que sobresale de su contenedor y los hermanos de ese contenedor. 33 estados × 390×844 / 360×740 / 1440×900 × interfaz nivel 0 y 3, con datos sembrados en una base de pruebas aislada.\n")
print("## Estado inicial (antes de corregir)\n")
print(resumen(antes) + "\n")
print("\n".join(tabla(antes)) + "\n")
if despues is not None:
    print("## Estado final (después de corregir)\n")
    print(resumen(despues) if despues else "**Sin hallazgos.**")
    print()
    if despues:
        print("\n".join(tabla(despues)))
