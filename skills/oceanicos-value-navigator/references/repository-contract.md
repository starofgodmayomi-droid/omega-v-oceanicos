# Value Navigator repository contract v1

## Record semantics

`OmegaChangeRecord` is the common lineage envelope. Every navigator record has `decision: REVIEW`, `authorized: false`, null authority, a bounded policy label, provenance, and a stable source record. Proposal fields supplied by clients are assertions; their presence does not make them verified evidence.

Each JSONL entry includes sequence, prior hash, entry hash, proposal ID, phase, record, expected outcome, evidence status, reconciliation status, and `verificationScope: hypothesis-reconciliation-only`. Observations are appended as new records; a later observation points to the record it supersedes. A corrupt journal fails closed for API reads and writes.

## Request shapes

Proposal fields: `subject`, `intent`, `stateBefore`, `expectedOutcome`, and optionally `beneficiary`, `evidence` (up to 20 text references), `valuePotentialScore` (0–100), `valuePotentialBasis`, and `attributedTo`.

Observation fields: optional `observedOutcome`, `source`, `evidence`, and `error`. `VERIFIED` or `DIVERGENT` requires outcome, source, and evidence with no error. Any missing component or failed observation yields `UNKNOWN`.

## Safety invariants

- No client-supplied decision, authorization, or status fields.
- No route-side network or shell observation. A caller-provided observation is labeled `STATED`.
- `VERIFIED` is limited to normalized expected/outcome string comparison; it is not an earning, execution, or world-truth claim.
- No edit or delete route. Record history remains append-only.
- Value potential is an explicitly labeled hypothesis and never becomes a demand/revenue field.
- Writes use the API's existing admin authorization boundary in required-auth mode.
- The journal is local and tamper-evident only; no cryptographic attestation, external custody, distributed durability, or backup claim is made.

## Routes

- `GET /v1/value-navigator/proposals`
- `GET /v1/value-navigator/proposals/{proposalId}`
- `POST /v1/value-navigator/proposals`
- `POST /v1/value-navigator/proposals/{proposalId}/observe`

Storage defaults to `{dbPath}.value-navigator.jsonl`; `OMEGA_VALUE_NAVIGATOR_PATH` or `CreateAppOptions.valueNavigatorPath` can select an explicit local path.
