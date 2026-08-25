export type PersistenceAcknowledgement = {
  operatorId: string;
  reason: string;
  action:
    'review-partial-recovery' | 'review-key-rotation' | 'review-partial-recovery-and-key-rotation';
  acknowledgedAt: string;
  requestId: string;
};
export type ReencryptionRecovery = {
  status: 'none' | 'recovered' | 'blocked';
  reason: string | null;
};
export type PersistenceReencryption = {
  operatorId: string;
  reason: string;
  action: 'review-key-rotation';
  reencryptedAt: string;
  requestId: string;
  snapshotRecords: number;
  eventRecords: number;
  snapshotKeySource: 'none' | 'current' | 'previous' | 'mixed';
  eventLogKeySource: 'none' | 'current' | 'previous' | 'mixed';
};

export type Health = {
  data: {
    status: 'ok';
    readiness: 'ready' | 'degraded';
    checks: {
      observer: 'ready';
      verifier: 'ready';
      attester: 'ready';
      memory: { status: 'ready' | 'degraded'; integrity: boolean; encryption: string };
      persistence: {
        mode: 'file' | 'memory';
        operatorAction:
          | 'none'
          | 'review-partial-recovery'
          | 'review-key-rotation'
          | 'review-partial-recovery-and-key-rotation';
        keySource: 'none' | 'current' | 'previous' | 'mixed';
        currentKeyFingerprint: string | null;
        previousKeyFingerprint: string | null;
        previousKeyConfigured: boolean;
        eventLogSource: 'disabled' | 'missing' | 'restored' | 'partial';
        eventLogReason: string | null;
        eventLogKeySource: 'none' | 'current' | 'previous' | 'mixed';
        rotationPending: boolean;
        skippedLogEntries: number;
        acknowledgement: PersistenceAcknowledgement | null;
        reencrypt: PersistenceReencryption | null;
        reencryptionRecovery: ReencryptionRecovery;
        recoveryPolicy: { mode: string; reference: string | null; reason: string | null };
        deletionPolicy: { mode: string; reason: string | null; verified: false };
        custodyPolicy: {
          mode: string;
          reference: string | null;
          reason: string | null;
          verified: false;
        };
        coordinationPolicy: {
          mode: string;
          reference: string | null;
          reason: string | null;
          evidence: 'runtime-observed';
          scope: 'single-process';
          limitations: string[];
          verified: false;
        };
        coverage: {
          complete: false;
          surfaces: Array<{
            name: string;
            encryption: string;
            keySource: string;
            evidence: string;
          }>;
          unverifiedSurfaces: string[];
          unverifiedReasons: string[];
        };
      };
    };
    policy: {
      attestationAlgorithm: string;
      attestationTtlMs: number | null;
      authMode: 'local' | 'required';
      readAuthConfigured: boolean;
      adminAuthConfigured: boolean;
      adminOperatorAllowlistRequired: boolean;
      revocationEnabled: boolean;
    };
  };
  timestamp: string;
};

export type RuntimeState = {
  data: {
    status: 'active';
    readiness: 'ready' | 'degraded';
    authMode: 'local' | 'required';
    persistence: 'file' | 'memory';
    persistenceCurrentKeyFingerprint: string | null;
    persistencePreviousKeyFingerprint: string | null;
    eventLogSource: 'disabled' | 'missing' | 'restored' | 'partial';
    eventLogReason: string | null;
    eventLogKeySource: 'none' | 'current' | 'previous' | 'mixed';
    persistenceRotationPending: boolean;
    operatorAction:
      | 'none'
      | 'review-partial-recovery'
      | 'review-key-rotation'
      | 'review-partial-recovery-and-key-rotation';
    skippedLogEntries: number;
    persistenceAcknowledgement: PersistenceAcknowledgement | null;
    persistenceReencryption: PersistenceReencryption | null;
    reencryptionRecovery: ReencryptionRecovery;
    recoveryPolicy: { mode: string; reference: string | null; reason: string | null };
    deletionPolicy: { mode: string; reason: string | null; verified: false };
    custodyPolicy: {
      mode: string;
      reference: string | null;
      reason: string | null;
      verified: false;
    };
    coordinationPolicy: {
      mode: string;
      reference: string | null;
      reason: string | null;
      evidence: 'runtime-observed';
      scope: 'single-process';
      limitations: string[];
      verified: false;
    };
    coverage: {
      complete: false;
      surfaces: Array<{ name: string; encryption: string; keySource: string; evidence: string }>;
      unverifiedSurfaces: string[];
      unverifiedReasons: string[];
    };
    trustBasis: { serviceReadiness: 0 | 1 };
  };
  timestamp: string;
};

