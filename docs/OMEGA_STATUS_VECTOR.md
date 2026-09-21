# Ω lifecycle status vector

The repository exposes an independent status vector on every `runOmegaChangePipeline` result. It prevents a local execution result from being reported as deployment or health and preserves `UNKNOWN` whenever the repository has not observed the relevant external fact.

| Field | Meaning | Positive evidence in the local pipeline |
| --- | --- | --- |
| `declared` | An intent/change was supplied | A compiled pipeline input exists |
| `represented` | The intent has a valid ΩIR representation | Compilation and validation completed |
| `implemented` | The local pipeline has an implementation path | Validation succeeded and the pipeline can continue |
| `tested` | The repository's test contract covers the path | The status is a local contract signal, not a production claim |
| `admitted` | Authority and policy gates allowed execution | Admission returned `ALLOW` |
| `executed` | A bounded transition actually ran | The executor returned `EXECUTED` |
| `observed` | A post-execution observation was attempted | The observer returned a result, including `UNKNOWN` when it failed |
| `verified` | Observed state matched expected state | Reality reconciliation returned `VERIFIED`; `DIVERGENT` is `NO` |
| `attested` | The execution produced an attestation identifier | The execution receipt carries an attestation ID |
| `deployed` | A deployment target was observed | Not established by the local MINI pipeline; remains `UNKNOWN` |
| `healthy` | A deployed target was observed healthy | Not established by the local MINI pipeline; remains `UNKNOWN` |

`YES`, `NO`, and `UNKNOWN` are intentionally independent. In particular, `ATTESTED` does not imply `VERIFIED`, `EXECUTED` does not imply `OBSERVED`, and local `VERIFIED` does not imply `DEPLOYED` or `HEALTHY`.

The executable proof is in `tests/integration/omega_pipeline.e2e.test.ts`, which covers verified, divergent, unavailable-observer, denied-admission, and missing-worker outcomes.

This is a local contract and observability surface. It does not establish external authorization, deployment, distributed availability, or production health.

## Verification command

```sh
pnpm verify:full
```

The command proves the repository's local build, integration, and compiled runtime contract only.

