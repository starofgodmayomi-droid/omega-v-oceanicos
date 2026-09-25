import unittest

from oceanicos_companion import GENESIS_HASH, _ledger_hash, inspect_record, verify_ledger_chain


class CompanionContractTests(unittest.TestCase):
    def test_returns_structured_non_executing_recommendation(self):
        decision = inspect_record(
            {
                "decisionSummary": "Review signed evidence",
                "action": "report",
                "reasonCode": "ATTESTATION_REVIEW",
                "evidenceRefs": ["att-1", "obs-1"],
                "confidence": 0.95,
            }
        )
        self.assertEqual(decision.result, "RECOMMENDATION_ONLY")
        self.assertEqual(decision.evidenceRefs, ("att-1", "obs-1"))
        self.assertFalse(decision.executed)
        self.assertTrue(decision.authorizationRequired)
        self.assertIn("no shell or remote execution", decision.limitations)

    def test_rejects_unsupported_action(self):
        with self.assertRaisesRegex(ValueError, "action must be one of"):
            inspect_record({"action": "shell", "decisionSummary": "not allowed"})

    def test_rejects_unbounded_input(self):
        with self.assertRaisesRegex(ValueError, "top-level keys"):
            inspect_record({str(index): index for index in range(65)})

    def test_rejects_invalid_confidence(self):
        with self.assertRaisesRegex(ValueError, "between 0 and 1"):
            inspect_record({"confidence": 2, "decisionSummary": "invalid"})

    def _chain(self):
        entries = []
        previous = GENESIS_HASH
        for index, data in enumerate(
            ({"message": "Ω∞v"}, {"message": "second", "ok": True}), start=1
        ):
            entry = {
                "id": index,
                "type": "OBSERVATION",
                "data": data,
                "recordedAt": f"2026-09-15T17:00:0{index}.000Z",
                "hash": "",
                "previousHash": previous,
            }
            entry["hash"] = _ledger_hash(entry)
            entries.append(entry)
            previous = entry["hash"]
        return entries

    def test_verifies_valid_hash_chain(self):
        self.assertEqual(
            verify_ledger_chain(self._chain()),
            {"valid": True, "checked": 2, "reason": "ledger links and hashes verified"},
        )

    def test_rejects_tampered_data_and_broken_link(self):
        tampered = self._chain()
        tampered[0]["data"]["message"] = "forged"
        result = verify_ledger_chain(tampered)
        self.assertFalse(result["valid"])
        self.assertEqual(result["brokenAt"], 1)
        self.assertIn("hash", result["reason"])

        broken = self._chain()
        broken[1]["previousHash"] = GENESIS_HASH
        result = verify_ledger_chain(broken)
        self.assertFalse(result["valid"])
        self.assertEqual(result["brokenAt"], 2)
        self.assertIn("previousHash", result["reason"])


if __name__ == "__main__":
    unittest.main()
