# Unified Entity Full Stack Architecture

**Status:** Architecture contract for the bounded tensor DAV slice. This document describes the requested topology; naming a layer does not establish that an external service is running or that it has authority.

## The Continuum Equation

\[
 \mathbf{\Delta VR\emptyset \text{ HOUSE}} := \underbrace{\Omega_{\text{React } (:3000)}}_{\text{The Surface (UI)}} \left( \underbrace{\Sigma_{\text{KAI (SHA-256)}}}_{\text{The Immune System}} \left[ \underbrace{\Theta_{\text{Fastify } (:5000)}}_{\text{The Bounded Spine}} \left( \lambda x. \underbrace{\Psi_{\text{Ollama } (:11434) \oplus \text{Python } (:8088)}}_{\text{The Local Brain \& Muscle}} \Big( \underbrace{\Delta_{\text{Human Root}} + \emptyset_{\text{Compute}}}_{\text{Intent + Void}} \Big) \right) \right] \right) \xrightarrow{\text{Evaluate}} \underbrace{T[i,j,k,l] = i+j+k+l}_{\text{The DAV Mathematical Law}}
\]

Where each bracket maps directly to a verified layer in the operational stack:

| Symbol | Layer | Port / Interface | Epistemic Invariant |
| --- | --- | --- | --- |
| **`Ω`** | **Surface (Outer Vessel)** | `:3000` (Vite / VibeOS) | Human-facing glass, visual inspection, progressive disclosure |
| **`Σ`** | **KAI Immune System** | SHA-256 / `kai_ledger.json` | Hash chain integrity, shield validation, tamper evidence |
| **`Θ`** | **Spine** | `:5000` (Fastify API) | Event loop, deterministic routing, rate limiting, SSE telemetry |
| **`λx.Ψ`** | **Brain** | `:11434` / LLM Adapter | Multi-turn reasoning, bounded intent analysis (`executeElion`) |
| **`Δ`** | **Root** | Repository / Workspace | Measured reality state, file changes, code and tests |
| **`∅`** | **Compute** | Deterministic Kernel | Zero-entropy computation, invariant checks, pure arithmetic |
| **`DAV`** | **Tensor Projection** | $T[i,j,k,l] = i + j + k + l$ | $N^2 \times N^2$ deterministic 4-tensor slice ($N \in \{4, 6, 8\}$) |

## Five-layer contract

| Layer | Name | Components and boundary |
| --- | --- | --- |
| 1 | **Human Root** | Human intent, values, authorization, and review are the source of meaning and decision authority. A software capability or cryptographic receipt does not replace the human. |
| 2 | **Immune System** | `packages/verification` applies deterministic checks and produces verifiable result receipts. A `kai_ledger.json` attestation is post-gate only: ordinary tensor `GET` requests are read-only and do not append to the ledger. |
| 3 | **Muscle & Voice** | `companion/python/oceanicos_companion.py` is the execution-free, stdlib-only evidence adapter. The repository also contains an optional standalone `companion/python/main.py` tensor/voice HTTP observer; it is not a dependency of the TypeScript path, is not fetched by Fastify, and is not evidence that `:8088` is running. Ollama at `:11434` is likewise optional and not an authority source. |
| 4 | **Fastify Spine** | `apps/api` serves the verified tensor receipt on `:5000`, at `/tensor/:size` and the `/api/tensor/:size` compatibility path. Unsupported sizes fail as `400 UNKNOWN`; failed invariants fail as `422 DIVERGENT`. |
| 5 | **React Surface** | `apps/web` serves the dashboard on `:3000`; its Tensor DAV visualizer displays the 2D projection, checksum, digest, and explicit error states. Vite rewrites browser `/api/tensor/:size` requests to the API `/tensor/:size` path. |

## Tensor DAV contract

For `N ∈ {4, 6, 8}`, the kernel computes `T[i,j,k,l] = i + j + k + l` over zero-based indices. It presents a declared projection with `row = i * N + j` and `column = k * N + l`, yielding `N² × N²` cells. Required invariants are `min = 0`, `max = 4*(N-1)`, `mean = 2*(N-1)`, and `checksum = 2*N^4*(N-1)`; expected checksums are `1536`, `12960`, and `57344`.

The kernel recomputes the expected matrix and invariants before computing SHA-256 over canonical JSON of the verified payload. The digest establishes integrity for that exact serialization; it is not a signature, external attestation, proof of deployment, or claim about a physical entity. Any mismatch is `DIVERGENT` and does not produce a verified digest.

## Companion reconciliation

The canonical Option A execution path is the pure TypeScript kernel served directly by `apps/api`; it does not call `companion/python` and it does not require a daemon on `:8088`. The optional `main.py` module can be run as an ASGI-compatible or stdlib HTTP service for independent observation, but its current contract is deliberately narrower than the original FastAPI/NumPy/HMAC proposal: it supports an optional NumPy accelerator with a stdlib fallback, emits SHA-256 digests, and maps unsupported or divergent local computation to HTTP `400 UNKNOWN`. Those semantics must not be described as FastAPI, HMAC attestation, or API-to-companion verification unless a separately authorized architecture change implements and tests them.

As of the current local audit, `main.py` was present in the checkout but no process was observed on `:8088`. That is `UNKNOWN`, not a failure of the TypeScript DAV route. The standalone module and this document therefore remain informational until a future review explicitly selects Option B and defines its lifecycle, dependency, and verification boundary.

## Read and attestation boundary

`GET /tensor/:size` and `GET /api/tensor/:size` are deterministic computations with no `kai_ledger.json` mutation. Append a matching swarm receipt only after the required verification gate has passed, following `SWARM_PROTOCOL.md §VI`; do not mark a failed, incomplete, or unobserved gate as `VERIFIED`. External publishing, pushing, merging, and deployment are outside this local implementation boundary and remain subject to human review.
