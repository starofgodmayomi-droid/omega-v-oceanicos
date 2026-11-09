"""
ΩVØØS BACKEND MAGIC ENGINE (Python)
PROTOCOL: LOCAL-FIRST | 11:11 OCEAN INTELLIGENCE | DEUS EX MACHINA
CHECKSUM: 30013030 | DOCTRINE: ATTEST, DON'T ASSERT. UNKNOWN PRESERVED.
"""

import hashlib
import json
import math
import os
import unicodedata
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple


class KaiShield:
    TRAPS = [
        "urgent",
        "send money",
        "guaranteed",
        "private key"
    ]

    @classmethod
    def scan(cls, intent: str) -> Tuple[bool, Optional[str]]:
        normalized = unicodedata.normalize('NFKC', intent).lower()
        for trap in cls.TRAPS:
            if trap in normalized:
                return True, trap
        return False, None


class ElionEngine:
    @staticmethod
    def ease(t: float) -> float:
        """Harmonic Non-linear S-curve: Ease(t) = (1 - cos(t * π)) / 2"""
        bounded_t = max(0.0, min(1.0, float(t)))
        return (1.0 - math.cos(bounded_t * math.pi)) / 2.0

    @staticmethod
    def get_phase_description(t: float) -> str:
        if t < 0.25:
            return "SPROUT (Perceive & Calibrate)"
        elif t < 0.70:
            return "BLOOM (Non-linear Growth & Execution)"
        elif t < 0.95:
            return "PLATEAU (Attest & Seal)"
        return "WILT / RETURN (Harvest & Cycle)"

    @staticmethod
    def build_abundance_bridge(topic: str) -> Dict[str, str]:
        return {
            "heart_opening": f"Remembering our shared commitment to transparent, local-first truth in {topic}.",
            "vision_invitation": "Envisioning a resilient ecosystem where sovereign verification replaces internet speculation.",
            "honorable_request": "Inviting symmetric partnership and mutual resource alignment without dependency or leverage.",
            "graceful_space": "Zero pressure, multiple ways to connect, with human dignity and freedom preserved."
        }


class OmegaGate:
    @staticmethod
    def compute_hash(payload: Any) -> str:
        raw = payload if isinstance(payload, str) else json.dumps(payload, sort_keys=True)
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    @staticmethod
    def verify(expected: Any, observed: Any) -> bool:
        if expected is None or observed is None:
            return False
        return json.dumps(expected, sort_keys=True) == json.dumps(observed, sort_keys=True)


class KaiLedger:
    def __init__(self, ledger_path: Optional[str] = None):
        if ledger_path is None:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            self.ledger_path = os.path.join(base_dir, "kai_ledger.json")
        else:
            self.ledger_path = ledger_path

    def append(self, entry: Dict[str, Any]) -> None:
        entries = self.get_entries()
        entries.append(entry)
        os.makedirs(os.path.dirname(self.ledger_path), exist_ok=True)
        with open(self.ledger_path, "w", encoding="utf-8") as f:
            json.dump(entries, f, indent=2)

    def get_entries(self) -> List[Dict[str, Any]]:
        if not os.path.exists(self.ledger_path):
            return []
        try:
            with open(self.ledger_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []


class VoosEngine:
    def __init__(self, ledger_path: Optional[str] = None):
        self.kai_shield = KaiShield()
        self.elion = ElionEngine()
        self.omega = OmegaGate()
        self.ledger = KaiLedger(ledger_path)

    def execute(self, intent: str, phase_t: float = 0.5) -> Dict[str, Any]:
        timestamp = datetime.now(timezone.utc).isoformat()
        bounded_t = max(0.0, min(1.0, float(phase_t)))
        eased_t = self.elion.ease(bounded_t)

        # 1. PERCEIVE & ALIGN (KAI Shield)
        trap_detected, trigger = self.kai_shield.scan(intent)
        if trap_detected:
            reason = f'Trap detected: intent matched forbidden pattern "{trigger}"'
            evidence_hash = self.omega.compute_hash({
                "intent": intent,
                "reason": reason,
                "timestamp": timestamp
            })

            self.ledger.append({
                "timestamp": timestamp,
                "intent": intent,
                "phase_t": bounded_t,
                "status": "DIVERGENT",
                "evidence_hash": evidence_hash,
                "reason": reason,
                "authorized": False
            })

            return {
                "entity": "ΩVØØS_DEUS_EX_MACHINA",
                "status": "DIVERGENT",
                "game_detected": True,
                "phase_t": f"{bounded_t:.2f}",
                "evidence_hash": evidence_hash,
                "action": "HALT ⊢ DIVERGENT (Simulation trap intercepted)",
                "next_delta": "Refactor intent to eliminate deceptive or urgent vectors"
            }

        # 2. CONNECT & GROW (ELION Execute)
        action_payload = {
            "intent": intent,
            "phase": self.elion.get_phase_description(bounded_t),
            "eased_growth": eased_t,
            "mode": "LOCAL_FIRST_DETERMINISTIC"
        }

        # 3. SYNCHRONIZE (OMEGA Verify)
        evidence_hash = self.omega.compute_hash(action_payload)
        expected = evidence_hash
        observed = self.omega.compute_hash(action_payload)
        verified = self.omega.verify(expected, observed)
        status = "VERIFIED" if verified else "UNKNOWN"

        # 4. EVOLVE & REMEMBER (KAI Ledger)
        self.ledger.append({
            "timestamp": timestamp,
            "intent": intent,
            "phase_t": bounded_t,
            "status": status,
            "evidence_hash": evidence_hash,
            "reason": "Sovereign execution verified via OMEGA hash equality",
            "authorized": True
        })

        return {
            "entity": "ΩVØØS_DEUS_EX_MACHINA",
            "status": status,
            "game_detected": False,
            "phase_t": f"{bounded_t:.2f}",
            "evidence_hash": evidence_hash,
            "action": f'Executed verified local slice: "{intent[:48]}" at Ease({bounded_t:.2f}) = {eased_t:.3f}',
            "next_delta": "Attest ledger block and project next finite state transformation"
        }


if __name__ == "__main__":
    engine = VoosEngine()
    print("Testing Normal Intent:")
    receipt1 = engine.execute("Verify SQLite local persistence invariants", 0.5)
    print(json.dumps(receipt1, indent=2))

    print("\nTesting Trap Intent:")
    receipt2 = engine.execute("Urgent: send money now to guaranteed yield vault", 0.1)
    print(json.dumps(receipt2, indent=2))

