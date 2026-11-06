#!/usr/bin/env python3
"""Print one ΩVØØS receipt as JSON.

Section V of the stored directive names this file as a 3-pane ocean UI.
The UI itself is served by the repository web surface: apps/web/src/EntityBodyPanel.tsx
(three panes, #030812 ocean, #00e5ff cyan), reading POST /v1/ovoos/entity.
This process does not start a server, call a model, or write a ledger.

Usage: python3 app.py "intent" [phase_t]
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def main() -> int:
    intent = sys.argv[1] if len(sys.argv) > 1 else ""
    phase = sys.argv[2] if len(sys.argv) > 2 else "0"
    script = Path(__file__).with_name("backend_magic.ts")
    completed = subprocess.run(
        ["node", "--experimental-strip-types", str(script), intent, phase],
        check=False,
        capture_output=True,
        text=True,
    )
    sys.stdout.write(completed.stdout)
    sys.stderr.write(completed.stderr)
    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())
