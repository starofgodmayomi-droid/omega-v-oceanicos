export const ECOSYSTEM_BODY_EVIDENCE_BOUNDARY = {
  evidenceMode: 'LOCAL_SYNTHETIC_SIMULATION',
  scope: 'local-api-runtime',
  statusSemantics:
    'VERIFIED applies only when generated telemetry satisfies local verification rules, the configured local ledger passes integrity checks, and the in-process mesh simulation reaches quorum.',
  externalRealityStatus: 'UNKNOWN',
  limitations: [
    'telemetry is generated locally and is not an external sensor reading',
    'regional mesh votes and quorum are simulated in process',
    'deployment, external services, community, economy, and user outcomes are not observed',
  ],
} as const;
