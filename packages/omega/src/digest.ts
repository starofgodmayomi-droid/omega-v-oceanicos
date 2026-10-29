import { createHash } from 'node:crypto';

/** SHA-256 over the evidence text. One digest rule for every organ. */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
