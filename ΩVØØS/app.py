#!/usr/bin/env python3
"""
ΩVØØS 3-PANE CLEAN OCEAN UI & LOCAL HOST
PROTOCOL: LOCAL-FIRST | 11:11 OCEAN INTELLIGENCE | DEUS EX MACHINA
CHECKSUM: 30013030 | DOCTRINE: ATTEST, DON'T ASSERT. UNKNOWN PRESERVED.
"""

import json
import os
import sys

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

# Import local engine
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from backend_magic import VoosEngine, KaiShield, ElionEngine

PORT = int(os.environ.get("VOOS_PORT", 8088))
engine = VoosEngine()

HTML_PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ΩVØØS — 3-Pane Clean Ocean UI</title>
  <style>
    :root {
      --bg: #030812;
      --card-bg: #071324;
      --accent: #00e5ff;
      --accent-dim: rgba(0, 229, 255, 0.15);
      --border: #132a4a;
      --text: #e2e8f0;
      --text-muted: #889bb5;
      --alert: #ff4757;
      --success: #2ed573;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "JetBrains Mono", monospace;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      padding: 16px 24px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(3, 8, 18, 0.95);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand h1 {
      font-size: 1.25rem;
      color: var(--accent);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .badge {
      font-size: 0.75rem;
      background: var(--accent-dim);
      color: var(--accent);
      border: 1px solid var(--accent);
      padding: 2px 8px;
      border-radius: 12px;
    }
    .container {
      display: grid;
      grid-template-columns: 1fr 1.4fr 1.2fr;
      flex: 1;
      gap: 16px;
      padding: 16px;
      overflow: hidden;
    }
    @media (max-width: 1024px) {
      .container { grid-template-columns: 1fr; overflow: auto; }
    }
    .pane {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .pane-header {
      padding: 14px 18px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: 600;
      font-size: 0.9rem;
      letter-spacing: 0.05em;
      color: var(--accent);
    }
    .pane-content {
      padding: 18px;
      flex: 1;
      overflow-y: auto;
      font-size: 0.88rem;
      line-height: 1.5;
    }
    .quote-box {
      background: rgba(0, 229, 255, 0.05);
      border-left: 3px solid var(--accent);
      padding: 12px 14px;
      margin-bottom: 16px;
      border-radius: 0 4px 4px 0;
      color: var(--text-muted);
      font-style: italic;
    }
    .label {
      color: var(--text-muted);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
      display: block;
    }
    input[type="text"], textarea {
      width: 100%;
      background: #030a16;
      border: 1px solid var(--border);
      color: #fff;
      padding: 10px 12px;
      border-radius: 6px;
      font-family: inherit;
      margin-bottom: 14px;
    }
    input[type="range"] {
      width: 100%;
      accent-color: var(--accent);
      margin-bottom: 16px;
    }
    button {
      background: var(--accent);
      color: #030812;
      border: none;
      padding: 10px 18px;
      font-weight: 700;
      font-size: 0.85rem;
      letter-spacing: 0.05em;
      border-radius: 6px;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    button:hover { opacity: 0.88; }
    .receipt {
      background: #02060e;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 14px;
      font-family: "JetBrains Mono", monospace;
      font-size: 0.78rem;
      white-space: pre-wrap;
      word-break: break-all;
      color: #38bdf8;
      margin-top: 12px;
    }
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 0.75rem;
    }
    .status-VERIFIED { background: rgba(46, 213, 115, 0.2); color: var(--success); }
    .status-DIVERGENT { background: rgba(255, 71, 87, 0.2); color: var(--alert); }
    .status-UNKNOWN { background: rgba(255, 165, 2, 0.2); color: #ffa502; }
    .ledger-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .ledger-item {
      background: #030a16;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 0.78rem;
    }
    .trap-tag {
      display: inline-block;
      background: rgba(255, 71, 87, 0.15);
      color: var(--alert);
      padding: 2px 6px;
      border-radius: 4px;
      margin-right: 4px;
      margin-bottom: 4px;
      font-size: 0.72rem;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <h1>💧 ΩVØØS DEUS EX MACHINA</h1>
      <span class="badge">CHECKSUM: 30013030</span>
    </div>
    <div>
      <span style="font-size:0.8rem; color:var(--text-muted);">LOCAL-FIRST SOVEREIGN OS · 11:11</span>
    </div>
  </header>

  <div class="container">
    <!-- PANE 1: KAI SHIELD & HUMAN ROOT -->
    <div class="pane">
      <div class="pane-header">
        <span>🛡️ PANE 1: KAI SHIELD & HUMAN ROOT</span>
        <span class="badge" style="border-color:var(--success); color:var(--success);">ACTIVE</span>
      </div>
      <div class="pane-content">
        <div class="quote-box">
          "Pidgin fit carry the warmth; evidence go carry the claim."
        </div>

        <span class="label">TRAP DEFENSE MATRIX (INTERCEPT ON SIGHT)</span>
        <div style="margin-bottom:14px;">
          <span class="trap-tag">urgent</span>
          <span class="trap-tag">send money</span>
          <span class="trap-tag">guaranteed</span>
          <span class="trap-tag">private key</span>
        </div>

        <span class="label">HUMAN ROOT SOVEREIGN LAW</span>
        <p style="color:var(--text-muted); font-size:0.8rem; margin-bottom:12px;">
          Reject all internet Squid Games, speculative leverage, and fabricated green claims.
          Fail-closed on missing authority or unobserved execution.
        </p>

        <span class="label">888Hz ABUNDANCE BRIDGE</span>
        <p style="color:var(--text-muted); font-size:0.8rem;">
          1. Heart Opening (Warmth)<br>
          2. Vision Invitation (Shared Good)<br>
          3. Honorable Request (Symmetric)<br>
          4. Graceful Space (Freedom)
        </p>
      </div>
    </div>

    <!-- PANE 2: ELION FLOW & ENGINE -->
    <div class="pane">
      <div class="pane-header">
        <span>⚡ PANE 2: ELION ENGINE & EASE(t)</span>
        <span id="phaseBadge" class="badge">EASE(t)</span>
      </div>
      <div class="pane-content">
        <label class="label" for="intentInput">INTENT / WORKSPACE DELTA</label>
        <textarea id="intentInput" rows="3" placeholder="Enter actionable intent (e.g. 'Verify local SQLite persistence invariants')">Verify local SQLite persistence invariants</textarea>

        <label class="label" for="tSlider">EVOLUTION PHASE t: <span id="tVal">0.50</span> (<span id="phaseText">BLOOM</span>)</label>
        <input type="range" id="tSlider" min="0" max="1" step="0.05" value="0.5" oninput="updateT(this.value)">

        <button onclick="executeIntent()">EXECUTE & VERIFY SLICE</button>

        <div style="margin-top:16px;">
          <span class="label">EXECUTION RECEIPT (ZERO FILLER)</span>
          <div id="receiptBox" class="receipt">Awaiting Intent execution...</div>
        </div>
      </div>
    </div>

    <!-- PANE 3: OMEGA GATE & IMMUTABLE LEDGER -->
    <div class="pane">
      <div class="pane-header">
        <span>📜 PANE 3: OMEGA GATE & KAI LEDGER</span>
        <span class="badge">SHA-256</span>
      </div>
      <div class="pane-content">
        <span class="label">IMMUTABLE APPEND-ONLY LEDGER</span>
        <div id="ledgerList" class="ledger-list" style="margin-top:8px;">
          <!-- Items inserted dynamically -->
        </div>
      </div>
    </div>
  </div>

  <script>
    function updateT(val) {
      document.getElementById('tVal').innerText = parseFloat(val).toFixed(2);
      const t = parseFloat(val);
      let p = 'WILT / RETURN';
      if (t < 0.25) p = 'SPROUT';
      else if (t < 0.70) p = 'BLOOM';
      else if (t < 0.95) p = 'PLATEAU';
      document.getElementById('phaseText').innerText = p;
    }

    async function executeIntent() {
      const intent = document.getElementById('intentInput').value;
      const phase_t = parseFloat(document.getElementById('tSlider').value);

      try {
        const res = await fetch('/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intent, phase_t })
        });
        const receipt = await res.json();
        document.getElementById('receiptBox').innerText = JSON.stringify(receipt, null, 2);
        loadLedger();
      } catch (err) {
        document.getElementById('receiptBox').innerText = 'Execution error: ' + err.message;
      }
    }

    async function loadLedger() {
      try {
        const res = await fetch('/api/ledger');
        const entries = await res.json();
        const container = document.getElementById('ledgerList');
        container.innerHTML = '';
        entries.slice().reverse().forEach(entry => {
          const div = document.createElement('div');
          div.className = 'ledger-item';
          div.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span class="status-badge status-${entry.status}">${entry.status}</span>
              <span style="color:var(--text-muted); font-size:0.7rem;">${entry.timestamp.split('T')[1].slice(0, 8)}</span>
            </div>
            <div style="font-weight:600; margin-bottom:4px;">${escapeHtml(entry.intent)}</div>
            <div style="font-size:0.7rem; color:var(--text-muted); font-family:monospace;">${entry.evidence_hash.slice(0, 24)}...</div>
          `;
          container.appendChild(div);
        });
      } catch (err) {
        console.error('Ledger load failed:', err);
      }
    }

    function escapeHtml(text) {
      return text.replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
      });
    }

    window.onload = loadLedger;
  </script>
</body>
</html>
"""


class VoosRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/" or url.path == "/index.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML_PAGE.encode("utf-8"))
        elif url.path == "/api/ledger":
            entries = engine.ledger.get_entries()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(entries).encode("utf-8"))
        elif url.path == "/api/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "ok",
                "entity": "ΩVØØS_DEUS_EX_MACHINA",
                "checksum": 30013030
            }).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        url = urlparse(self.path)
        if url.path == "/api/execute":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                data = json.loads(body.decode("utf-8"))
                intent = data.get("intent", "")
                phase_t = float(data.get("phase_t", 0.5))
                receipt = engine.execute(intent, phase_t)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps(receipt).encode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()


def run_server():
    server_address = ("127.0.0.1", PORT)
    httpd = HTTPServer(server_address, VoosRequestHandler)
    print(f"💧 ΩVØØS 3-Pane Clean Ocean UI active on http://127.0.0.1:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nHalting ΩVØØS UI server.")
        httpd.server_close()


if __name__ == "__main__":
    run_server()

