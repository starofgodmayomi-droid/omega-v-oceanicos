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
  bg: '#020617',
  bgGradient:
    'radial-gradient(ellipse 90% 60% at 50% -15%, rgba(30, 64, 175, 0.34) 0%, rgba(49, 46, 129, 0.18) 38%, #020617 78%)',
  surface: 'rgba(15, 23, 42, 0.76)',
  surfaceRaised: '#0b1329',
  surfaceDeep: '#020617',

  // Borders
  border: 'rgba(6, 182, 212, 0.16)',
  borderBright: 'rgba(6, 182, 212, 0.36)',
  borderSubtle: 'rgba(99, 102, 241, 0.2)',

  // Text
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  textDim: '#64748b',

  // Accents
  accent: '#06b6d4',
  accentDim: '#0891b2',
  accentWarm: '#f59e0b',

  // Status — meaning-carrying, never decorative
  verified: '#06b6d4',
  divergent: '#ef4444',
  unknown: '#64748b',
  warning: '#f59e0b',

  // Fonts
  fontSans: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontMono: "'JetBrains Mono', 'DM Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace",

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
