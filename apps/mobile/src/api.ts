export const DEFAULT_API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').trim().replace(/\/$/, '');

export interface ApiHealth {
  status: string;
  [key: string]: unknown;
}

export interface CommandSummary {
  commandId: string;
  intent: string;
  requestedBy: string;
  status: string;
  createdAt: string;
  workers?: string[];
  decision?: string | null;
  reality?: {
    observedState?: string;
    evidence?: string;
    observedAt?: string;
    classification?: string;
  } | null;
}

export interface OmegaEvent {
  type?: unknown;
  at?: unknown;
  status?: unknown;
  [key: string]: unknown;
}

export interface Provenance {
  commandId: string;
  intent: string;
  requestedBy: string;
  createdAt: string;
  status: string;
  workers: string[];
  events: OmegaEvent[];
  redacted: boolean;
}

export interface ProposalPayload {
  symbolicIntent: string;
  requestedBy: string;
  targetScope: string[];
  idempotencyKey: string;
  stopCondition: string;
  expectedObservation: string;
  mode: 'BUILD' | 'WORLDVIEW';
}

export interface ProposalResult {
  success: boolean;
  drop: { dropId: string; kind: string; intent: string; targetScope: string[]; evidenceBoundary: string };
  command?: { commandId: string; status: string; dryRun: boolean; workers: string[] };
  nextAction: string;
  executed: boolean;
}

export class ApiError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function normalizeApiBaseUrl(input: string): string {
  const candidate = input.trim().replace(/\/+$/, '');
  if (!candidate) throw new Error('Enter an API base URL.');
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('Use a complete API URL, such as https://api.example.org.');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('The API URL must use HTTP or HTTPS.');
  }
  if (parsed.username || parsed.password) throw new Error('Do not put credentials in the API URL.');
  if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('Enter the API origin only; remove path, query, and fragment.');
  }
  return `${parsed.protocol}//${parsed.host}`;
}

async function requestJson<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const base = normalizeApiBaseUrl(baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
    });
    const text = await response.text();
    let payload: any;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      throw new ApiError(`API returned invalid JSON (${response.status}).`, response.status);
    }
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new ApiError(`API rejected this request (${response.status}). Its authentication or authorization policy still applies; this app stores no API token.`, response.status);
      }
      throw new ApiError(typeof payload?.error === 'string' ? payload.error : `API request failed (${response.status}).`, response.status);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') throw new ApiError('API request timed out after 12 seconds.');
    if (error instanceof Error && /network request failed/i.test(error.message)) {
      throw new ApiError('Could not reach the API. Check the address, network, and server status.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function getHealth(baseUrl: string): Promise<ApiHealth> {
  return requestJson<ApiHealth>(baseUrl, '/health');
}

export async function getCommands(baseUrl: string): Promise<{ success: boolean; commands: CommandSummary[]; redacted: boolean }> {
  return requestJson(baseUrl, '/v1/omega/commands');
}

export async function getProvenance(baseUrl: string, commandId: string): Promise<{ success: boolean; provenance: Provenance }> {
  return requestJson(baseUrl, `/v1/omega/commands/${encodeURIComponent(commandId)}/provenance`);
}

export async function submitDrop(baseUrl: string, payload: ProposalPayload): Promise<ProposalResult> {
  return requestJson(baseUrl, '/v1/omega/oreade/proposal', { method: 'POST', body: JSON.stringify(payload) });
}
