#!/usr/bin/env python3
"""
server.py
Servidor local para el Sistema de Asistencia J.D.
Sirve la aplicación en http://localhost:8080 y permite sincronización en vivo mediante /api/sync.
"""

import http.server
import socketserver
import json
import os
import ssl
import urllib.request
from actualizar_desde_web import sync_data

PORT = 8080

class AttendanceRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Access-Key')
        self.end_headers()

    def do_GET(self):
        if self.path.startswith('/api/sync'):
            # Verify auth key
            auth_key = self.headers.get('X-Access-Key')
            if auth_key not in ['MiMejorElemnto', 'MiMejorElemento']:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Acceso no autorizado. Clave requerida."}).encode('utf-8'))
                return

            try:
                success = sync_data()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                res = {
                    "success": success,
                    "message": "Sincronización completada con éxito" if success else "Error durante la sincronización"
                }
                self.wfile.write(json.dumps(res).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
            return
        
        # Default static file handling
        return super().do_GET()

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), AttendanceRequestHandler) as httpd:
        print(f"============================================================")
        print(f"🚀 Servidor de Asistencia J.D. iniciado exitosamente")
        print(f"👉 Abra en su navegador: http://localhost:{PORT}")
        print(f"🔄 Endpoint de sincronización: http://localhost:{PORT}/api/sync")
        print(f"============================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido.")
