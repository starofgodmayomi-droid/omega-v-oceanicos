# @oceanicos/elion

✋ **ELION** — the hands: bounded execution against a model provider.

```text
💧 Ω∞v ::= VERIFY(ΔREALITY)
ELION: execute one bounded transition · produce evidence or fail loudly
```

## What this package owns

- `resolveLlmProvider(env)` — picks `ANTHROPIC_API_KEY` (preferred) or
  `OPENAI_API_KEY`, honouring `OMEGA_LLM_PROVIDER` and `OMEGA_LLM_MODEL`.
- `completeWithConfiguredProvider(input, fetchImpl)` — one request, one
  completion. It throws rather than returning an empty string, so the caller
  records `UNKNOWN` instead of pretending an answer exists.
- `LlmCompletion` — the injectable seam used by tests.

## Boundary

ELION does not judge the answer (`@oceanicos/omega` does) and does not remember
it (`@oceanicos/kai` + `KaiMemoryStore` do). With no credential configured it
throws `LLM_NOT_CONFIGURED`; that is the correct answer, not a bug.
