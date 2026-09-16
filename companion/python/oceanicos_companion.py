#!/usr/bin/env python3
"""Bounded Oceanicos companion for structured evidence review.

This module is deliberately execution-free. It converts an observed record into
an operator-readable decision envelope; it does not run shell commands, call
remote services, handle credentials, or expose hidden chain-of-thought.
"""

from __future__ import annotations

import json
import sys
from dataclasses import asdict, dataclass
from typing import Any, Mapping

MAX_INPUT_KEYS = 64
MAX_TEXT_LENGTH = 2000
ALLOWED_ACTIONS = frozenset({"observe", "verify", "remember", "report"})


@dataclass(frozen=True)
class CompanionDecision:
    decisionSummary: str
    action: str
    reasonCode: str
    evidenceRefs: tuple[str, ...]
    result: str
    confidence: float
    authorizationRequired: bool
    executed: bool
    limitations: tuple[str, ...]


def _bounded_text(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} must be a non-empty string")
    if len(value) > MAX_TEXT_LENGTH:
        raise ValueError(f"{field} exceeds {MAX_TEXT_LENGTH} characters")
    return value.strip()


def inspect_record(record: Mapping[str, Any]) -> CompanionDecision:
    """Create a bounded decision envelope from one observed record.

    The companion reports a recommendation only. ``executed`` is always false;
    consequential work must be routed through an authorized platform surface.
    """
    if not isinstance(record, Mapping):
        raise ValueError("record must be an object")
    if len(record) > MAX_INPUT_KEYS:
        raise ValueError(f"record exceeds {MAX_INPUT_KEYS} top-level keys")

    action = _bounded_text(record.get("action", "report"), "action")
    if action not in ALLOWED_ACTIONS:
        raise ValueError(f"action must be one of: {', '.join(sorted(ALLOWED_ACTIONS))}")

    summary = _bounded_text(record.get("decisionSummary", "Evidence reviewed"), "decisionSummary")
    reason = _bounded_text(record.get("reasonCode", "EVIDENCE_REVIEW"), "reasonCode")
    refs = record.get("evidenceRefs", [])
    if not isinstance(refs, list) or any(not isinstance(ref, str) or not ref.strip() for ref in refs):
        raise ValueError("evidenceRefs must be a list of non-empty strings")
    if len(refs) > 32:
        raise ValueError("evidenceRefs exceeds 32 entries")

    confidence = record.get("confidence", 0.0)
    if not isinstance(confidence, (int, float)) or isinstance(confidence, bool) or not 0 <= confidence <= 1:
        raise ValueError("confidence must be a number between 0 and 1")

    return CompanionDecision(
        decisionSummary=summary,
        action=action,
        reasonCode=reason,
        evidenceRefs=tuple(ref.strip() for ref in refs),
        result="RECOMMENDATION_ONLY",
        confidence=float(confidence),
        authorizationRequired=action not in {"observe", "verify", "remember"},
        executed=False,
        limitations=(
            "local process only",
            "no shell or remote execution",
            "no credential handling",
            "human authorization remains required for consequential actions",
        ),
    )


def main() -> int:
    """Read one JSON record from stdin and emit one JSON decision envelope."""
    try:
        record = json.load(sys.stdin)
        decision = inspect_record(record)
    except (json.JSONDecodeError, OSError, ValueError) as error:
        print(json.dumps({"error": str(error)}))
        return 1
    print(json.dumps(asdict(decision), sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
