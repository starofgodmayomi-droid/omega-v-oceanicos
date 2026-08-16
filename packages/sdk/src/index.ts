export type Observability = {
  data: {
    runtime: {
      mode: string;
      persistence: string;
      services: string[];
      lastActivity: string | null;
    };
    provenance: {
      recentEvents: number;
      durableEvents: number;
      skippedLogEntries: number;
      completedRuns: number;
      lastRequestId: string | null;
      lastCorrelationId: string | null;
    };
    trust: {
      verificationCoverage: number | null;
      attestationValidity: boolean | null;
    };
    memory: {
      entries: number;
      intact: boolean;
      appendOnly: boolean;
    };
  };
  timestamp: string;
};

export type RuntimeEvent = Record<string, unknown>;
export type RuntimeRun = {
  observation: { id: string; claim?: { statement?: string } };
  verification: { id: string; summary: { passed: boolean; confidence?: number } };
  attestation: { id: string; verified: boolean; attestedAt?: string; revoked?: boolean };
};

export type AttestationRevocation = {
  id: string;
  attestationId: string;
  reason: string;
  revokedBy: string;
  revokedAt: string;
};

export type EvidenceExport = {
  observability: Observability;
  events: RuntimeEvent[];
  runs: RuntimeRun[];
};
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class OmegaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly endpoint: string
  ) {
    super(message);
    this.name = 'OmegaApiError';
  }
}

export class OmegaClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;
  private readonly readToken?: string;

  constructor(
    baseUrl = 'http://localhost:3000',
    fetchImpl: FetchLike = globalThis.fetch,
    options: { readToken?: string } = {}
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.fetchImpl = fetchImpl;
    this.readToken = options.readToken;
  }

  async getObservability(): Promise<Observability> {
    return this.get<Observability>('/observability');
  }

  async getEvents(): Promise<{ data: RuntimeEvent[] }> {
    return this.get<{ data: RuntimeEvent[] }>('/events');
  }

  async getRuns(): Promise<{ data: RuntimeRun[] }> {
    return this.get<{ data: RuntimeRun[] }>('/runs');
  }

  async getRevocations(): Promise<{ data: AttestationRevocation[]; timestamp: string }> {
    return this.get<{ data: AttestationRevocation[]; timestamp: string }>('/attest/revocations');
  }

  async revokeAttestation(
    attestationId: string,
    reason: string,
    revokedBy = 'sdk-client'
  ): Promise<{ data: AttestationRevocation; timestamp: string }> {
    return this.post<{ data: AttestationRevocation; timestamp: string }>('/attest/revoke', {
      attestationId,
      reason,
      revokedBy,
    });
  }

  async getEvidenceExport(): Promise<{
    data: EvidenceExport;
    meta: { bounded: boolean; eventWindow: number; runWindow: number };
    timestamp: string;
  }> {
    return this.get<{
      data: EvidenceExport;
      meta: { bounded: boolean; eventWindow: number; runWindow: number };
      timestamp: string;
    }>('/evidence/export');
  }

  private async post<T>(path: string, payload: unknown): Promise<T> {
    const endpoint = `${this.baseUrl}${path}`;
    let response: Response;
    try {
      response = await this.fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(this.readToken ? { Authorization: `Bearer ${this.readToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      throw new OmegaApiError(error instanceof Error ? error.message : String(error), 0, endpoint);
    }

    const body = (await response.json()) as unknown;
    if (!response.ok) {
      const errorBody =
        body && typeof body === 'object' ? (body as { error?: string; message?: string }) : {};
      throw new OmegaApiError(
        errorBody.message || errorBody.error || `Request failed with status ${response.status}`,
        response.status,
        endpoint
      );
    }
    return body as T;
  }

  private async get<T>(path: string): Promise<T> {
    const endpoint = `${this.baseUrl}${path}`;
    let response: Response;
    try {
      response = await this.fetchImpl(endpoint, {
        headers: this.readToken ? { Authorization: `Bearer ${this.readToken}` } : undefined,
      });
    } catch (error) {
      throw new OmegaApiError(error instanceof Error ? error.message : String(error), 0, endpoint);
    }

    const body = (await response.json()) as unknown;
    if (!response.ok) {
      const errorBody =
        body && typeof body === 'object' ? (body as { error?: string; message?: string }) : {};
      const detail = errorBody.message || errorBody.error;
      throw new OmegaApiError(
        detail || `Request failed with status ${response.status}`,
        response.status,
        endpoint
      );
    }
    return body as T;
  }
}