export type Observability = {
  data: {
    runtime: {
      mode: string;
      persistence: string;
      services: string[];
      lastActivity: string | null;
      eventLogSource: 'disabled' | 'missing' | 'restored' | 'partial';
      skippedLogEntries: number;
      eventLogReason: string | null;
      eventLogEncryptionKeySource: 'none' | 'current' | 'previous' | 'mixed';
      persistenceCurrentKeyFingerprint: string | null;
      persistencePreviousKeyFingerprint: string | null;
      persistenceRotationPending: boolean;
      operatorAction:
        | 'none'
        | 'review-partial-recovery'
        | 'review-key-rotation'
        | 'review-partial-recovery-and-key-rotation';
      persistenceAcknowledgement: PersistenceAcknowledgement | null;
      persistenceReencryption: PersistenceReencryption | null;
      reencryptionRecovery: ReencryptionRecovery;
      recoveryPolicy: { mode: string; reference: string | null; reason: string | null };
      deletionPolicy: { mode: string; reason: string | null; verified: false };
      custodyPolicy: {
        mode: string;
        reference: string | null;
        reason: string | null;
        verified: false;
      };
      coverage: {
        complete: false;
        surfaces: Array<{ name: string; encryption: string; keySource: string; evidence: string }>;
        unverifiedSurfaces: string[];
        unverifiedReasons: string[];
      };
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

export type AttestationPolicy = {
  attestationAlgorithm: string;
  attestationTtlMs: number | null;
  authMode: 'local' | 'required';
  readAuthConfigured: boolean;
  adminAuthConfigured: boolean;
  adminOperatorAllowlistConfigured: boolean;
  adminOperatorAllowlistRequired: boolean;
  revocationEnabled: boolean;
  revocationIntegrity: 'disabled' | 'legacy' | 'intact' | 'mismatch';
  revocationRevision: number;
  persistenceEncryption: string;
  persistenceEncryptionKeySource: 'none' | 'current' | 'previous' | 'mixed';
  persistencePreviousKeyConfigured: boolean;
  memoryEncryption: string;
};

export type AttestationVerification = {
  valid: boolean;
  revoked: boolean;
  expired: boolean;
  revocationIntegrity: 'disabled' | 'legacy' | 'intact' | 'mismatch';
  revocationRevision: number;
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

export type AuditQuery = {
  type?: string;
  stage?: string;
  status?: 'active' | 'passed' | 'failed';
  from?: string;
  to?: string;
  limit?: number;
};

export type AuditEvent = RuntimeEvent;

export type SceneSimulation = {
  id: string;
  seed: string;
  equation: string;
  states: string[];
  terminalState: string;
  trace: Array<{
    sequence: number;
    state: string;
    status: 'observed' | 'verified';
    evidence: string;
  }>;
  branches: Array<{
    id: string;
    index: number;
    perspective: string;
    states: string[];
    terminalState: string;
    trace: Array<{
      sequence: number;
      state: string;
      status: 'observed' | 'verified';
      evidence: string;
    }>;
    divergenceEvidence: string;
  }>;
  branchCount: number;
  continuation: 'bounded-sample-of-infinite-potential';
  provenance: {
    source: 'local-simulation';
    ruleVersion: 'scene-equation.v2';
    deterministic: true;
    verified: false;
    note: string;
  };
  createdAt: string;
};

export type AuditEventsResponse = {
  data: AuditEvent[];
  meta: {
    bounded: true;
    limit: number;
    total: number;
    source: string;
    skipped: number;
    keySource: 'none' | 'current' | 'previous' | 'mixed';
    filters: {
      type: string | null;
      stage: string | null;
      status: string | null;
      from: string | null;
      to: string | null;
    };
  };
  timestamp: string;
};

export type LocalJobState = 'queued' | 'running' | 'succeeded' | 'failed' | 'unknown';
export type LocalJobEventType = 'created' | 'started' | 'completed' | 'failed' | 'unknown';
export type LocalJobProvenance = {
  source: 'local' | 'api' | 'unknown';
  actor: string | null;
  requestId: string | null;
  correlationId: string | null;
  observedAt: string;
  schemaVersion: '1';
};
export type LocalJob = {
  id: string;
  kind: 'synthetic-observe';
  state: LocalJobState;
  idempotencyKey: string;
  payloadDigest: string;
  sourceUri: string;
  actor: string;
  workerId: string | null;
  attempt: number;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
  resultSummary: string | null;
  errorClass: string | null;
  provenance: LocalJobProvenance;
};
export type LocalJobEvent = {
  id: string;
  jobId: string;
  type: LocalJobEventType;
  sequence: number;
  at: string;
  provenance: LocalJobProvenance;
  details: { state: LocalJobState; message: string };
};
export type LocalJobLedgerStatus = {
  enabled: boolean;
  durable: boolean;
  source: 'memory' | 'file';
  encryption: 'disabled' | 'aes-256-gcm';
  counts: Record<LocalJobState, number>;
  recentWindow: number;
};
export type LocalJobsResponse = {
  data: { jobs: LocalJob[]; status: LocalJobLedgerStatus };
  timestamp: string;
};
export type LocalJobResponse = {
  data: { job: LocalJob; events: LocalJobEvent[]; status: LocalJobLedgerStatus };
  timestamp: string;
};
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class OmegaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly endpoint: string,
    readonly code?: string,
    readonly timestamp?: string
  ) {
    super(message);
    this.name = 'OmegaApiError';
  }
}

export class OmegaClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;
  private readonly readToken?: string;
  private readonly adminToken?: string;
  private readonly localJobToken?: string;

  constructor(
    baseUrl = 'http://localhost:3000',
    fetchImpl: FetchLike = globalThis.fetch,
    options: { readToken?: string; adminToken?: string; localJobToken?: string } = {}
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.fetchImpl = fetchImpl;
    this.readToken = options.readToken;
    this.adminToken = options.adminToken;
    this.localJobToken = options.localJobToken;
  }

  async getHealth(): Promise<Health> {
    return this.get<Health>('/health');
  }

  async simulateScene(
    input: { seed?: string; steps?: number; branches?: number } = {}
  ): Promise<{ data: SceneSimulation; timestamp: string }> {
    return this.post<{ data: SceneSimulation; timestamp: string }>(
      '/scene/simulate',
      input,
      this.readToken
    );
  }

  async getState(): Promise<RuntimeState> {
    return this.get<RuntimeState>('/state');
  }

  async getObservability(): Promise<Observability> {
    return this.get<Observability>('/observability');
  }

  async getEvents(): Promise<{ data: RuntimeEvent[] }> {
    return this.get<{ data: RuntimeEvent[] }>('/events');
  }

  async getAuditEvents(query: AuditQuery = {}): Promise<AuditEventsResponse> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) params.set(key, String(value));
    }
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return this.get<AuditEventsResponse>(`/audit/events${suffix}`);
  }

  async getRuns(): Promise<{ data: RuntimeRun[] }> {
    return this.get<{ data: RuntimeRun[] }>('/runs');
  }

  async getAttestationPolicy(): Promise<{ data: AttestationPolicy; timestamp: string }> {
    return this.get<{ data: AttestationPolicy; timestamp: string }>('/attest/policy');
  }

  async getJobs(query: { limit?: number; state?: LocalJobState } = {}): Promise<LocalJobsResponse> {
    const params = new URLSearchParams();
    if (query.limit !== undefined) params.set('limit', String(query.limit));
    if (query.state !== undefined) params.set('state', query.state);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return this.get<LocalJobsResponse>(`/jobs${suffix}`, this.localJobHeaders());
  }

  async getJob(jobId: string): Promise<LocalJobResponse> {
    if (!jobId.trim()) {
      throw new OmegaApiError('jobId is required', 400, `${this.baseUrl}/jobs`, 'JOB_INVALID');
    }
    return this.get<LocalJobResponse>(`/jobs/${encodeURIComponent(jobId)}`, this.localJobHeaders());
  }

  async getRevocations(): Promise<{
    data: AttestationRevocation[];
    meta?: {
      integrity: 'disabled' | 'legacy' | 'intact' | 'mismatch';
      digest: string;
      revision: number;
    };
    timestamp: string;
  }> {
    return this.get<{
      data: AttestationRevocation[];
      meta?: {
        integrity: 'disabled' | 'legacy' | 'intact' | 'mismatch';
        digest: string;
        revision: number;
      };
      timestamp: string;
    }>('/attest/revocations');
  }

  async verifyAttestation(
    attestation: unknown
  ): Promise<{ data: AttestationVerification; timestamp: string }> {
    return this.post<{ data: AttestationVerification; timestamp: string }>(
      '/attest/verify',
      { attestation },
      this.readToken
    );
  }

  async revokeAttestation(
    attestationId: string,
    reason: string,
    revokedBy = 'sdk-client',
    operatorId?: string
  ): Promise<{
    data: AttestationRevocation;
    meta?: { revision: number; integrity: 'disabled' | 'legacy' | 'intact' | 'mismatch' };
    timestamp: string;
  }> {
    return this.post<{
      data: AttestationRevocation;
      meta?: { revision: number; integrity: 'disabled' | 'legacy' | 'intact' | 'mismatch' };
      timestamp: string;
    }>(
      '/attest/revoke',
      { attestationId, reason, revokedBy },
      this.adminToken,
      operatorId ? { 'x-omega-operator-id': operatorId } : undefined
    );
  }

  async acknowledgePersistenceReview(
    reason: string,
    operatorId?: string
  ): Promise<{
    data: { acknowledgement: PersistenceAcknowledgement; eventId: string };
    timestamp: string;
  }> {
    return this.post<{
      data: { acknowledgement: PersistenceAcknowledgement; eventId: string };
      timestamp: string;
    }>(
      '/persistence/acknowledge',
      { reason, operatorId },
      this.adminToken,
      operatorId ? { 'x-omega-operator-id': operatorId } : undefined
    );
  }

  async reencryptPersistence(
    reason: string,
    operatorId?: string
  ): Promise<{
    data: { reencrypted: PersistenceReencryption; eventId: string };
    timestamp: string;
  }> {
    return this.post<{
      data: { reencrypted: PersistenceReencryption; eventId: string };
      timestamp: string;
    }>(
      '/persistence/reencrypt',
      { reason, operatorId },
      this.adminToken,
      operatorId ? { 'x-omega-operator-id': operatorId } : undefined
    );
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

  private async post<T>(
    path: string,
    payload: unknown,
    bearerToken = this.adminToken,
    extraHeaders?: Record<string, string>
  ): Promise<T> {
    const endpoint = `${this.baseUrl}${path}`;
    let response: Response;
    try {
      response = await this.fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
          ...extraHeaders,
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      throw new OmegaApiError(error instanceof Error ? error.message : String(error), 0, endpoint);
    }

    const body = (await response.json()) as unknown;
    if (!response.ok) {
      const errorBody =
        body && typeof body === 'object'
          ? (body as { code?: string; error?: string; message?: string; timestamp?: string })
          : {};
      throw new OmegaApiError(
        errorBody.message || errorBody.error || `Request failed with status ${response.status}`,
        response.status,
        endpoint,
        errorBody.code,
        errorBody.timestamp
      );
    }
    return body as T;
  }

  private localJobHeaders(): Record<string, string> | undefined {
    return this.localJobToken ? { 'x-omega-local-job-token': this.localJobToken } : undefined;
  }

  private async get<T>(path: string, extraHeaders?: Record<string, string>): Promise<T> {
    const endpoint = `${this.baseUrl}${path}`;
    let response: Response;
    try {
      response = await this.fetchImpl(endpoint, {
        headers:
          this.readToken || extraHeaders
            ? {
                ...(this.readToken ? { Authorization: `Bearer ${this.readToken}` } : {}),
                ...extraHeaders,
              }
            : undefined,
      });
    } catch (error) {
      throw new OmegaApiError(error instanceof Error ? error.message : String(error), 0, endpoint);
    }

    const body = (await response.json()) as unknown;
    if (!response.ok) {
      const errorBody =
        body && typeof body === 'object'
          ? (body as { code?: string; error?: string; message?: string; timestamp?: string })
          : {};
      const detail = errorBody.message || errorBody.error;
      throw new OmegaApiError(
        detail || `Request failed with status ${response.status}`,
        response.status,
        endpoint,
        errorBody.code,
        errorBody.timestamp
      );
    }
    return body as T;
  }
}
