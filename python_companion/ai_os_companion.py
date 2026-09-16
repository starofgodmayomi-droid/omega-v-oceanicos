import os
import sys
import json
import asyncio
from datetime import datetime

# Ensure safe UTF-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

class AIOSCompanion:
    def __init__(self, workspace_dir="./ai_os_workspace"):
        self.workspace = workspace_dir
        self.memory_log = os.path.join(workspace_dir, "os_memory.json")
        self.history = []
        if not os.path.exists(self.workspace):
            os.makedirs(self.workspace)

    def log_state(self, decision_summary, action, reason_code, evidence_refs, result, confidence=1.0):
        self.history.append({
            "timestamp": datetime.now().isoformat(),
            "decisionSummary": decision_summary,
            "action": action,
            "reasonCode": reason_code,
            "evidenceRefs": evidence_refs,
            "result": result,
            "confidence": confidence
        })
        with open(self.memory_log, "w", encoding="utf-8") as f:
            json.dump(self.history, f, indent=4)

    async def run_autonomous_loop(self, high_level_goal, max_iterations=2):
        print(f"[AI OS] Objective initiated: '{high_level_goal}'")
        self.log_state(
            decision_summary="Initialize system environment and verify status",
            action="SYSTEM_INIT",
            reason_code="AUTH_START",
            evidence_refs=["ENV:OMEGA_SIGNING_KEY"],
            result={"status": "SUCCESS", "goal": high_level_goal},
            confidence=1.0
        )
        return {"status": "SUCCESS", "goal": high_level_goal}

if __name__ == "__main__":
    if not os.getenv("OMEGA_SIGNING_KEY") or len(os.getenv("OMEGA_SIGNING_KEY", "")) < 16:
        print("[ERROR] OMEGA_SIGNING_KEY required and must be at least 16 characters.")
        sys.exit(1)
    companion = AIOSCompanion()
    asyncio.run(companion.run_autonomous_loop("Initialize system environment and verify status."))
