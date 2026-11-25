# Unified Entity Full Stack Architecture

**Status:** Architecture contract for the bounded tensor DAV slice. This document describes the requested topology; naming a layer does not establish that an external service is running or that it has authority.

## Five-layer contract

| Layer | Name | Components and boundary |
| --- | --- | --- |
| 1 | **Human Root** | Human intent, values, authorization, and review are the source of meaning and decision authority. A software capability or cryptographic receipt does not replace the human. |
| 2 | **Immune System** | `packages/verification` applies deterministic checks and produces verifiable result receipts. A `kai_ledger.json` attestation is post-gate only: ordinary tensor `GET` requests are read-only and do not append to the ledger. |
| 3 | **Muscle & Voice** | `companion/python` remains an execution-free, stdlib-only evidence adapter; this work does not modify it. Ollama at `:11434` is an optional model endpoint in the proposed topology, not a dependency of the deterministic tensor kernel and not an authority source. |
| 4 | **Fastify Spine** | `apps/api` serves the verified tensor receipt on `:5000`, at `/tensor/:size` and the `/api/tensor/:size` compatibility path. Unsupported sizes fail as `400 UNKNOWN`; failed invariants fail as `422 DIVERGENT`. |
| 5 | **React Surface** | `apps/web` serves the dashboard on `:3000`; its Tensor DAV visualizer displays the 2D projection, checksum, digest, and explicit error states. Vite rewrites browser `/api/tensor/:size` requests to the API `/tensor/:size` path. |

## Tensor DAV contract

For `N ∈ {4, 6, 8}`, the kernel computes `T[i,j,k,l] = i + j + k + l` over zero-based indices. It presents a declared projection with `row = i * N + j` and `column = k * N + l`, yielding `N² × N²` cells. Required invariants are `min = 0`, `max = 4*(N-1)`, `mean = 2*(N-1)`, and `checksum = 2*N^4*(N-1)`; expected checksums are `1536`, `12960`, and `57344`.

The kernel recomputes the expected matrix and invariants before computing SHA-256 over canonical JSON of the verified payload. The digest establishes integrity for that exact serialization; it is not a signature, external attestation, proof of deployment, or claim about a physical entity. Any mismatch is `DIVERGENT` and does not produce a verified digest.

## Read and attestation boundary

`GET /tensor/:size` and `GET /api/tensor/:size` are deterministic computations with no `kai_ledger.json` mutation. Append a matching swarm receipt only after the required verification gate has passed, following `SWARM_PROTOCOL.md §VI`; do not mark a failed, incomplete, or unobserved gate as `VERIFIED`. External publishing, pushing, merging, and deployment are outside this local implementation boundary and remain subject to human review.

## LucidContinuum convergence axiom

The supplied expression

\[
\lim_{N\to\infty}\oint_{M_V}\nabla\Psi(x,t)\,d\mu = 1
\]

is retained as a user-supplied symbolic design axiom. In this repository it means
that repeated finite transitions may converge toward a state that satisfies its
declared verification surface. It does not claim that the repository measures
infinity, consciousness, cosmology, or physical reality.

The executable boundary is `packages/verification/src/continuum.ts`, exported by
the verification package. It evaluates one finite transition and preserves
`VERIFIED`, `DIVERGENT`, and `NOT_EXECUTED` as distinct states. `VERIFIED` requires
the declared candidate to match an explicitly supplied observed candidate; missing
or conflicting observation remains `DIVERGENT` even when authorization is present.
A SHA-256 adapter may hash its canonical receipt for byte integrity; that hash is
not proof that the underlying state is true. Repetition remains a sequence of
finite, human-governed transitions, never hidden continuous self-modification.
