#!/usr/bin/env python3
"""Compara dos fotos de texto visible generadas por tests/e2e/i18n-snapshot.js.
Uso:  python3 scripts/comparar_snapshots.py tests/e2e/i18n-antes.json tests/e2e/i18n-despues.json
Sale con 1 si algún estado cambió (muestra las diferencias palabra por palabra)."""
import difflib, json, sys

a = json.load(open(sys.argv[1], encoding="utf-8"))["estados"]
b = json.load(open(sys.argv[2], encoding="utf-8"))["estados"]
difs = 0
for k in sorted(set(a) | set(b)):
    if a.get(k) == b.get(k):
        continue
    difs += 1
    print(f"\n== {k}")
    if k not in a or k not in b:
        print("   solo en", "antes" if k in a else "después")
        continue
    sm = difflib.SequenceMatcher(None, a[k].split(" "), b[k].split(" "))
    pa, pb = a[k].split(" "), b[k].split(" ")
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op != "equal":
            print(f"   - {' '.join(pa[i1:i2])!r}\n   + {' '.join(pb[j1:j2])!r}")
print(f"\n{len(a)} estados, {difs} con diferencias")
sys.exit(1 if difs else 0)
