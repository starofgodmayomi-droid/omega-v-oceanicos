# OCEANICOS API Contracts

This directory documents the canonical API contracts between OCEANICOS services, workers, and clients.

## Core HTTP Endpoints (`apps/api`)

| Route | Method | Purpose | Authority / Gate |
|---|---|---|---|
| `/api/kernel/state` | GET | Current kernel state head & chain summary | Read-only |
| `/api/kernel/states` | GET | Complete canonical state lineage | Read-only |
| `/api/kernel/transition` | POST | Propose or submit state transition | Validated via IR & Admission |
| `/api/kernel/authorize` | POST | Human steward approval gate | Requires steward DID + Signature |
| `/api/kernel/execute` | POST | Execute authorized transition | Must be in `READY` status |
| `/api/kernel/integrity` | GET | Run cryptographic hash-chain self-audit | Read-only verification |
| `/api/kernel/save` | POST | Explicit persistence checkpoint to disk | System authority |
| `/api/omega/lifecycle` | POST | Unified propose → observe → reconcile pipeline | Bounded executor |
| `/api/omega/events` | GET | Real-time lifecycle event streaming (SSE) | Read-only |
| `/api/omega/learning` | GET | Aggregate feedback & recurrent discrepancies | Read-only |
| `/api/omega/next-slice` | GET/POST | Autonomous & operator next-slice proposals | Review / Operator gate |
| `/api/verify` | POST | Verification-as-a-Service (VaaS) endpoint | Evidence-bound |
| `/api/pluralism/face` | GET/POST | Epistemic 5-Face Pluralistic Reality Matrix | Non-collapse evaluator |

## Invariants
1. **Never allow execution without authorization**: Any endpoint initiating action must verify human or delegated policy approval.
2. **Fail-Closed**: Unrecognized parameters or malformed payloads must return 400 Bad Request immediately.
3. **Evidence-Bound Responses**: Status responses must include observed data or digests, never ungrounded claims.
