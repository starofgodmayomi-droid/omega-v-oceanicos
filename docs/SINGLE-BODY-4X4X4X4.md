# Ω∞v Single Body — 4×4×4×4 Compression / Expansion

**Status:** `SUPPORTED` as a bounded local representation contract. Not a claim of
unlimited compression, deployment, or external availability.

## Space

The single body is addressed by four axes with four coordinates each:

| Axis | Coordinates | Question it answers |
| --- | --- | --- |
| `layer` | `reality · system · evidence · authority` | Where the record sits in the body |
| `organ` | `sense · verify · remember · express` | Which organ produced or holds it |
| `form` | `runtime · contract · intent · boundary` | What kind of thing it is |
| `evidence` | `VERIFIED · SUPPORTED · UNVERIFIED · UNKNOWN` | How strong the evidence is |

`4 × 4 × 4 × 4 = 256` addressable cells. A cell can hold more than one record, so
the space bounds addressing, not the number of records alone; the contract still
refuses a body of more than 256 records (`BODY_OVER_CAPACITY`) rather than
dropping any.

Compression is **bounded addressing with lossless expansion**, not size reduction:
the point is one inspectable body with a fixed address space and a verifiable
round trip. Byte-level compression is out of scope and not claimed.

## Contract

`packages/mini/src/single-body.ts`

- `compressSingleBody(entries)` → `{ status, body, issues }`
  - validates every record (id, text fields, coordinates, unique ids)
  - groups records into cells by address, preserving original index
  - returns a sparse cell list with a SHA-256 digest per cell and per body
- `expandSingleBody(compressed)` → `{ status, entries, digestMatches, issues }`
  - fails closed on unknown space, out-of-range address, duplicate ids,
    non-contiguous indexes, or any digest mismatch
  - restores records in their original order with their raw `status`
- `verifySingleBodyRoundTrip(entries)` → `VERIFIED | DIVERGENT | INVALID`

`VERIFIED` here means only that this local compress → expand round trip returned
the same records and digest. It is evidence about the representation, not about
reality.

## API

`GET /v1/ecosystem/body` carries a `compression` block:

```json
{
  "space": { "notation": "4×4×4×4", "rank": 4, "shape": [4, 4, 4, 4], "capacity": 256 },
  "projection": "body.layers.v1",
  "count": 7,
  "filled": 7,
  "empty": 249,
  "digest": "…",
  "cells": [{
    "address": [0, 0, 0, 1],
    "key": "reality/sense/runtime/SUPPORTED",
    "digest": "…",
    "entries": [{ "index": 0, "id": "sensory", "name": "Sensory runtime", "source": "observer-runtime", "status": "OBSERVED" }]
  }],
  "expansion": { "status": "VERIFIED", "entries": 7, "digestMatches": true, "lossless": true }
}
```

`POST /v1/ecosystem/body/expand` takes `{ "compression": <that block> }` and returns
the expanded records. A tampered digest returns `400` with `DIGEST_MISMATCH`; the
endpoint never re-derives a body it cannot verify.

## Body-layer projection (`body.layers.v1`)

Coordinates are a **declared projection** of each runtime layer, not inferred
truth. The uncompressed body keeps the raw layer statuses; the compressed cell
keeps them verbatim.

| Layer | layer | organ | form | evidence |
| --- | --- | --- | --- | --- |
| sensory | reality | sense | runtime | SUPPORTED |
| verification | evidence | verify | runtime | receipt status |
| memory | evidence | remember | runtime | ledger integrity |
| mesh | system | verify | runtime | quorum reached |
| kernel | authority | express | contract | SUPPORTED |
| governance | authority | verify | boundary | SUPPORTED |
| interface | system | express | runtime | SUPPORTED |

## Verification

`tests/integration/one-body-ecosystem.integration.test.ts` covers both levels:

- module contract — round trip, multi-record cells and order, capacity refusal,
  invalid coordinates/ids, digest tampering;
- running API — the compressed body, its expansion endpoint, and digest refusal.

## Boundary

The 4×4×4×4 body does not prove deployment, external service availability, or any
real-world outcome. `UNKNOWN` stays `UNKNOWN`, `DIVERGENT` stays `DIVERGENT`, and
a digest is evidence about stored bytes, not authority to act.
