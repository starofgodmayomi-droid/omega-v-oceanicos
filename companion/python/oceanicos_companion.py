#!/usr/bin/env python3
"""Bounded Oceanicos companion for structured evidence review.

This module is deliberately execution-free. It converts observed records into
operator-readable decision envelopes and verifies exported ledger evidence. It
does not run shell commands, call remote services, handle credentials, or
expose hidden chain-of-thought.
"""

from __future__ import annotations

import json
import sys
from dataclasses import asdict, dataclass
from typing import Any, Mapping, Sequence

MAX_INPUT_KEYS = 64
MAX_TEXT_LENGTH = 2000
MAX_LEDGER_ENTRIES = 4096
ALLOWED_ACTIONS = frozenset({"observe", "verify", "remember", "report"})
GENESIS_HASH = "0x" + "0" * 64


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


def _javascript_utf16_units(text: str) -> Sequence[int]:
    """Return UTF-16 code units, matching JavaScript ``charCodeAt``."""
    encoded = text.encode("utf-16-le", "surrogatepass")
    return tuple(encoded[index] | (encoded[index + 1] << 8) for index in range(0, len(encoded), 2))


def _ledger_hash(entry: Mapping[str, Any]) -> str:
    """Reproduce ProvenanceStore's deterministic FNV-1a serialization."""
    payload = json.dumps(
        {
            "type": entry["type"],
            "data": entry["data"],
            "recordedAt": entry["recordedAt"],
            "previousHash": entry["previousHash"],
        },
        ensure_ascii=False,
        separators=(",", ":"),
    )
    hash_value = 0x811C9DC5
    for code_unit in _javascript_utf16_units(payload):
        hash_value ^= code_unit
        hash_value = (hash_value * 0x01000193) & 0xFFFFFFFF
    return "0x" + format(hash_value, "x").zfill(64)


def verify_ledger_chain(entries: Sequence[Mapping[str, Any]]) -> dict[str, Any]:
    """Independently verify bounded ledger links and recomputed entry hashes.

    The return value is deliberately structured for an audit record. A failure
    stops at the first broken entry and never repairs or mutates the input.
    """
    if not isinstance(entries, Sequence) or isinstance(entries, (str, bytes, bytearray)):
        return {"valid": False, "checked": 0, "reason": "entries must be a list"}
    if len(entries) > MAX_LEDGER_ENTRIES:
        return {"valid": False, "checked": 0, "reason": f"entries exceeds {MAX_LEDGER_ENTRIES}"}

    previous_hash = GENESIS_HASH
    for index, entry in enumerate(entries):
        if not isinstance(entry, Mapping):
            return {"valid": False, "checked": index, "brokenAt": index, "reason": "entry must be an object"}
        required = ("id", "type", "data", "recordedAt", "hash", "previousHash")
        missing = [field for field in required if field not in entry]
        if missing:
            return {"valid": False, "checked": index, "brokenAt": index, "reason": f"missing fields: {', '.join(missing)}"}
        if entry["id"] != index + 1:
            return {"valid": False, "checked": index, "brokenAt": entry["id"], "reason": "sequence id is not contiguous"}
        if entry["previousHash"] != previous_hash:
            return {"valid": False, "checked": index, "brokenAt": entry["id"], "reason": "previousHash does not link to the chain"}
        try:
            expected_hash = _ledger_hash(entry)
        except (KeyError, TypeError, ValueError):
            return {"valid": False, "checked": index, "brokenAt": entry["id"], "reason": "entry fields are not serializable"}
        if entry["hash"] != expected_hash:
            return {"valid": False, "checked": index, "brokenAt": entry["id"], "reason": "hash does not match canonical entry bytes"}
        previous_hash = entry["hash"]

    return {"valid": True, "checked": len(entries), "reason": "ledger links and hashes verified"}


def main() -> int:
    """Read one JSON record or ledger export from stdin and emit one result."""
    try:
        payload = json.load(sys.stdin)
        if isinstance(payload, list):
            result = verify_ledger_chain(payload)
        else:
            result = asdict(inspect_record(payload))
    except (json.JSONDecodeError, OSError, TypeError, ValueError) as error:
        print(json.dumps({"error": str(error)}))
        return 1
    print(json.dumps(result, sort_keys=True))
    return 0 if result.get("valid", True) else 1


if __name__ == "__main__":
    raise SystemExit(main())
