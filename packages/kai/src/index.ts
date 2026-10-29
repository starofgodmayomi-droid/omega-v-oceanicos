/**
 * KAI — the mind: the memory contract and the shield.
 *
 * The shield is a screening boundary, not a truth claim: a match stops
 * execution, a miss does not certify safety. The memory contract is the shape
 * every remembered outcome must take — including DIVERGENT and UNKNOWN, so an
 * absence of evidence is recorded as clearly as its presence.
 *
 * Storage lives with the caller (`apps/api/src/kai-memory.ts` owns the SQLite
 * tables and the database path); this package owns what KAI is allowed to say.
 */

export type KaiStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';
export type AuthorityLimit = 'READ_ONLY' | 'AUTONOMOUS';

export type KaiMemoryRecord = {
  id: string;
  timestamp: string;
  intent: string;
  evidenceHash: string | null;
  status: KaiStatus;
};

export type OmegaIRRecord = {
  id: string;
  scope: string;
  authorityLimit: AuthorityLimit;
  expectedOutcome: string;
};

export const OCEANICOS_CONSTITUTION =
  'You are KAI/ELION. You do not hallucinate. You do not fabricate success. ' +
  'You only return claims backed by evidence. If the evidence is missing, you return UNKNOWN. ' +
  'Pidgin fit carry the warmth; evidence go carry the claim.';

/**
 * Known scam patterns are a screening boundary, not a truth claim. A match
 * stops execution; a miss does not certify safety.
 */
export const SCAM_PATTERNS: readonly { id: string; pattern: RegExp }[] = [
  { id: 'SEED_PHRASE', pattern: /\b(seed|recovery|secret)\s+phrase\b/i },
  { id: 'PRIVATE_KEY', pattern: /\bprivate\s+key\b/i },
  { id: 'WALLET_PASSPHRASE', pattern: /\b(wallet|keystore)\s+(password|passphrase)\b/i },
  { id: 'OTP_REQUEST', pattern: /\b(otp|one[- ]time\s+(code|password)|verification\s+code)\b/i },
  { id: 'BANK_CREDENTIALS', pattern: /\b(bvn|nin|card\s+number|cvv|pin|bank\s+details|account\s+number)\b/i },
  { id: 'ADVANCE_FEE', pattern: /\b(advance\s+fee|processing\s+fee|small\s+fee\s+to\s+release|pay\s+.*\s+to\s+release)\b/i },
  { id: 'GUARANTEED_RETURNS', pattern: /\b(guaranteed\s+(profit|returns?|roi)|risk[- ]free\s+(profit|investment))\b/i },
  { id: 'DOUBLE_MONEY', pattern: /\b(double|flip|multiply)\s+(your\s+)?(money|investment|crypto)\b/i },
  { id: 'GIVEAWAY_CLAIM', pattern: /\b(you\s+have\s+won|claim\s+your\s+(prize|reward|airdrop)|free\s+crypto\s+giveaway)\b/i },
  { id: 'REMOTE_ACCESS', pattern: /\b(install\s+(anydesk|teamviewer)|grant\s+remote\s+access)\b/i },
  { id: 'MULE_ACCOUNT', pattern: /\b(mule\s+account|use\s+your\s+(bank\s+)?account\s+to\s+receive\s+funds)\b/i },
  { id: 'URGENT_TRANSFER', pattern: /\b(urgent|emergency)\s+(transfer|payment)\b/i },
];

export function screenIntent(intent: string): { safe: boolean; matches: string[] } {
  const matches = SCAM_PATTERNS.filter((candidate) => candidate.pattern.test(intent)).map(
    (candidate) => candidate.id
  );
  return { safe: matches.length === 0, matches };
}
