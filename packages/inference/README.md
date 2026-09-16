# @omega-v/inference

Live local LLM inference client for Ω∞v Oceanicos.

Connects to Ollama (`InferenceClient`) for on-premises machine learning analysis and structured assessments of telemetry observations.

## Role

* Analyzes telemetry observations and returns structured AI risk assessments and recommendations.
* Graceful fallback: when Ollama is offline or unavailable, returns a deterministic stub result with cryptographic proof.
