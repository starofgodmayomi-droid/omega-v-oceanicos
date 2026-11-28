# attestation-node

SOURCE-ONLY 10-phase engine. `pnpm dev` does not start it. It is not a workspace member.

`executeEvolutionCycle` promotes at most one `PLANNED` node, and only when the snapshot parses, confidence is strictly above 0.90, blockers are empty, and the injected REA bridge reports no unknowns. A thrown bridge fail-closes. The engine does not spawn a shell.

Historical snapshot and tests live beside the engine.

See [Whole memory → REA](../../docs/WHOLE-MEMORY-REA.md).

## Whole-ecosystem alignment

SOURCE → ROOT → SUCCESS: this directory is source-only, the root canonical prompt defines the shared operating contract, and success means the relevant behavior is tested and verified—not merely named or present on disk.

`UNKNOWN` remains explicit when observation is missing. `DIVERGENT` remains explicit when source, contract, or expected behavior disagrees. Neither status is silently promoted to verified.

Canonical contract: [Whole-Ecosystem Master Prompt](../../WHOLE-ECOSYSTEM-MASTER-PROMPT.md).
