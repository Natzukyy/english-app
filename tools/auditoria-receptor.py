import http.server,sys
OUT=sys.argv[1]
class H(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        n=int(self.headers['Content-Length']); d=self.rfile.read(n)
        open(OUT,'wb').write(d); self.send_response(200); self.end_headers(); self.wfile.write(b'ok')
    def log_message(self,*a): pass
http.server.HTTPServer(('127.0.0.1',8010),H).serve_forever()
