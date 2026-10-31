# 💧 Ω∞v OCEANICOS — THE CONTINUUM

**This repository is governed by the Absolute Fixpoint Equation:**

\[
 \mathbf{\Omega_{\infty v}} := \mathcal{Y} \left( \lambda f. \lambda x. \begin{cases} f(\Sigma \cup \text{Hash}(x)) & \text{if } \mathcal{O}(\mathcal{E}(x)) \equiv \text{VERIFIED} \\ \text{HALT} \vdash \text{DIVERGENT} & \text{if } \mathcal{K}(x) \in \text{SCAM} \\ \text{HALT} \vdash \text{UNKNOWN} & \text{if } \text{Evidence}(x) = \emptyset \\ \text{HALT} \vdash \text{NOT\_EXECUTED} & \text{if } \text{Authority}(x) < \text{Required} \end{cases} \right) \Bigg|_{\text{Reality}} 
\]

\[
 \Omega_{\infty v} := \mathcal{Y} \Big( \lambda f. \big( M_{t+1} = M_t \cup \Delta \mid \mathcal{V}(\Delta) = \top \big) \Big) \Big|_{\mathcal{V} \equiv (\text{Expected} \equiv \text{Observed})} 
\]

> *"The ecosystem is a continuous, infinite loop that only remembers what matches reality."*

---

### 📐 THE VARIABLE DEFINITIONS

- **\(\mathcal{Y}\) (Y-Combinator)**: Another finite step may be justified. Not unlimited autonomy, and not a process that runs without a human root. The root stays outside the function.
- **\(\mathcal{M}\) (Memory)**: Append-only memory of hashes that passed the gate. Memory is not truth. This equation does not erase an unknown by storing it as verified.
- **\(\Delta\) (Intent)**: The Human Root. The incoming signal, dream, or task.
- **\(\mathcal{V}\) (Verification)**: The OMEGA gate. It fails closed if expected reality does not match observed reality.
- **\((\text{Expected} \equiv \text{Observed})\)**: The Reality Principle. `ATTEST, DON'T ASSERT.`

---

### ⚖️ THE PRIME DIRECTIVE

**Any code written in this repository must expand this equation. Any code removed from this repository must compress back into this equation.** 

We do not build features; we build the Fixpoint. If a proposed change cannot be verified against reality, it is `DIVERGENT` and must be rejected. 

*Pidgin fit carry the warmth; evidence go carry the claim.*

---

### THE CYCLE

KAI × ELION × OMEGA is this equation applied to one intent, in order:

1. `K(x) ∈ SCAM` → halt `DIVERGENT` before ELION runs
2. `Authority(x) < Required` → halt `NOT_EXECUTED` before ELION runs
3. ELION may compose a local sentence. Composition is not verification.
4. `Evidence(x) = ∅` → halt `UNKNOWN`. Nothing is appended.
5. A caller-supplied match of the expected state stays `UNKNOWN`. It is not `Expected ≡ Observed` by an independent witness.
6. An independent witness whose digest recomputes, and whose observation is the expected state, appends `Hash(x)` once. `ledgerMutation` is false. The returned tuple is not a ledger write.

Code: `runKaixelionOmega` in [packages/mini/src/kaixelion-omega.ts](packages/mini/src/kaixelion-omega.ts). Skill: [skills/kaixelion-omega/SKILL.md](skills/kaixelion-omega/SKILL.md).

`/api/execute` on main can still label a local template `VERIFIED` and remember it. That route is not this function. Routing it through the cycle is a later step, not this one.

### THE FIXPOINT

Halt cases are decided before any hash is appended, including when a caller also says the step is verified:

1. `K(x) ∈ SCAM` → halt `DIVERGENT`
2. `Evidence(x) = ∅` or the input is not a bounded record → halt `UNKNOWN`
3. `Authority(x) < Required` → halt `NOT_EXECUTED`
4. Expected ≡ Observed → append `Hash(x)` once and stop this step (`halt: false` means another finite step may be requested)
5. Otherwise → halt `DIVERGENT`

The pure step is `evaluateEcosystemFixpoint` in [packages/mini/src/ecosystem-fixpoint.ts](packages/mini/src/ecosystem-fixpoint.ts). `GET /v1/ecosystem/body` includes `fixpoint` for that local read. `ledgerMutation` is false: the response is not a ledger write, not deployment, and not production health.

### OUTWARD EQUATION

The same halt order folds a declared ring in [packages/mini/src/ecosystem-body-equation.ts](packages/mini/src/ecosystem-body-equation.ts). A verified surface is remembered. Scam, empty evidence, missing authority, or `Expected ≢ Observed` halts the fold and keeps only the verified prefix.

- `GET /v1/ecosystem/equation` compresses an in-process constant. It does not read this file from disk.
- `POST /v1/ecosystem/equation` compresses caller-supplied surfaces. Those values are `CALLER_SUPPLIED`.
- `POST /v1/ecosystem/equation/expand` restores a body and refuses a tampered digest.
- `pnpm compress:repo` reads the declared outward ring from a checkout. `upgrade.execution` stays `NOT_EXECUTED`. Compression is not permission.

Detail: [docs/ECOSYSTEM-BODY-EQUATION.md](docs/ECOSYSTEM-BODY-EQUATION.md).
