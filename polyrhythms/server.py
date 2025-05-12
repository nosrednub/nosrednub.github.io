import http.server
import socketserver
import os

class ModuleAwareHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
    
    def guess_type(self, path):
        """Guess the type of a file.
        
        Add proper MIME types for JavaScript modules.
        """
        base, ext = os.path.splitext(path)
        
        if ext == '.js':
            return 'text/javascript; charset=UTF-8'
        
        return super().guess_type(path)
        
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

# Configure and start the server
port = 5555
handler = ModuleAwareHandler
httpd = socketserver.TCPServer(("", port), handler)

print(f"Serving at http://localhost:{port}")
httpd.serve_forever() 