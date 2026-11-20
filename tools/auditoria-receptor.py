#!/usr/bin/env python3
"""Receptor mínimo (stdlib) de los resultados de tools/auditoria-margenes.js.
Uso: python3 tools/auditoria-receptor.py CARPETA   -> guarda cada POST en CARPETA/<nombre>.json
(el script de auditoría envía a http://127.0.0.1:8010/<nombre>)."""
import http.server, os, sys
CARPETA = sys.argv[1]
os.makedirs(CARPETA, exist_ok=True)

class H(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        nombre = self.path.strip("/") or "resultado"
        datos = self.rfile.read(int(self.headers["Content-Length"]))
        with open(os.path.join(CARPETA, nombre + ".json"), "wb") as f:
            f.write(datos)
        self.send_response(200); self.end_headers(); self.wfile.write(b"ok")
    def log_message(self, *a):
        pass

http.server.HTTPServer(("127.0.0.1", 8010), H).serve_forever()
