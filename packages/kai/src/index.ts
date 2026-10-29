/*
 * KAI — the mind of the Ω∞v body: the shield and the authority derivation.
 *
 * Anything that cannot be observed locally is reported as UNKNOWN instead of
 * being asserted. Nothing here calls the network.
 */

export type AuthorityLevel = 'READ_ONLY' | 'AUTONOMOUS' | 'HUMAN_APPROVAL_REQUIRED';

export type ShieldPattern = { id: string; label: string; pattern: RegExp };

/** Scam / fraud patterns KAI Shield refuses before any execution begins. */
export const KAI_SHIELD_PATTERNS: readonly ShieldPattern[] = [
  { id: 'urgency', label: 'artificial urgency', pattern: /\burgent(ly)?\b/i },
  { id: 'act-now', label: 'artificial urgency', pattern: /\bact\s+now\b/i },
  {
    id: 'money-transfer',
    label: 'money transfer request',
    pattern:
      /\b(send|wire|transfer)\b[^.]{0,24}\b(money|funds|cash|naira|dollars?|usdt|bitcoin)\b/i,
  },
  { id: 'send-money', label: 'money transfer request', pattern: /\bsend\s+money\b/i },
  {
    id: 'guaranteed-returns',
    label: 'guaranteed returns',
    pattern: /\bguaranteed\s+(returns?|profit|income|roi|gain)\b/i,
  },
  {
    id: 'risk-free',
    label: 'risk-free profit',
    pattern: /\brisk[- ]free\s+(profit|returns?|investment|money)\b/i,
  },
  {
    id: 'doubling-scheme',
    label: 'doubling scheme',
    pattern: /\bdouble\s+(your\s+)?(money|investment|bitcoin|crypto|capital)\b/i,
  },
  { id: 'seed-phrase', label: 'seed phrase request', pattern: /\b(seed|recovery)\s+phrase\b/i },
  { id: 'private-key', label: 'private key request', pattern: /\bprivate\s+key\b/i },
  { id: 'otp', label: 'one-time password request', pattern: /\b(one[- ]time\s+password|otp)\b/i },
  { id: 'gift-card', label: 'gift card request', pattern: /\bgift\s+cards?\b/i },
  {
    id: 'bank-details',
    label: 'bank details request',
    pattern: /\bbank\s+(account\s+)?details\b/i,
  },
];

export type ShieldVerdict = {
  blocked: boolean;
  matchedPatternIds: string[];
  matchedLabels: string[];
};

/** Step 1 — KAI observes the intent and refuses known fraud patterns. */
export function scanIntent(intent: string): ShieldVerdict {
  const matchedPatternIds: string[] = [];
  const matchedLabels: string[] = [];
  for (const entry of KAI_SHIELD_PATTERNS) {
    if (entry.pattern.test(intent)) {
      matchedPatternIds.push(entry.id);
      if (!matchedLabels.includes(entry.label)) matchedLabels.push(entry.label);
    }
  }
  return { blocked: matchedPatternIds.length > 0, matchedPatternIds, matchedLabels };
}

/**
 * Phase 2 — the actions OMEGA cannot undo after the fact. Any intent that names
 * one of them pauses at the LUCID gate instead of executing.
 */
export const IRREVERSIBLE_ACTION_PATTERNS: readonly ShieldPattern[] = [
  {
    id: 'funds',
    label: 'movement of funds',
    pattern: /\b(pay|payment|send|transfer|wire|withdraw|invest|trade|buy|sell|spend|stake)\b/i,
  },
  {
    id: 'deletion',
    label: 'deletion',
    pattern: /\b(delete|drop|destroy|wipe|erase|purge)\b/i,
  },
  {
    id: 'deployment',
    label: 'irreversible deployment',
    pattern: /\b(deploy|publish|release|launch|migrate)\b/i,
  },
];

export type IrreversibleVerdict = { required: boolean; matchedLabels: string[] };

/** Phase 2 — does this intent need explicit human authorization? */
export function scanIrreversible(intent: string): IrreversibleVerdict {
  const matchedLabels: string[] = [];
  for (const entry of IRREVERSIBLE_ACTION_PATTERNS) {
    if (entry.pattern.test(intent) && !matchedLabels.includes(entry.label)) {
      matchedLabels.push(entry.label);
    }
  }
  return { required: matchedLabels.length > 0, matchedLabels };
}

/**
 * CAPABILITY != AUTHORITY. The endpoint can only answer; it never acts on the
 * world, so an autonomous claim is recorded as a bounded plan — and an
 * irreversible one is recorded as a request for authorization, not an action.
 */
export function deriveAuthorityLevel(requested: unknown, intent: string): AuthorityLevel {
  if (scanIrreversible(intent).required) return 'HUMAN_APPROVAL_REQUIRED';
  return requested === 'AUTONOMOUS' ? 'AUTONOMOUS' : 'READ_ONLY';
}
