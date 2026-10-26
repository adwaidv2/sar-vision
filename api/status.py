from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        data = {
            "status": "online",
            "framework": "Vercel Serverless Python 3.9",
            "project_title": "AI-Based SAR Image Translation and Terrain Analysis",
            "environment": "Vercel Edge & Cloud Infrastructure",
            "pipeline_mode": "Demonstration Signal Processing (Lee filter + CLAHE + K-Means)",
            "deep_learning_status": "Planned / Offline Model Training Split (CNN + U-Net)"
        }
        self.wfile.write(json.dumps(data, indent=2).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
