# attestation-node

SOURCE-ONLY 10-phase engine. `pnpm dev` does not start it. It is not a workspace member.

`executeEvolutionCycle` promotes at most one `PLANNED` node, and only when the snapshot parses, confidence is strictly above 0.90, blockers are empty, and the injected REA bridge reports no unknowns. A thrown bridge fail-closes. The engine does not spawn a shell.

Historical snapshot and tests live beside the engine.

See [Whole memory → REA](../../docs/WHOLE-MEMORY-REA.md).
