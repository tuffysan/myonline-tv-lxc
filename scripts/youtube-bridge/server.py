#!/usr/bin/env python3
"""Loopback-only, public-video YouTube stream resolver. Experimental."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs
import json, subprocess, os, re, threading, time

HOST = "127.0.0.1"
PORT = int(os.environ.get("MYONLINE_YOUTUBE_BRIDGE_PORT", "5089"))
VIDEO = re.compile(r"^[A-Za-z0-9_-]{11}$")
GATE = threading.BoundedSemaphore(2)
CALLS = {}
LOCK = threading.Lock()

class Handler(BaseHTTPRequestHandler):
    def reply(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urlparse(self.path)
        if path.path == "/health":
            return self.reply(200, {"ok": True})
        if path.path != "/resolve":
            return self.reply(404, {"error": "Not found"})
        video = parse_qs(path.query).get("id", [""])[0]
        if not VIDEO.fullmatch(video):
            return self.reply(400, {"error": "Invalid video ID"})
        now = time.monotonic()
        with LOCK:
            for key in list(CALLS):
                if now - CALLS[key] > 60:
                    del CALLS[key]
            if video in CALLS:
                return self.reply(429, {"error": "Please retry shortly"})
            CALLS[video] = now
        if not GATE.acquire(blocking=False):
            return self.reply(503, {"error": "Resolver busy"})
        try:
            proc = subprocess.run(
                ["yt-dlp", "--no-playlist", "--no-warnings", "--no-progress",
                 "--skip-download", "-J",
                 "-f", "best[ext=mp4][acodec!=none][vcodec!=none]/best[acodec!=none][vcodec!=none]",
                 "https://www.youtube.com/watch?v=" + video],
                capture_output=True, text=True, timeout=40)
            if proc.returncode:
                return self.reply(502, {"error": "Video unavailable or resolver failed"})
            data = json.loads(proc.stdout)
            media = data.get("url")
            if not isinstance(media, str) or not media.startswith("https://"):
                return self.reply(502, {"error": "No compatible stream"})
            return self.reply(200, {"id": video, "title": data.get("title", ""),
                                    "stream": media, "note": "Temporary direct stream; browser compatibility varies"})
        except (OSError, ValueError, subprocess.TimeoutExpired):
            return self.reply(502, {"error": "Resolver unavailable"})
        finally:
            GATE.release()

if __name__ == "__main__":
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
