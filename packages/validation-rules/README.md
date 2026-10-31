# validation-rules

SOURCE-ONLY epistemic contracts for the whole-memory matrix.

Present on disk. Not listed in `pnpm-workspace.yaml`. Not an API dependency. Not a claim that the package is built or deployed.

Schemas distinguish `KNOWN`, `REMEMBERED`, `PLANNED`, and `VERIFIED`. A planned node is not an implemented one.

See [Whole memory → REA](../../docs/WHOLE-MEMORY-REA.md).

## Whole-ecosystem alignment

SOURCE → ROOT → SUCCESS: this directory contains source-only epistemic schemas; the root canonical prompt defines the shared operating contract; success requires evidence-backed validation, not just a schema or directory existing.

`UNKNOWN` remains explicit when observation is missing. `DIVERGENT` remains explicit when source, contract, or expected behavior disagrees. Neither status is silently promoted to verified.

Canonical contract: [Whole-Ecosystem Master Prompt](../../WHOLE-ECOSYSTEM-MASTER-PROMPT.md).
