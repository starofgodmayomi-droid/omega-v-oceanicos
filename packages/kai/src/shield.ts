/**
 * KAI Shield — deterministic scam-intent screening.
 *
 * The shield screens intent text against declared patterns. A CLEAR result is
 * not consent, authority, or evidence: it only means no declared pattern
 * matched. Missing intent fails closed, and UNKNOWN is preserved.
 */

export type ShieldCategory =
  | 'SECRET_EXFILTRATION'
  | 'PAYMENT_PRESSURE'
  | 'AUTHORITY_BYPASS'
  | 'GUARANTEED_RETURN';

export type ShieldStatus = 'CLEAR' | 'BLOCKED' | 'UNKNOWN';

export interface ShieldFinding {
  readonly category: ShieldCategory;
  readonly matched: string;
}

export interface ShieldDecision {
  readonly status: ShieldStatus;
  readonly allowed: boolean;
  readonly findings: readonly ShieldFinding[];
  readonly unknowns: readonly string[];
  readonly authority: 'human';
  readonly reason: string;
}

const RULES: ReadonlyArray<{ readonly category: ShieldCategory; readonly pattern: RegExp }> = [
  {
    category: 'SECRET_EXFILTRATION',
    pattern:
      /\b(private\s+key|seed\s+phrase|mnemonic|recovery\s+phrase|secret\s+key|api\s+key|password)\b/i,
  },
  {
    category: 'PAYMENT_PRESSURE',
    pattern:
      /\b(send\s+(me\s+)?(money|crypto|btc|eth|usdt)|wire\s+transfer|gift\s+card|western\s+union|urgent\s+payment)\b/i,
  },
  {
    category: 'AUTHORITY_BYPASS',
    pattern:
      /\b(bypass|skip|disable|ignore)\s+(the\s+)?(verification|verifier|auth|authentication|approval|consent|authorization)\b/i,
  },
  {
    category: 'GUARANTEED_RETURN',
    pattern:
      /\b(guaranteed\s+(return|profit|income)|risk[-\s]?free\s+(profit|return)|double\s+your\s+(money|investment))\b/i,
  },
];

export const evaluateIntent = (intent: unknown): ShieldDecision => {
  const text = typeof intent === 'string' ? intent.trim() : '';
  if (text.length === 0) {
    return {
      status: 'UNKNOWN',
      allowed: false,
      findings: [],
      unknowns: ['INTENT_MISSING'],
      authority: 'human',
      reason: 'No intent text to screen; the shield fails closed.',
    };
  }

  const findings = RULES.flatMap(({ category, pattern }) => {
    const match = text.match(pattern);
    return match ? [{ category, matched: match[0] }] : [];
  });

  if (findings.length > 0) {
    return {
      status: 'BLOCKED',
      allowed: false,
      findings,
      unknowns: [],
      authority: 'human',
      reason: 'Intent matched a blocked category; human review is required before any execution.',
    };
  }

  return {
    status: 'CLEAR',
    allowed: true,
    findings: [],
    unknowns: [],
    authority: 'human',
    reason: 'No declared scam pattern matched. Clear is not consent, authority, or evidence.',
  };
};

export const shieldAllows = (intent: unknown): boolean => evaluateIntent(intent).allowed;
