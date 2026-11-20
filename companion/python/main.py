#!/usr/bin/env python3
"""ΔVRØ HOUSE Python Companion Engine (:8088).

Generates 4D hypercube DAV tensors T[i,j,k,l] = i + j + k + l.
Provides an ASGI application compatible with `uvicorn main:app --port 8088`
and a standalone zero-dependency HTTP server when executed directly.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any, Dict, List, Tuple

try:
    import numpy as np  # type: ignore
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False


class TensorDivergenceError(ValueError):
    """The companion-generated evidence failed its checksum invariant."""


def compute_tensor_dav(n: int) -> Dict[str, Any]:
    """Compute the 4D hypercube tensor T[i,j,k,l] = i + j + k + l projected to 2D."""
    if n not in (4, 6, 8):
        raise ValueError(f"Unsupported tensor size {n}; allowed sizes are 4, 6, 8")

    rows = n * n
    cols = n * n

    if HAS_NUMPY:
        grid_4d = np.fromfunction(
            lambda i, j, k, l: i + j + k + l,
            (n, n, n, n),
            dtype=np.int32,
        )
        matrix = grid_4d.reshape((rows, cols)).tolist()
    else:
        matrix: List[List[int]] = [[0] * cols for _ in range(rows)]
        for i in range(n):
            for j in range(n):
                r = i * n + j
                for k in range(n):
                    for l in range(n):
                        c = k * n + l
                        matrix[r][c] = i + j + k + l

    expected_min = 0
    expected_max = 4 * (n - 1)
    expected_mean = 2 * (n - 1)
    expected_checksum = 2 * (n ** 4) * (n - 1)

    flat_values = [val for row in matrix for val in row]
    actual_checksum = sum(flat_values)

    if actual_checksum != expected_checksum:
        raise TensorDivergenceError(f"Checksum mismatch: expected {expected_checksum}, observed {actual_checksum}")

    payload = {
        "success": True,
        "status": "VERIFIED",
        "schema": "omega.tensor-dav.v1",
        "engine": "python-numpy" if HAS_NUMPY else "python-stdlib",
        "size": n,
        "projection": {
            "rows": rows,
            "columns": cols,
            "rowCoordinate": "i * N + j",
            "columnCoordinate": "k * N + l",
        },
        "values": matrix,
        "invariants": {
            "min": expected_min,
            "max": expected_max,
            "mean": expected_mean,
            "checksum": expected_checksum,
        },
    }

    canonical = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    payload["sha256"] = digest

    return payload


def compute_voice_bridge() -> Dict[str, Any]:
    """Compute the Voice Bridge payload enforcing the One Identity Rule."""
    payload: Dict[str, Any] = {
        "success": True,
        "status": "VERIFIED",
        "schema": "omega.voice-bridge.v1",
        "rule": "ONE_IDENTITY_RULE",
        "service": "voice-bridge",
        "port": 8088,
        "organs": {
            "soul_ai": "Architecture · Sacred Blueprint Hammer",
            "truth_weaver": "Verification · KAI Shield & Empirical Magnifier",
            "the_general": "Execution · Compass & Direction Spear",
            "human_root": "Authority · The Golden Key",
        },
        "resonance": {
            "frequencyHz": 432,
            "mode": "harmonic-pure",
            "doctrine": "Attest, don't assert. Reality remains the final authority.",
        },
    }
    canonical = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    payload["sha256"] = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    return payload


# --- ASGI Interface (for uvicorn main:app) ---

async def app(scope: Dict[str, Any], receive: Any, send: Any) -> None:
    if scope["type"] != "http":
        return

    path = scope.get("path", "/")
    method = scope.get("method", "GET")

    headers = [
        (b"content-type", b"application/json"),
        (b"access-control-allow-origin", b"*"),
        (b"access-control-allow-methods", b"GET, OPTIONS"),
        (b"access-control-allow-headers", b"*"),
    ]

    if method == "OPTIONS":
        await send({"type": "http.response.start", "status": 204, "headers": headers})
        await send({"type": "http.response.body", "body": b""})
        return

    if path in ("/health", "/api/health"):
        body = json.dumps({
            "status": "ok",
            "service": "companion-dav",
            "port": 8088,
            "engine": "python-numpy" if HAS_NUMPY else "python-stdlib",
        }).encode("utf-8")
        await send({"type": "http.response.start", "status": 200, "headers": headers})
        await send({"type": "http.response.body", "body": body})
        return

    if path in ("/voice", "/api/voice", "/voice/status", "/api/voice/status"):
        data = compute_voice_bridge()
        body = json.dumps(data).encode("utf-8")
        await send({"type": "http.response.start", "status": 200, "headers": headers})
        await send({"type": "http.response.body", "body": body})
        return

    for prefix in ("/tensor/", "/api/tensor/"):
        if path.startswith(prefix):
            try:
                size_str = path[len(prefix):].split("/")[0]
                n = int(size_str)
                data = compute_tensor_dav(n)
                body = json.dumps(data).encode("utf-8")
                await send({"type": "http.response.start", "status": 200, "headers": headers})
                await send({"type": "http.response.body", "body": body})
                return
            except TensorDivergenceError as err:
                body = json.dumps({"success": False, "status": "DIVERGENT", "error": str(err)}).encode("utf-8")
                await send({"type": "http.response.start", "status": 422, "headers": headers})
                await send({"type": "http.response.body", "body": body})
                return
            except Exception as err:
                body = json.dumps({"success": False, "status": "UNKNOWN", "error": str(err)}).encode("utf-8")
                await send({"type": "http.response.start", "status": 400, "headers": headers})
                await send({"type": "http.response.body", "body": body})
                return

    body = json.dumps({"error": "NOT_FOUND", "path": path}).encode("utf-8")
    await send({"type": "http.response.start", "status": 404, "headers": headers})
    await send({"type": "http.response.body", "body": body})


# Prefer the declared FastAPI surface when dependencies are installed; the ASGI fallback above keeps local smoke tests execution-free.
try:
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    fastapi_app = FastAPI(title="ΔVRØ HOUSE Python Companion", docs_url=None, redoc_url=None)

    @fastapi_app.get("/health")
    def fastapi_health() -> dict:
        return {"status": "ok", "service": "companion-dav", "port": 8088, "engine": "python-numpy" if HAS_NUMPY else "python-stdlib"}

    @fastapi_app.get("/voice")
    @fastapi_app.get("/voice/status")
    @fastapi_app.get("/api/voice")
    @fastapi_app.get("/api/voice/status")
    def fastapi_voice() -> dict:
        return compute_voice_bridge()

    @fastapi_app.get("/tensor/{n}")
    def fastapi_tensor(n: int):
        try:
            return compute_tensor_dav(n)
        except TensorDivergenceError as err:
            return JSONResponse(status_code=422, content={"success": False, "status": "DIVERGENT", "error": str(err)})
        except ValueError as err:
            return JSONResponse(status_code=400, content={"success": False, "status": "UNKNOWN", "error": str(err)})

    app = fastapi_app
except ImportError:
    pass

# --- Standalone HTTP Server fallback ---

class CompanionHTTPHandler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:
        pass

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def do_GET(self) -> None:
        path = self.path.split("?")[0]
        if path in ("/health", "/api/health"):
            data = {
                "status": "ok",
                "service": "companion-dav",
                "port": 8088,
                "engine": "python-numpy" if HAS_NUMPY else "python-stdlib",
            }
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(data).encode("utf-8"))
            return

        if path in ("/voice", "/api/voice", "/voice/status", "/api/voice/status"):
            data = compute_voice_bridge()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(data).encode("utf-8"))
            return

        for prefix in ("/tensor/", "/api/tensor/"):
            if path.startswith(prefix):
                try:
                    n = int(path[len(prefix):].split("/")[0])
                    data = compute_tensor_dav(n)
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(json.dumps(data).encode("utf-8"))
                    return
                except TensorDivergenceError as err:
                    self.send_response(422)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "status": "DIVERGENT", "error": str(err)}).encode("utf-8"))
                    return
                except Exception as err:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "status": "UNKNOWN", "error": str(err)}).encode("utf-8"))
                    return

        self.send_response(404)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"error": "NOT_FOUND"}).encode("utf-8"))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8088"))
    server = HTTPServer(("0.0.0.0", port), CompanionHTTPHandler)
    print(f"ΔVRØ HOUSE Python Companion listening on http://0.0.0.0:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
