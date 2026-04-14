from __future__ import annotations

import json
import mimetypes
import re
import subprocess
import tempfile
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse


APP_DIR = Path(__file__).resolve().parent
ROOT_DIR = APP_DIR.parent
NOTES_DIR = ROOT_DIR / "notes"
NOTES_DIR.mkdir(exist_ok=True)


def sanitize_filename(title: str) -> str:
    cleaned = re.sub(r'[<>:"/\\|?*\n\r\t]+', " ", title).strip().rstrip(".")
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned or "未命名笔记"


def build_export_html(title: str, content: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>{title}</title>
    <style>
      body {{
        font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
        color: #111827;
        line-height: 1.85;
        padding: 28px;
      }}
      h1 {{
        font-size: 24px;
        margin: 0 0 24px;
      }}
      p, div, li, blockquote {{
        margin: 0 0 12px;
      }}
      img {{
        max-width: 100%;
        height: auto;
        display: block;
        margin: 18px 0;
      }}
    </style>
  </head>
  <body>
    <h1>{title}</h1>
    {content}
  </body>
</html>
"""


class NotebookHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        self.serve_static(urlparse(self.path).path)

    def do_POST(self) -> None:
        if urlparse(self.path).path != "/api/save-note":
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return
        self.handle_save_note()

    def handle_save_note(self) -> None:
        content_length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(content_length)

        try:
            payload = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            self.send_error(HTTPStatus.BAD_REQUEST, "Invalid JSON")
            return

        title = (payload.get("title") or "未命名笔记").strip()
        content = payload.get("content") or "<p></p>"
        filename = sanitize_filename(title)
        docx_path = NOTES_DIR / f"{filename}.docx"
        export_html = build_export_html(title, content)

        try:
            with tempfile.NamedTemporaryFile("w", suffix=".html", encoding="utf-8", delete=False) as temp_file:
                temp_file.write(export_html)
                temp_html_path = Path(temp_file.name)

            try:
                subprocess.run(
                    ["/usr/bin/textutil", "-convert", "docx", str(temp_html_path), "-output", str(docx_path)],
                    cwd=str(ROOT_DIR),
                    check=True,
                    capture_output=True,
                    text=True,
                )
            finally:
                temp_html_path.unlink(missing_ok=True)
        except subprocess.CalledProcessError as error:
            self.respond_json(
                {
                    "ok": False,
                    "message": "Word 导出失败",
                    "paths": {"docx": str(docx_path)},
                    "stderr": error.stderr.strip(),
                },
                status=HTTPStatus.INTERNAL_SERVER_ERROR,
            )
            return

        self.respond_json({"ok": True, "paths": {"docx": str(docx_path)}})

    def serve_static(self, raw_path: str) -> None:
        path = "/" if raw_path == "" else raw_path
        target = APP_DIR / "index.html" if path == "/" else (APP_DIR / unquote(path.lstrip("/"))).resolve()

        if APP_DIR not in target.parents and target != APP_DIR:
            self.send_error(HTTPStatus.FORBIDDEN, "Forbidden")
            return
        if not target.exists() or not target.is_file():
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return

        mime_type, _ = mimetypes.guess_type(str(target))
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", mime_type or "application/octet-stream")
        self.end_headers()
        self.wfile.write(target.read_bytes())

    def respond_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args) -> None:
        return


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8000), NotebookHandler)
    print("Notebook Online running at http://127.0.0.1:8000")
    server.serve_forever()
