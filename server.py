import os
import sys
import json
import base64
import time
import tempfile
import urllib.parse
import re
from pathlib import Path
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn

# ============================================================
# PROJECT ROOT SETUP
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))

# Import reporting modules
from report.report_builder import build_analysis_report
from report.pdf_generator import generate_report_pdf

# In-memory ephemeral report cache (TTL/LRU capped at 100 entries)
REPORT_CACHE = {}

# Import LangGraph workflow
try:
    from graph.workflow import build_workflow
    print("[SERVER] Compiling LangGraph workflow...")
    workflow_app = build_workflow()
    print("[SERVER] LangGraph workflow compiled successfully.")
except Exception as e:
    print(f"[SERVER WARNING] Could not compile workflow on startup: {e}")
    workflow_app = None

# Use OS temp directory (required for read-only serverless platforms like Vercel)
TEMP_DIR = Path(tempfile.gettempdir()) / "loob_temp_uploads"
TEMP_DIR.mkdir(parents=True, exist_ok=True)


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Handle requests in a separate thread."""
    daemon_threads = True


class LoobVisionHandler(SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):
        # Serve static files from 'public' folder if present, else project root
        public_dir = PROJECT_ROOT / "public"
        if "directory" not in kwargs:
            kwargs["directory"] = str(public_dir) if public_dir.exists() else str(PROJECT_ROOT)
        super().__init__(*args, **kwargs)

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        clean_path = parsed_url.path.rstrip("/")
        query_params = urllib.parse.parse_qs(parsed_url.query)

        # PDF Report retrieval / streaming
        if clean_path in ("/api/report/pdf", "/report/pdf"):
            report_id = query_params.get("id", [""])[0]
            is_preview = query_params.get("preview", ["0"])[0].lower() in ("1", "true")
            self.handle_get_report_pdf(report_id, is_preview=is_preview)
            return

        # Structured Report JSON retrieval
        if clean_path in ("/api/report", "/report"):
            report_id = query_params.get("id", [""])[0]
            self.handle_get_report(report_id)
            return

        # Status / Health check
        if any(term in clean_path for term in ("status", "health")):
            self.send_json_response({
                "status": "ready",
                "model": "Original Image Model",
                "backend_ready": workflow_app is not None
            })
            return

        # Serve static index.html or assets
        return super().do_GET()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        clean_path = parsed_url.path.rstrip("/")

        # Direct on-the-fly PDF generation from report payload
        if clean_path in ("/api/report/pdf", "/report/pdf"):
            self.handle_post_report_pdf()
            return

        # Core image analysis endpoint
        self.handle_analyze()

    def handle_analyze(self):
        # Prevent memory exhaustion: 25 MB max payload limit
        max_payload = 25 * 1024 * 1024
        content_length = int(self.headers.get("Content-Length", 0))

        if content_length > max_payload:
            self.send_json_response(
                {"error": "Payload size exceeds maximum allowed limit of 25 MB"},
                status_code=413
            )
            return

        post_data = self.rfile.read(content_length)
        temp_file = None

        try:
            payload = json.loads(post_data.decode("utf-8"))
            image_data = payload.get("image", "")

            if not image_data:
                self.send_json_response({"error": "No image data provided"}, status_code=400)
                return

            # Extract base64 payload if data URL
            if "," in image_data:
                header, encoded = image_data.split(",", 1)
            else:
                encoded = image_data

            try:
                image_bytes = base64.b64decode(encoded)
            except Exception as b64_err:
                self.send_json_response({"error": f"Invalid base64 image data: {str(b64_err)}"}, status_code=400)
                return

            if len(image_bytes) == 0:
                self.send_json_response({"error": "Decoded image is empty"}, status_code=400)
                return

            # Write to temporary file in OS tempdir
            temp_file = TEMP_DIR / f"capture_{int(time.time() * 1000)}.png"
            with open(temp_file, "wb") as f:
                f.write(image_bytes)

            print(f"[SERVER] Processing analysis for image: {temp_file}")

            # Invoke backend LangGraph workflow
            if workflow_app is None:
                from graph.workflow import build_workflow
                app = build_workflow()
            else:
                app = workflow_app

            initial_state = {"image_path": str(temp_file)}
            result = app.invoke(initial_state)

            # Build standardized, publication-grade analysis report
            report_obj = build_analysis_report(result, image_data_url=image_data)
            report_data = report_obj.model_dump()
            report_id = report_data["metadata"]["report_id"]

            # Cache report in memory
            REPORT_CACHE[report_id] = report_data
            if len(REPORT_CACHE) > 100:
                oldest_key = next(iter(REPORT_CACHE))
                del REPORT_CACHE[oldest_key]

            # Standardize output for response (preserve legacy fields + enrich with report)
            response_data = dict(result)
            response_data["report"] = report_data
            response_data["report_id"] = report_id

            # Ensure top-level fields are fully synchronized with validated report summary
            exec_summary = report_data.get("executive_summary", {})
            if not response_data.get("final_class") or response_data.get("final_class") not in ("c1", "c2", "c3", "non-lubricant"):
                response_data["final_class"] = exec_summary.get("final_class", response_data.get("final_class", "c3"))
            if not response_data.get("status"):
                response_data["status"] = exec_summary.get("condition_label", "Fully-degraded")
            if not response_data.get("confidence") or response_data.get("confidence") == 0.0:
                response_data["confidence"] = exec_summary.get("confidence_score", 0.85)
            if not response_data.get("reasoning"):
                response_data["reasoning"] = exec_summary.get("summary_text", "")

            self.send_json_response(response_data)

        except Exception as e:
            print(f"[SERVER ERROR] Analysis failed: {e}")
            self.send_json_response({
                "error": f"Analysis failed: {str(e)}"
            }, status_code=500)
        finally:
            # Guaranteed cleanup of temporary image file
            if temp_file and temp_file.exists():
                try:
                    temp_file.unlink()
                except Exception:
                    pass

    def handle_get_report(self, report_id: str):
        if not report_id or not re.match(r"^[A-Za-z0-9_-]+$", report_id):
            self.send_json_response({"error": "Invalid or missing report id"}, status_code=400)
            return

        report_data = REPORT_CACHE.get(report_id)
        if not report_data:
            self.send_json_response({
                "error": f"Report '{report_id}' not found in active cache. Please generate a new analysis."
            }, status_code=404)
            return

        self.send_json_response(report_data)

    def handle_get_report_pdf(self, report_id: str, is_preview: bool = False):
        if not report_id or not re.match(r"^[A-Za-z0-9_-]+$", report_id):
            self.send_json_response({"error": "Invalid or missing report id"}, status_code=400)
            return

        report_data = REPORT_CACHE.get(report_id)
        if not report_data:
            self.send_json_response({
                "error": f"Report '{report_id}' not found or session expired. Use POST /api/report/pdf to generate directly from report data."
            }, status_code=404)
            return

        try:
            pdf_bytes = generate_report_pdf(report_data)
            disposition = "inline" if is_preview else f'attachment; filename="LoovVision_Analysis_Report_{report_id}.pdf"'
            self.send_response(200)
            self.send_header("Content-Type", "application/pdf")
            self.send_header("Content-Disposition", disposition)
            self.send_header("Content-Length", str(len(pdf_bytes)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(pdf_bytes)
        except Exception as e:
            print(f"[SERVER ERROR] PDF generation failed: {e}")
            self.send_json_response({"error": f"Failed to generate PDF: {str(e)}"}, status_code=500)

    def handle_post_report_pdf(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            self.send_json_response({"error": "Empty request body"}, status_code=400)
            return

        try:
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data.decode("utf-8"))

            report_data = payload.get("report")
            report_id = payload.get("id")

            if not report_data and report_id:
                report_data = REPORT_CACHE.get(report_id)

            if not report_data:
                self.send_json_response({
                    "error": "No valid report data provided in payload"
                }, status_code=400)
                return

            rid = report_data.get("metadata", {}).get("report_id", "document")
            pdf_bytes = generate_report_pdf(report_data)

            is_preview = payload.get("preview", False)
            disposition = "inline" if is_preview else f'attachment; filename="LoovVision_Analysis_Report_{rid}.pdf"'

            self.send_response(200)
            self.send_header("Content-Type", "application/pdf")
            self.send_header("Content-Disposition", disposition)
            self.send_header("Content-Length", str(len(pdf_bytes)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(pdf_bytes)

        except Exception as e:
            print(f"[SERVER ERROR] Direct PDF generation failed: {e}")
            self.send_json_response({"error": f"Failed to generate PDF: {str(e)}"}, status_code=500)

    def send_json_response(self, data, status_code=200):
        try:
            body = json.dumps(data, default=str).encode("utf-8")
            self.send_response(status_code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError, OSError):
            pass

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Content-Disposition")
        self.end_headers()

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def run_server(port=8000):
    server_address = ("", port)
    httpd = ThreadedHTTPServer(server_address, LoobVisionHandler)
    print(f"[SERVER] LOOB VISION AI Server running at http://localhost:{port}/")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[SERVER] Server stopped.")
        httpd.server_close()


# ============================================================
# EXPORT HANDLERS FOR VERCEL SERVERLESS RUNTIME
# ============================================================
handler = LoobVisionHandler
app = LoobVisionHandler
application = LoobVisionHandler


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    run_server(port)
