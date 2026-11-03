import hashlib
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
LEDGER_FILE = os.environ.get("KAI_LEDGER_FILE") or os.path.join(HERE, "kai_ledger.json")
SCAM_PATTERNS = ["urgent", "send money", "guaranteed", "private key", "crypto giveaway", "wire transfer"]


class OceanicMagic:
    """The Fixpoint Law: KAI shield -> ELION execute -> OMEGA verify -> KAI remember."""

    def __init__(self, ledger_file: str = LEDGER_FILE):
        self.ledger_file = ledger_file
        if not os.path.exists(self.ledger_file):
            with open(self.ledger_file, "w") as f:
                json.dump([], f)

    def kai_shield(self, intent: str) -> dict:
        is_scam = any(pattern in intent.lower() for pattern in SCAM_PATTERNS)
        if is_scam:
            return {"safe": False, "status": "DIVERGENT", "reason": "KAI Shield blocked potential scam."}
        return {"safe": True, "status": "VERIFIED"}

    def elion_execute(self, intent: str, engine: str = "Local") -> str:
        if not intent.strip():
            return ""
        return f"Verified Execution [{engine}]: {intent[:40]}... | Status: Bounded Execution Complete."

    def omega_verify(self, output: str):
        if not output or len(output.strip()) < 5:
            return None
        return hashlib.sha256(output.encode()).hexdigest()

    def kai_remember(self, record: dict):
        with open(self.ledger_file, "r") as f:
            ledger = json.load(f)
        ledger.insert(0, record)
        with open(self.ledger_file, "w") as f:
            json.dump(ledger, f, indent=2)

    def get_ledger(self) -> list:
        with open(self.ledger_file, "r") as f:
            return json.load(f)


magic = OceanicMagic()
