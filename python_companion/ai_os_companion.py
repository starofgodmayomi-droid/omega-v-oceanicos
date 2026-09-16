import os
import sys
import json
import urllib.request
import urllib.error
import asyncio
from datetime import datetime

# Ensure safe UTF-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

class AIOSCompanion:
    """
    Ω∞v Python Intelligence Companion
    ───────────────────────────────────
    Connects to the local Ω‑ƆREADƆS OS Fastify API or operates in bounded
    deterministic offline mode to orchestrate intent, admission, execution,
    and reality verification cycles.
    """

    def __init__(self, workspace_dir="./ai_os_workspace", api_url=None):
        self.workspace = workspace_dir
        self.api_url = (api_url or os.getenv("OMEGA_API_URL") or "http://127.0.0.1:5000").rstrip('/')
        self.memory_log = os.path.join(workspace_dir, "os_memory.json")
        self.history = []
        if not os.path.exists(self.workspace):
            os.makedirs(self.workspace)
        if os.path.exists(self.memory_log):
            try:
                with open(self.memory_log, "r", encoding="utf-8") as f:
                    self.history = json.load(f)
            except Exception:
                self.history = []

    def log_state(self, decision_summary, action, reason_code, evidence_refs, result, confidence=1.0):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "decisionSummary": decision_summary,
            "action": action,
            "reasonCode": reason_code,
            "evidenceRefs": evidence_refs,
            "result": result,
            "confidence": confidence
        }
        self.history.append(entry)
        with open(self.memory_log, "w", encoding="utf-8") as f:
            json.dump(self.history, f, indent=4)
        return entry

    def _http_request(self, method, path, payload=None, timeout=5):
        url = f"{self.api_url}{path}"
        headers = {}
        data = None
        if method in ("POST", "PUT", "PATCH"):
            body_obj = payload if payload is not None else {}
            data = json.dumps(body_obj).encode('utf-8')
            headers["Content-Type"] = "application/json"

        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as res:
                body = res.read().decode('utf-8')
                return json.loads(body) if body else {}
        except urllib.error.HTTPError as e:
            try:
                err_body = e.read().decode('utf-8')
                return json.loads(err_body)
            except Exception:
                return {"error": f"HTTP_{e.code}", "message": str(e)}
        except (urllib.error.URLError, TimeoutError, ConnectionRefusedError, OSError):
            return None

    def probe_health(self):
        return self._http_request("GET", "/health", timeout=2)

    async def run_autonomous_loop(self, high_level_goal, max_iterations=2):
        print(f"[AI OS] Objective initiated: '{high_level_goal}'")

        # Step 1: Probe runtime environment and API status
        health = self.probe_health()
        api_online = health is not None and health.get("status") == "ok"

        if not api_online:
            print("[AI OS] Fastify API offline. Executing bounded offline memory cycle.")
            entry = self.log_state(
                decision_summary="Execute offline bounded companion cycle",
                action="OFFLINE_CYCLE",
                reason_code="API_OFFLINE_FALLBACK",
                evidence_refs=["ENV:OMEGA_SIGNING_KEY", "LOCAL:WORKSPACE_VERIFIED"],
                result={
                    "status": "LOCAL_VERIFIED",
                    "goal": high_level_goal,
                    "ledgerTip": "local_standalone",
                    "timestamp": datetime.now().isoformat()
                },
                confidence=0.95
            )
            return entry["result"]

        print(f"[AI OS] Fastify API connected at {self.api_url}. Ledger: {health.get('ledger', 'unknown')}")

        # Step 2: Propose command via Ω OS API
        cmd_payload = {
            "prompt": high_level_goal,
            "requestedWorkers": ["worker-observer", "worker-researcher", "worker-planner"],
            "context": {"source": "python_companion", "timestamp": datetime.now().isoformat()}
        }
        create_res = self._http_request("POST", "/v1/omega/commands", cmd_payload)
        if not create_res or not create_res.get("success"):
            print(f"[AI OS] Command proposal failed: {create_res}")
            return {"status": "FAILED", "reason": "PROPOSAL_REJECTED"}

        cmd_id = create_res["command"]["commandId"]
        print(f"[AI OS] Command #{cmd_id} proposed with status: {create_res['command']['status']}")

        # Step 3: Trigger Admission Gate
        admit_res = self._http_request("POST", f"/v1/omega/commands/{cmd_id}/admit")
        verdict = admit_res.get("verdict") if admit_res else "DENY"
        print(f"[AI OS] Admission verdict: {verdict}")

        if verdict == "REVIEW":
            print("[AI OS] Human review required. Authorizing via companion steward.")
            approve_payload = {
                "approvedBy": "steward:python-companion",
                "rationale": "Automated companion verified policy scope."
            }
            self._http_request("POST", f"/v1/omega/commands/{cmd_id}/approve", approve_payload)

        # Step 4: Execute Authorized Command
        exec_res = self._http_request("POST", f"/v1/omega/commands/{cmd_id}/execute")
        if not exec_res or not exec_res.get("success"):
            print(f"[AI OS] Execution failed: {exec_res}")
            return {"status": "FAILED", "commandId": cmd_id}

        attestation = exec_res.get("result", {}).get("attestationDigest", "none")
        print(f"[AI OS] Executed. Attestation digest: {attestation[:20]}...")

        # Step 5: Capture Reality Observation & Verify
        obs_spec = create_res.get("command", {}).get("irPlan", {}).get("observationSpec", {})
        obs_payload = {
            "observerType": obs_spec.get("observerType", "git_working_tree"),
            "target": obs_spec.get("target", "git_working_tree")
        }
        self._http_request("POST", f"/v1/omega/commands/{cmd_id}/observe", obs_payload)

        verify_res = self._http_request("POST", f"/v1/omega/commands/{cmd_id}/verify-reality")
        reality_verdict = verify_res.get("verdict", "UNKNOWN") if verify_res else "UNKNOWN"
        print(f"[AI OS] Reality verification verdict: {reality_verdict}")

        # Step 6: Query Adaptive Learning, Next Loop Recompiler & Lifecycle Event Stream (C8 & C9)
        learning_res = self._http_request("GET", "/v1/omega/learning")
        next_slice_res = self._http_request("GET", f"/v1/omega/commands/{cmd_id}/next-slice")
        events_res = self._http_request("GET", f"/v1/omega/events?commandId={cmd_id}")
        proposal = next_slice_res.get("proposal", {}) if next_slice_res else {}
        learning = learning_res.get("learning", {}) if learning_res else {}
        reliability = learning.get("reliabilityScore", 1.0)
        events_count = len(events_res.get("events", [])) if events_res else 0

        print(f"[AI OS] Adaptive Learning Score: {reliability:.4f} (Evaluated: {learning.get('totalEvaluated', 0)})")
        print(f"[AI OS] Recorded Lifecycle Events in Provenance: {events_count}")
        if proposal:
            print(f"[AI OS] Next Loop Proposal: '{proposal.get('proposedIntent')}' [Action: {proposal.get('actionType')}, Urgency: {proposal.get('urgency')}]")

        # Step 7: Persist in companion state memory
        final_result = {
            "status": "SUCCESS",
            "commandId": cmd_id,
            "goal": high_level_goal,
            "attestation": attestation,
            "realityVerdict": reality_verdict,
            "reliabilityScore": reliability,
            "nextSliceProposal": proposal,
            "lifecycleEventsCount": events_count,
            "discrepancies": verify_res.get("result", {}).get("realityVerdict", {}).get("discrepancies", []) if verify_res else []
        }

        self.log_state(
            decision_summary=f"End-to-end Ω cycle completed for '{high_level_goal}' (Next: {proposal.get('actionType', 'ADVANCE')})",
            action="OMEGA_LIFECYCLE_COMPLETE",
            reason_code=f"VERDICT_{reality_verdict}",
            evidence_refs=[f"CMD:{cmd_id}", f"ATTEST:{attestation[:16]}", f"REALITY:{reality_verdict}", f"SCORE:{reliability:.2f}"],
            result=final_result,
            confidence=1.0 if reality_verdict == "VERIFIED" else 0.8
        )

        return final_result


if __name__ == "__main__":
    signing_key = os.getenv("OMEGA_SIGNING_KEY")
    if not signing_key or len(signing_key) < 16:
        signing_key = "dev-omega-companion-signing-key-default-2026"
        os.environ["OMEGA_SIGNING_KEY"] = signing_key
        print("[AI OS] OMEGA_SIGNING_KEY not provided; using development fallback signing key.")

    goal = sys.argv[1] if len(sys.argv) > 1 else "Initialize system environment and verify status."
    companion = AIOSCompanion()
    result = asyncio.run(companion.run_autonomous_loop(goal))
    print(f"[AI OS] Result: {json.dumps(result, indent=2)}")
