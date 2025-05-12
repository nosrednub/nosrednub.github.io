#!/usr/bin/env python3
"""
Enhanced HTTP server for serving ES modules with proper MIME types and error handling.
"""

import http.server
import socketserver
import os
import sys
import logging
from urllib.parse import urlparse

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger('EnhancedServer')

class EnhancedHandler(http.server.SimpleHTTPRequestHandler):
    """Enhanced HTTP request handler with better MIME type support and logging."""
    
    def __init__(self, *args, directory=None, **kwargs):
        if directory is None:
            directory = os.getcwd()
        self.directory = os.path.abspath(directory)
        super().__init__(*args, directory=directory, **kwargs)

    def log_message(self, format, *args):
        """Log messages with more detail."""
        logger.info("%s - %s", self.address_string(), format % args)

    def log_error(self, format, *args):
        """Log errors with more detail."""
        logger.error("%s - %s", self.address_string(), format % args)
        
    def guess_type(self, path):
        """Override to add proper MIME types for JavaScript modules."""
        base, ext = os.path.splitext(path)
        
        if ext == '.js':
            return 'text/javascript; charset=UTF-8'
        elif ext == '.json':
            return 'application/json; charset=UTF-8'
        elif ext == '.html' or ext == '.htm':
            return 'text/html; charset=UTF-8'
        elif ext == '.css':
            return 'text/css; charset=UTF-8'
            
        return super().guess_type(path)
    
    def send_file_content(self, path):
        """Send file content with detailed error handling."""
        try:
            with open(path, 'rb') as file:
                content = file.read()
                self.send_response(200)
                content_type = self.guess_type(path)
                self.send_header("Content-type", content_type)
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                
                # Log successful serving
                logger.info(f"Successfully served {path} as {content_type}")
                
                self.wfile.write(content)
        except Exception as e:
            logger.error(f"Error serving {path}: {str(e)}")
            self.send_error(500, f"Internal server error: {str(e)}")

    def do_GET(self):
        """Handle GET requests with better error handling."""
        parsed_path = urlparse(self.path)
        request_path = parsed_path.path
        
        # Convert URL path to local file path
        if request_path == '/':
            file_path = os.path.join(self.directory, 'index.html')
        else:
            # Strip leading '/' and convert to file path
            relative_path = request_path.lstrip('/')
            file_path = os.path.join(self.directory, relative_path)
        
        # Log the request details
        logger.info(f"GET request for {request_path} -> {file_path}")
        
        # Check if the file exists
        if os.path.exists(file_path) and os.path.isfile(file_path):
            self.send_file_content(file_path)
        else:
            logger.warning(f"File not found: {file_path}")
            self.send_error(404, f"File not found: {request_path}")
    
    def end_headers(self):
        """Add CORS and caching headers."""
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type")
        
        # No caching for development
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        
        super().end_headers()

def run_server(port=5555):
    """Run the server with the enhanced handler."""
    handler = EnhancedHandler
    
    try:
        with socketserver.TCPServer(("", port), handler) as httpd:
            logger.info(f"Server started at http://localhost:{port}")
            logger.info(f"Serving files from: {os.getcwd()}")
            logger.info("Press Ctrl+C to stop the server")
            httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
        httpd.server_close()
        sys.exit(0)
    except Exception as e:
        logger.error(f"Server error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    run_server() 