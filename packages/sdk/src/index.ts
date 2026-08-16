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
export type RuntimeRun = Record<string, unknown>;
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

  constructor(baseUrl = 'http://localhost:3000', fetchImpl: FetchLike = globalThis.fetch) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.fetchImpl = fetchImpl;
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

  private async get<T>(path: string): Promise<T> {
    const endpoint = `${this.baseUrl}${path}`;
    let response: Response;
    try {
      response = await this.fetchImpl(endpoint);
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
