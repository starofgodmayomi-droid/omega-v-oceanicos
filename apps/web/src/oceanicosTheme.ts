/*
 * Ω∞v frontier surface theme.
 *
 * Warmth on the surface, hard security underneath. These tokens move away
 * from the harsh terminal green (#00ff66) toward the oceanic brand palette
 * already named in tokens.css. The surface uses Manrope (human); technical
 * depths use DM Mono (instrument).
 */

export const theme = {
  // Ocean depths
  bg: '#06141a',
  bgGradient:
    'radial-gradient(ellipse 80% 50% at 50% -10%, #0e2a36 0%, #06141a 60%)',
  surface: '#0a1f28',
  surfaceRaised: '#0e2837',
  surfaceDeep: '#051016',

  // Borders
  border: 'rgba(105, 231, 185, 0.13)',
  borderBright: 'rgba(105, 231, 185, 0.28)',
  borderSubtle: 'rgba(27, 59, 53, 0.22)',

  // Text
  text: '#ebfaf4',
  textMuted: '#8ba8a0',
  textDim: '#547b74',

  // Accents
  accent: '#69e7b9',
  accentDim: '#609187',
  accentWarm: '#f0c674',

  // Status — meaning-carrying, never decorative
  verified: '#69e7b9',
  divergent: '#ed9986',
  unknown: '#547b74',
  warning: '#f0c674',

  // Fonts
  fontSans: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontMono: "'DM Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",

  // Radii
  radius: '16px',
  radiusSmall: '10px',
  radiusPill: '999px',
};

export function statusColor(status: string): string {
  const s = (status || '').toUpperCase();
  if (['VERIFIED', 'PASS', 'CONVERGED_PASS', 'ATTESTED', 'YES', 'SUCCEEDED'].includes(s))
    return theme.verified;
  if (['DIVERGENT', 'DENIED', 'FAILED', 'NO', 'CONSENSUS_FAILED', 'REJECT'].includes(s))
    return theme.divergent;
  if (['REVIEW', 'AUTHORIZED', 'EXECUTED', 'PROPOSED', 'SUPPORTED', 'UNVERIFIED', 'CONVERGED_PLURAL'].includes(s))
    return theme.warning;
  return theme.unknown;
}

export function humanStatus(status: string): string {
  const s = (status || '').toUpperCase();
  const map: Record<string, string> = {
    VERIFIED: 'Verified',
    DIVERGENT: 'Divergent',
    UNKNOWN: 'Unknown',
    PASS: 'Verified',
    CONVERGED_PASS: 'Converged',
    CONVERGED_PLURAL: 'Plural consensus',
    CONSENSUS_FAILED: 'Consensus failed',
    REVIEW: 'Awaiting your approval',
    AUTHORIZED: 'Authorized',
    EXECUTED: 'Executed',
    PROPOSED: 'Proposed',
    ATTESTED: 'Attested',
    DENIED: 'Denied',
    FAILED: 'Failed',
    SUPPORTED: 'Supported',
    UNVERIFIED: 'Unverified',
    YES: 'Yes',
    NO: 'No',
  };
  return map[s] ?? status;
}

/* ── Shared types ── */

export interface KeyPair {
  publicKey: string;
  privateKey: string;
  type: 'ED25519_SERVER' | 'WEBCRYPTO_ENCLAVE';
}

export interface RegionalNodeVote {
  nodeId: string;
  region: string;
  jurisdiction: string;
  verdict: 'PASS' | 'DIVERGENT' | 'REJECT';
  latencyMs: number;
  ruleApplied: string;
  signature: string;
  timestamp: string;
}

export interface MeshConvergenceReceipt {
  consensusRound: string;
  quorumReached: boolean;
  pluralismTriggered: boolean;
  participatingNodes: number;
  votes: RegionalNodeVote[];
  effectiveStatus: 'CONVERGED_PASS' | 'CONVERGED_PLURAL' | 'CONSENSUS_FAILED';
  clusterSignatureProof: string;
  timestamp: string;
}

export interface KernelCapabilitySnapshot {
  contract: string;
  execution: string;
  humanAuthorizationRequired: boolean;
  capabilities: {
    observe: boolean;
    verify: boolean;
    remember: boolean;
    attest: boolean;
    reason: boolean;
    intend: boolean;
    build: boolean;
    test: boolean;
    remoteMutation: boolean;
    credentialHandling: boolean;
    arbitraryShellExecution: boolean;
    externalDeployment: boolean;
  };
  limitations: string[];
}
