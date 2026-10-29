/**
 * OMEGA — the judge: response integrity, and the hash a claim can point at.
 *
 * A hash proves a response is unchanged, not that it is true. Integrity
 * therefore fails closed: an empty or oversized response yields no hash, and
 * the caller records UNKNOWN rather than inventing a verdict.
 */
import { createHash } from 'node:crypto';

export const MAX_EVIDENCE_LENGTH = 200_000;

export type IntegrityVerdict = { valid: boolean; reason?: string };

export function hashEvidence(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export function verifyResponseIntegrity(text: string): IntegrityVerdict {
  if (text.length === 0) return { valid: false, reason: 'EMPTY_RESPONSE' };
  if (text.length > MAX_EVIDENCE_LENGTH) return { valid: false, reason: 'RESPONSE_TOO_LONG' };
  return { valid: true };
}
