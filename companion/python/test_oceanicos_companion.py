import unittest

from oceanicos_companion import inspect_record


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


if __name__ == "__main__":
    unittest.main()
