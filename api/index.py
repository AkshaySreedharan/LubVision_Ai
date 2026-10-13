import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from server import LoobVisionHandler, workflow_app

class handler(LoobVisionHandler):
    """Vercel serverless function entrypoint for /api/*"""
    def do_POST(self):
        super().do_POST()

    def do_GET(self):
        clean_path = self.path.split("?")[0].rstrip("/")
        if any(term in clean_path for term in ("status", "health")):
            self.send_json_response({
                "status": "ready",
                "model": "Original Image Model",
                "backend_ready": workflow_app is not None
            })
            return
        super().do_GET()

app = handler
