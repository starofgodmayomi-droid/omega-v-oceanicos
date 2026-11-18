/*
 * The single door from the Lucid Skin to the Fastify chat API.
 * The default /api prefix is handled by the Vite proxy; VITE_API_URL can point
 * directly at the API origin.
 */

export type Verdict = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

export type IntentReceipt = {
  status: Verdict;
  verified: boolean;
  output: string | null;
  hash: string | null;
  reason: string | null;
};

/** The chat endpoint suffix, served under /api by default or an API origin override. */
export const EXECUTE_PATH = '/chat';

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');
const OFFLINE = 'Local Brain Offline';
const SHA256_HEX = /^[0-9a-f]{64}$/i;

function offlineReceipt(reason: string): IntentReceipt {
  return { status: 'UNKNOWN', verified: false, output: null, hash: null, reason: `${OFFLINE} · ${reason}` };
}

function isVerdict(value: unknown): value is Verdict {
  return value === 'VERIFIED' || value === 'DIVERGENT' || value === 'UNKNOWN' || value === 'NOT_EXECUTED';
}

function failureReceipt(payload: any, httpStatus: number): IntentReceipt {
  const reported = isVerdict(payload?.status) ? payload.status : 'UNKNOWN';
  // A non-2xx response cannot certify a successful outcome, even if its body
  // claims VERIFIED. Preserve the repository's explicit failure states.
  const status: Verdict = httpStatus === 503 || reported === 'VERIFIED' ? 'UNKNOWN' : reported;
  const detail = typeof payload?.reason === 'string'
    ? payload.reason
    : typeof payload?.error === 'string'
      ? payload.error
      : Array.isArray(payload?.issues)
        ? payload.issues.filter((issue: unknown) => typeof issue === 'string').join('; ')
        : `HTTP ${httpStatus}`;
  const reason = httpStatus === 503
    ? `${OFFLINE} · HTTP 503${detail === 'HTTP 503' ? '' : ` · ${detail}`}`
    : detail === `HTTP ${httpStatus}` ? detail : `${detail} · HTTP ${httpStatus}`;
  return { status, verified: false, output: null, hash: null, reason };
}

export function executeUrl(): string {
  return `${API_BASE_URL}${EXECUTE_PATH}`;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function submitIntent(intent: string, signal?: AbortSignal, useExternalModel = false): Promise<IntentReceipt> {
  let response: Response;
  try {
    response = await fetch(executeUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(useExternalModel ? { intent, useExternalModel: true } : { intent }),
      signal,
    });
  } catch (err) {
    return offlineReceipt(err instanceof Error ? err.message : 'request failed');
  }

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    return offlineReceipt(`HTTP ${response.status} · unreadable response`);
  }
  if (!response.ok) return failureReceipt(payload, response.status);

  const raw = typeof payload?.status === 'string' ? payload.status : 'UNKNOWN';
  const status: Verdict = isVerdict(raw) ? raw : 'UNKNOWN';
  const output = typeof payload?.output === 'string'
    ? payload.output
    : typeof payload?.response === 'string'
      ? payload.response
      : null;
  const hash = typeof payload?.hash === 'string'
    ? payload.hash
    : typeof payload?.evidence_hash === 'string'
      ? payload.evidence_hash
      : null;

  if (status !== 'VERIFIED') {
    return {
      status,
      verified: false,
      output: null,
      hash: null,
      reason: typeof payload?.reason === 'string' ? payload.reason : null,
    };
  }

  if (!output) {
    return {
      status: 'UNKNOWN',
      verified: false,
      output: null,
      hash: null,
      reason: 'The VERIFIED API receipt did not include a response body.',
    };
  }
  if (!hash) {
    return {
      status: 'UNKNOWN',
      verified: false,
      output: null,
      hash: null,
      reason: 'The VERIFIED API receipt did not include a SHA-256 digest.',
    };
  }
  if (!SHA256_HEX.test(hash)) {
    return {
      status: 'DIVERGENT',
      verified: false,
      output: null,
      hash: null,
      reason: 'The API supplied a malformed SHA-256 digest.',
    };
  }

  let observedHash: string;
  try {
    observedHash = await sha256Hex(output);
  } catch {
    return {
      status: 'UNKNOWN',
      verified: false,
      output: null,
      hash: null,
      reason: 'SHA-256 verification is unavailable in this browser.',
    };
  }
  if (observedHash !== hash.toLowerCase()) {
    return {
      status: 'DIVERGENT',
      verified: false,
      output: null,
      hash: null,
      reason: 'The response body does not match the supplied SHA-256 digest.',
    };
  }

  return {
    status: 'VERIFIED',
    verified: true,
    output,
    hash: observedHash,
    reason: typeof payload?.reason === 'string' ? payload.reason : null,
  };
}
