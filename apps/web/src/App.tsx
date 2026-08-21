import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
// Aliased: App already has a verifyAttestation that asks the API. This one
// asks nobody, which is the distinction the panel exists to make visible.
import { verifyAttestation as verifyEnvelopeLocally, type VerificationOutcome } from './verify';
import './App.css';

type DissentingOpinion = {
  verifierId: string;
  verifierVersion: string;
  passed: boolean | null;
  confidence: number;
  reason: string;
};

type RuntimeDissensus = {
  id: string;
  verdict: 'AGREED' | 'SPLIT' | 'UNKNOWN';
  routing: 'AUTO' | 'HUMAN';
  confidence: number;
  reason: string;
  opinions: DissentingOpinion[];
  dissenting: DissentingOpinion[];
  timestamp: string;
};

type SceneSimulation = {
  states: string[];
  terminalState: string;
  provenance: { ruleVersion: string; deterministic: boolean; verified: boolean; note: string };
};

type RuntimeEvent = {
  id: string;
  type: string;
  stage: string;
  message: string;
  status: 'active' | 'passed' | 'failed';
  timestamp: string;
  correlationId?: string;
  requestId?: string;
  details?: Record<string, unknown>;
};
type LoopResult = {
  observation: { id: string; claim: { statement: string }; confidence: number };
  verification: {
    id: string;
    summary: { passed: boolean; rulesApplied: number; rulesPassed: number; confidence: number };
    evidencePath: Array<{ rule: string; passed: boolean; reasoning: string }>;
  };
  memory: { id: string; observationId: string; verificationId: string };
  attestation: {
    id: string;
    verified: boolean;
    signature: string;
    attestedAt: string;
    revoked?: boolean;
  };
};
type RuntimePolicy = {
  attestationAlgorithm: string;
  attestationTtlMs: number | null;
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
type RuntimeHealth = {
  status: 'ok';
  readiness: 'ready' | 'degraded';
  checks: {
    memory: { integrity: boolean };
    persistence?: {
      eventLogSource: 'disabled' | 'missing' | 'restored' | 'partial';
      eventLogReason: string | null;
      eventLogKeySource: 'none' | 'current' | 'previous' | 'mixed';
      currentKeyFingerprint: string | null;
      previousKeyFingerprint: string | null;
      rotationPending: boolean;
      operatorAction:
        | 'none'
        | 'review-partial-recovery'
        | 'review-key-rotation'
        | 'review-partial-recovery-and-key-rotation';
      acknowledgement: {
        operatorId: string;
        reason: string;
        action: string;
        acknowledgedAt: string;
        requestId: string;
      } | null;
      reencrypt: {
        operatorId: string;
        reason: string;
        action: string;
        reencryptedAt: string;
        requestId: string;
        snapshotRecords: number;
        eventRecords: number;
        snapshotKeySource: string;
        eventLogKeySource: string;
      } | null;
      reencryptionRecovery: {
        status: 'none' | 'recovered' | 'blocked';
        reason: string | null;
      };
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
        verified: false;
      };
      coverage: {
        complete: false;
        surfaces: Array<{ name: string; encryption: string; keySource: string; evidence: string }>;
        unverifiedSurfaces: string[];
      };
      skippedLogEntries: number;
    };
  };
};
type RevocationIntegrity = 'disabled' | 'legacy' | 'intact' | 'mismatch';
type RuntimeRevocation = {
  id: string;
  attestationId: string;
  reason: string;
  revokedBy: string;
  revokedAt: string;
};
type PublicTrustMetadata = {
  algorithm: string;
  keyId: string;
  fingerprint: string;
  keyVersion: string;
  publicKey: string;
};
type LocalJobState = 'queued' | 'running' | 'succeeded' | 'failed' | 'unknown';
type LocalJobsView = {
  status: 'loading' | 'disabled' | 'unauthorized' | 'available' | 'error';
  jobs: Array<{
    id: string;
    state: LocalJobState;
    attempt: number;
    workerId: string | null;
    createdAt: string;
    updatedAt: string;
    finishedAt: string | null;
    errorClass: string | null;
    provenance: { requestId: string | null; correlationId: string | null };
  }>;
  ledger: {
    enabled: boolean;
    durable: false;
    source: 'memory';
    counts: Record<LocalJobState, number>;
    recentWindow: number;
  } | null;
  message: string | null;
};

const stages = ['observe', 'evidence', 'verify', 'attest', 'act', 'learn', 'recompile'];
const architectureLayers = [
  { name: 'Experience', surfaces: 'Web · CLI · SDK · API', status: 'observed' },
  { name: 'Evidence', surfaces: 'Observe · Verify · Attest · Dissent', status: 'observed' },
  { name: 'Memory', surfaces: 'Events · Provenance · Persistence', status: 'observed' },
  { name: 'Governance', surfaces: 'Identity · Policy · Audit · Human gate', status: 'bounded' },
  { name: 'Infrastructure', surfaces: 'Runtime · Build · CI · Deployment', status: 'partial' },
];
const navGroups = [
  { label: 'Core', items: ['Current', 'Observe', 'Evidence', 'Verify', 'Attest', 'Act'] },
  { label: 'Intelligence', items: ['AI', 'Agents', 'Knowledge', 'Memory'] },
  { label: 'System', items: ['API', 'Data', 'Runtime', 'Security', 'Governance'] },
];

const timeLabel = (value: string) => new Date(value).toLocaleTimeString([], { hour12: false });

const describeResponseError = async (response: Response, fallback: string): Promise<string> => {
  const body = (await response.json().catch(() => ({}))) as {
    message?: string;
    requestId?: string;
  };
  const requestId = body.requestId ?? response.headers.get('x-request-id');
  return `${body.message ?? fallback}${requestId ? ` [${requestId}]` : ''}`;
};

export function App(): React.JSX.Element {
  const [claim, setClaim] = useState('Service X is healthy');
  const [responseTime, setResponseTime] = useState('42');
  const [statusCode, setStatusCode] = useState('200');
  const [events, setEvents] = useState<RuntimeEvent[]>([]);
  const [localJobs, setLocalJobs] = useState<LocalJobsView>({
    status: 'loading',
    jobs: [],
    ledger: null,
    message: null,
  });
  const [recentRuns, setRecentRuns] = useState<LoopResult[]>([]);
  const [revocations, setRevocations] = useState<RuntimeRevocation[]>([]);
  const [revocationIntegrity, setRevocationIntegrity] = useState<RevocationIntegrity | null>(null);
  const [revocationRevision, setRevocationRevision] = useState<number | null>(null);
  const [attestationTtlMs, setAttestationTtlMs] = useState<number | null>(null);
  const [policy, setPolicy] = useState<RuntimePolicy | null>(null);
  const [result, setResult] = useState<LoopResult | null>(null);
  const [mode, setMode] = useState('observe');
  const [trust, setTrust] = useState<number | null>(null);
  const [trustBasis, setTrustBasis] = useState<{
    evidenceQuality: number | null;
    verificationCoverage: number | null;
    attestationValidity: number | null;
    serviceReadiness: number | null;
    recentFailures: number;
  } | null>(null);
  const [serviceHealth, setServiceHealth] = useState({ ready: 0, total: 0 });
  const [runtimeHealth, setRuntimeHealth] = useState<RuntimeHealth | null>(null);
  const [persistenceMode, setPersistenceMode] = useState<'file' | 'memory' | null>(null);
  const [publicTrust, setPublicTrust] = useState<PublicTrustMetadata | null>(null);
  const [publicTrustStatus, setPublicTrustStatus] = useState<
    'loading' | 'available' | 'unavailable'
  >('loading');
  // Offline verification. Nothing here touches the API: an attestation and
  // a public key are all that is needed, which is the point — the person
  // checking a claim should not have to trust the service that made it.
  const [offlineAttestation, setOfflineAttestation] = useState('');
  const [offlinePublicKey, setOfflinePublicKey] = useState('');
  const [offlineResult, setOfflineResult] = useState<VerificationOutcome | null>(null);
  const [offlineChecking, setOfflineChecking] = useState(false);
  // Dissent is a first-class runtime state, not an error surface. §IV
  // requires the interface to expose it; leaving it in a JSON field would
  // mean an operator only learns of a disagreement by going looking.
  const [dissensus, setDissensus] = useState<RuntimeDissensus[]>([]);
  const [unresolvedDissent, setUnresolvedDissent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeNav, setActiveNav] = useState('Current');
  const [selectedEvent, setSelectedEvent] = useState<RuntimeEvent | null>(null);
  const [attestationStatus, setAttestationStatus] = useState<
    'idle' | 'checking' | 'valid' | 'invalid'
  >('idle');
  const [revocationReason, setRevocationReason] = useState('');
  const [revocationStatus, setRevocationStatus] = useState<
    'idle' | 'revoking' | 'revoked' | 'failed'
  >('idle');
  const [actionStatus, setActionStatus] = useState<
    'idle' | 'authorizing' | 'authorized' | 'denied'
  >('idle');
  const [authorizedActionId, setAuthorizedActionId] = useState<string | null>(null);
  const [learningOutcome, setLearningOutcome] = useState<'success' | 'failure' | 'uncertain'>(
    'success'
  );
  const [learningNote, setLearningNote] = useState('');
  const [learningStatus, setLearningStatus] = useState<
    'idle' | 'recording' | 'recorded' | 'failed'
  >('idle');
  const [recompileStatus, setRecompileStatus] = useState<
    'idle' | 'proposing' | 'proposed' | 'failed'
  >('idle');
  const [commandOpen, setCommandOpen] = useState(false);
  const [sceneSimulation, setSceneSimulation] = useState<SceneSimulation | null>(null);
  const [sceneLoading, setSceneLoading] = useState(false);
  const claimInputRef = useRef<HTMLTextAreaElement>(null);
  const commandFirstRef = useRef<HTMLButtonElement>(null);
  const commandTriggerRef = useRef<HTMLButtonElement>(null);

  const refreshRuntime = async () => {
    try {
      const [
        healthResponse,
        stateResponse,
        eventsResponse,
        runsResponse,
        revocationsResponse,
        policyResponse,
        dissensusResponse,
        jobsResponse,
      ] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/state'),
        fetch('/api/audit/events?limit=40'),
        fetch('/api/runs'),
        fetch('/api/attest/revocations'),
        fetch('/api/attest/policy'),
        fetch('/api/dissensus'),
        fetch('/api/jobs?limit=20').catch(() => null),
      ]);
      if (
        !healthResponse.ok ||
        !stateResponse.ok ||
        !eventsResponse.ok ||
        !runsResponse.ok ||
        !revocationsResponse.ok ||
        !policyResponse.ok ||
        !dissensusResponse.ok
      )
        throw new Error('Runtime unavailable');
      const health = (await healthResponse.json()) as { data: RuntimeHealth };
      const state = (await stateResponse.json()) as {
        data: {
          mode: string;
          readiness: 'ready' | 'degraded';
          trust: number | null;
          trustBasis: {
            evidenceQuality: number | null;
            verificationCoverage: number | null;
            attestationValidity: number | null;
            serviceReadiness: number | null;
            recentFailures: number;
          };
          persistence: 'file' | 'memory';
          attestationTtlMs?: number | null;
          services: Array<{ status: string }>;
        };
      };
      const eventData = (await eventsResponse.json()) as {
        data: RuntimeEvent[];
        meta?: { bounded?: boolean; total?: number };
      };
      const runData = (await runsResponse.json()) as { data: LoopResult[] };
      const revocationData = (await revocationsResponse.json()) as {
        data: RuntimeRevocation[];
        meta?: { integrity: RevocationIntegrity; digest: string; revision: number };
      };
      const policyData = (await policyResponse.json()) as { data: RuntimePolicy };
      if (!jobsResponse) {
        setLocalJobs({
          status: 'error',
          jobs: [],
          ledger: null,
          message: 'Local jobs unavailable',
        });
      } else if (jobsResponse.ok) {
        const jobsData = (await jobsResponse.json()) as {
          data?: { jobs?: LocalJobsView['jobs']; status?: LocalJobsView['ledger'] };
        };
        if (Array.isArray(jobsData.data?.jobs) && jobsData.data.status) {
          setLocalJobs({
            status: jobsData.data.status.enabled ? 'available' : 'disabled',
            jobs: jobsData.data.status.enabled ? jobsData.data.jobs : [],
            ledger: jobsData.data.status,
            message: jobsData.data.status.enabled ? null : 'Local jobs are disabled by default.',
          });
        } else {
          setLocalJobs({
            status: 'error',
            jobs: [],
            ledger: null,
            message: 'Invalid local jobs evidence',
          });
        }
      } else {
        const jobsError = (await jobsResponse.json().catch(() => ({}))) as {
          code?: string;
          message?: string;
        };
        setLocalJobs({
          status:
            jobsError.code === 'LOCAL_JOB_DISABLED'
              ? 'disabled'
              : jobsResponse.status === 401 || jobsResponse.status === 403
                ? 'unauthorized'
                : 'error',
          jobs: [],
          ledger: null,
          message:
            jobsError.code === 'LOCAL_JOB_DISABLED'
              ? 'Local jobs are disabled by default.'
              : jobsResponse.status === 401 || jobsResponse.status === 403
                ? 'Local job read access is unavailable.'
                : (jobsError.message ?? 'Local jobs unavailable'),
        });
      }
      const publicKeyResponse = await fetch('/api/attest/public-key').catch(() => null);
      if (publicKeyResponse?.ok) {
        const publicKeyData = (await publicKeyResponse.json()) as { data: PublicTrustMetadata };
        setPublicTrust(publicKeyData.data);
        setPublicTrustStatus('available');
      } else {
        setPublicTrust(null);
        setPublicTrustStatus('unavailable');
      }
      const readyServices = state.data.services.filter(
        (service) => service.status === 'ready'
      ).length;
      setRuntimeHealth(health.data);
      setMode(state.data.mode);
      setTrust(state.data.trust);
      setTrustBasis(state.data.trustBasis);
      setPersistenceMode(state.data.persistence);
      setAttestationTtlMs(state.data.attestationTtlMs ?? null);
      setServiceHealth({ ready: readyServices, total: state.data.services.length });
      setEvents(eventData.data);
      setRecentRuns(runData.data);
      setRevocations(revocationData.data);
      setRevocationIntegrity(revocationData.meta?.integrity ?? null);
      setRevocationRevision(revocationData.meta?.revision ?? null);
      const dissensusData = (await dissensusResponse.json()) as {
        data: RuntimeDissensus[];
        meta?: { unresolved?: number };
      };
      setDissensus(dissensusData.data);
      setUnresolvedDissent(dissensusData.meta?.unresolved ?? 0);
      setPolicy(policyData.data);
      setResult((current) => current ?? runData.data[0] ?? null);
      setSelectedEvent((current) =>
        current ? (eventData.data.find((event) => event.id === current.id) ?? current) : null
      );
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Runtime unavailable');
    }
  };

  useEffect(() => {
    void refreshRuntime();
  }, []);

  useEffect(() => {
    if (commandOpen) {
      commandFirstRef.current?.focus();
    } else if (document.activeElement === document.body) {
      // A command that moved focus elsewhere on purpose (e.g. "Observe"
      // focusing the claim textarea) should keep it there. Only reclaim
      // focus for the trigger when the palette closed without anything else
      // claiming it (Escape, backdrop click): its own focused button was
      // just removed from the DOM and focus fell back to <body>.
      commandTriggerRef.current?.focus();
    }
  }, [commandOpen]);

  useEffect(() => {
    if (!commandOpen) return;
    const handlePaletteKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const palette = document.querySelector<HTMLElement>('.command-palette');
      if (!palette) return;
      const focusable = Array.from(
        palette.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;
      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      const nextIndex = event.shiftKey
        ? (currentIndex - 1 + focusable.length) % focusable.length
        : (currentIndex + 1) % focusable.length;
      event.preventDefault();
      focusable[nextIndex]?.focus();
    };
    document.addEventListener('keydown', handlePaletteKeyDown);
    return () => document.removeEventListener('keydown', handlePaletteKeyDown);
  }, [commandOpen]);

  useEffect(() => {
    const stream = new EventSource('/api/events/stream');
    stream.onopen = () => {
      setError((current) => (current.startsWith('Live event stream') ? '' : current));
      void refreshRuntime();
    };
    stream.onmessage = (message) => {
      try {
        const incoming = JSON.parse(message.data) as RuntimeEvent;
        setEvents((current) =>
          [incoming, ...current.filter((event) => event.id !== incoming.id)].slice(0, 40)
        );
        setMode(incoming.stage);
        if (incoming.status === 'passed' || incoming.status === 'failed')
          setTrust(incoming.status === 'passed' ? 1 : 0);
      } catch {
        setError('Live event stream returned an unreadable event');
      }
    };
    stream.onerror = () => setError('Live event stream unavailable; retrying');
    return () => stream.close();
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
      if (event.key === 'Escape') setCommandOpen(false);
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const executeLoop = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/complete-loop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim,
          category: 'health-check',
          source: { system: 'current-console', version: '0.1.0', environment: 'local' },
          observedBy: 'operator',
          metadata: { responseTime: Number(responseTime), statusCode: Number(statusCode) },
          confidence: 0.95,
          confidenceReason: 'Operator initiated health observation',
        }),
      });
      if (!response.ok)
        throw new Error(await describeResponseError(response, 'The verification loop failed'));
      const payload = (await response.json()) as { data: LoopResult };
      setResult(payload.data);
      await refreshRuntime();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The loop failed');
    } finally {
      setLoading(false);
    }
  };

  const verifyAttestation = async () => {
    if (!result) return;
    setAttestationStatus('checking');
    try {
      const response = await fetch('/api/attest/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attestation: result.attestation }),
      });
      if (!response.ok)
        throw new Error(await describeResponseError(response, 'Attestation check failed'));
      const payload = (await response.json()) as {
        data: { valid: boolean; revoked?: boolean };
      };
      setAttestationStatus(payload.data.valid ? 'valid' : 'invalid');
      if (payload.data.revoked) setRevocationStatus('revoked');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Attestation check failed');
      setAttestationStatus('invalid');
    }
  };

  const revokeAttestation = async () => {
    if (!result || !revocationReason.trim()) return;
    setRevocationStatus('revoking');
    setError('');
    try {
      const response = await fetch('/api/attest/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-omega-operator-id': 'dashboard-operator',
        },
        body: JSON.stringify({
          attestationId: result.attestation.id,
          reason: revocationReason.trim(),
          revokedBy: 'dashboard-operator',
          operatorId: 'dashboard-operator',
        }),
      });
      if (!response.ok)
        throw new Error(await describeResponseError(response, 'Attestation revocation failed'));
      setRevocationStatus('revoked');
      setAttestationStatus('invalid');
      await refreshRuntime();
    } catch (requestError) {
      setRevocationStatus('failed');
      setError(
        requestError instanceof Error ? requestError.message : 'Attestation revocation failed'
      );
    }
  };

  const authorizeAction = async () => {
    if (!result) return;
    setActionStatus('authorizing');
    setError('');
    try {
      const response = await fetch('/api/act', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attestation: result.attestation }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(
          `${payload.message ?? 'Action authorization failed'} [${response.headers.get('x-request-id') ?? 'request unavailable'}]`
        );
      }
      const payload = (await response.json()) as { data: { id: string } };
      setAuthorizedActionId(payload.data.id);
      setActionStatus('authorized');
      await refreshRuntime();
    } catch (requestError) {
      setActionStatus('denied');
      setError(
        requestError instanceof Error ? requestError.message : 'Action authorization failed'
      );
    }
  };

  const recordLearning = async () => {
    if (!authorizedActionId) return;
    setLearningStatus('recording');
    try {
      const response = await fetch('/api/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: authorizedActionId,
          outcome: learningOutcome,
          note: learningNote,
        }),
      });
      if (!response.ok)
        throw new Error(await describeResponseError(response, 'Learning could not be recorded'));
      setLearningStatus('recorded');
      await refreshRuntime();
    } catch (requestError) {
      setLearningStatus('failed');
      setError(
        requestError instanceof Error ? requestError.message : 'Learning could not be recorded'
      );
    }
  };

  const proposeRecompile = async () => {
    if (learningStatus !== 'recorded') return;
    setRecompileStatus('proposing');
    try {
      const learningResponse = await fetch('/api/learning');
      if (!learningResponse.ok) throw new Error('Learning records unavailable');
      const learning = (await learningResponse.json()) as { data: Array<{ id: string }> };
      const learningId = learning.data[0]?.id;
      if (!learningId) throw new Error('No learning record is available');
      const response = await fetch('/api/recompile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learningId }),
      });
      if (!response.ok)
        throw new Error(await describeResponseError(response, 'Recompile proposal failed'));
      setRecompileStatus('proposed');
      await refreshRuntime();
    } catch (requestError) {
      setRecompileStatus('failed');
      setError(requestError instanceof Error ? requestError.message : 'Recompile proposal failed');
    }
  };

  const activeStage = stages.includes(mode) ? mode : 'observe';
  const runCommand = (command: () => void) => {
    command();
    setCommandOpen(false);
  };
  const navigate = (item: string) => {
    setActiveNav(item);
    const stage = item.toLowerCase();
    if (item === 'Current') {
      setMode('observe');
      setError('');
      return;
    }
    if (stages.includes(stage)) {
      setMode(stage);
      setError('');
      return;
    }
    setError(`${item} is not connected to the current runtime yet`);
  };

  const evidenceRun = result ?? recentRuns[0] ?? null;
  const evidenceEvents = events.slice(0, 8);

  const checkOffline = async (): Promise<void> => {
    setOfflineChecking(true);
    setOfflineResult(null);
    try {
      const parsed = JSON.parse(offlineAttestation) as Record<string, unknown>;
      setOfflineResult(await verifyEnvelopeLocally(parsed, offlinePublicKey));
    } catch (parseError) {
      setOfflineResult({
        valid: false,
        stage: 'shape',
        reason: `attestation is not valid JSON: ${
          parseError instanceof Error ? parseError.message : String(parseError)
        }`,
      });
    } finally {
      setOfflineChecking(false);
    }
  };

  const runSceneSimulation = async () => {
    setSceneLoading(true);
    try {
      const response = await fetch('/api/scene/simulate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ seed: 'dashboard-opening-scene' }),
      });
      const body = (await response.json()) as { data?: SceneSimulation; message?: string };
      if (!response.ok || !body.data)
        throw new Error(body.message ?? 'Scene simulation unavailable');
      setSceneSimulation(body.data);
    } catch (sceneError) {
      setError(sceneError instanceof Error ? sceneError.message : 'Scene simulation unavailable');
    } finally {
      setSceneLoading(false);
    }
  };

  return (
    <div className="os-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">Ω∞v</span>
          <span>ECOSYSTEMOS</span>
        </div>
        <div className="side-status">
          <span className="status-dot" /> Runtime active
        </div>
        <div className="side-status trust-status" title={publicTrust?.fingerprint}>
          <span className="status-dot" />
          {publicTrustStatus === 'available' && publicTrust
            ? `${publicTrust.algorithm} / ${publicTrust.keyVersion}`
            : publicTrustStatus === 'loading'
              ? 'Trust loading'
              : 'Trust unavailable'}
        </div>
        <nav aria-label="Primary navigation">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-label">{group.label}</span>
              {group.items.map((item) => (
                <button
                  className={activeNav === item ? 'nav-item active' : 'nav-item'}
                  key={item}
                  onClick={() => navigate(item)}
                >
                  <span className="nav-glyph">{item === 'Current' ? '◈' : '·'}</span>
                  {item}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span>LOCAL ENVIRONMENT</span>
          <strong>v0.1.0</strong>
        </div>
      </aside>
      <main className={activeNav === 'Evidence' ? 'workspace evidence-mode' : 'workspace'}>
        <header className="topbar">
          <div>
            <span className="eyebrow">Current / {activeNav}</span>
            <h1>One root. Infinite forms.</h1>
          </div>
          <div className="top-meta">
            <span className="mode-pill">
              <span className="status-dot" /> {mode.toUpperCase()}
            </span>
            <span className="trust">
              TRUST <strong>{trust === null ? 'UNKNOWN' : `${(trust * 100).toFixed(1)}%`}</strong>
            </span>
            <span
              className="trust-basis"
              title="Trust is derived from runtime evidence, verification, attestation, and service state"
            >
              {trustBasis
                ? `EVIDENCE ${trustBasis.evidenceQuality === null ? 'UNKNOWN' : `${(trustBasis.evidenceQuality * 100).toFixed(0)}%`} · ${trustBasis.recentFailures} FAILURES`
                : 'EVIDENCE UNKNOWN'}
            </span>
            <button
              ref={commandTriggerRef}
              className="command"
              onClick={() => setCommandOpen(true)}
            >
              ⌘ K
            </button>
          </div>
        </header>
        {commandOpen && (
          <div className="command-backdrop" onClick={() => setCommandOpen(false)}>
            <div
              className="command-palette"
              role="dialog"
              aria-label="Command palette"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="command-search">
                ⌘ <span>What do you want to do?</span>
                <kbd>ESC</kbd>
              </div>
              <button
                ref={commandFirstRef}
                onClick={() => runCommand(() => claimInputRef.current?.focus())}
              >
                <strong>Observe</strong>
                <span>Focus operator input</span>
              </button>
              <button onClick={() => runCommand(() => void executeLoop())}>
                <strong>Run verification</strong>
                <span>Enter a real observation into the current</span>
              </button>
              <button onClick={() => runCommand(() => void refreshRuntime())}>
                <strong>Refresh runtime</strong>
                <span>Read the latest API state and event ledger</span>
              </button>
              <button onClick={() => runCommand(() => navigate('Evidence'))}>
                <strong>Open evidence</strong>
                <span>Follow the recorded observation and verification lineage</span>
              </button>
              <button onClick={() => runCommand(() => void verifyAttestation())} disabled={!result}>
                <strong>Verify attestation</strong>
                <span>
                  {result ? 'Execute the signature check' : 'Available after a completed run'}
                </span>
              </button>
            </div>
          </div>
        )}
        {error && (
          <div className="error-banner" role="alert">
            <strong>Runtime boundary</strong>
            <span>{error}. UI is showing the last known state.</span>
          </div>
        )}
        {activeNav === 'Evidence' ? (
          <section className="evidence-view" aria-labelledby="evidence-view-title">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">READ-ONLY LINEAGE</span>
                <h2 id="evidence-view-title">Evidence timeline</h2>
              </div>
              <button className="run-button" onClick={() => navigate('Current')}>
                Return to Current
              </button>
            </div>
            <p className="evidence-view-note">
              This view follows recorded runtime artifacts. It does not turn a claim into truth or
              infer verification from a missing record.
            </p>
            {evidenceRun ? (
              <div className="evidence-chain">
                <article className="evidence-chain-card">
                  <span className="section-kicker">01 / OBSERVATION</span>
                  <h3>{evidenceRun.observation.claim.statement}</h3>
                  <p>
                    <strong>Observed:</strong> {evidenceRun.observation.id}
                  </p>
                  <span className="evidence-state">
                    OBSERVED · confidence {evidenceRun.observation.confidence}
                  </span>
                </article>
                <article className="evidence-chain-card">
                  <span className="section-kicker">02 / VERIFICATION</span>
                  <h3>{evidenceRun.verification.summary.passed ? 'VERIFIED' : 'FAILED'}</h3>
                  <p>
                    {evidenceRun.verification.summary.rulesPassed} of{' '}
                    {evidenceRun.verification.summary.rulesApplied} rules passed; confidence{' '}
                    {evidenceRun.verification.summary.confidence}
                  </p>
                  <span className="evidence-state">
                    {evidenceRun.verification.id} ·{' '}
                    {evidenceRun.verification.summary.passed ? 'VERIFIED' : 'UNVERIFIED'}
                  </span>
                </article>
                <article className="evidence-chain-card">
                  <span className="section-kicker">03 / ATTESTATION</span>
                  <h3>
                    {evidenceRun.attestation.revoked
                      ? 'REVOKED'
                      : evidenceRun.attestation.verified
                        ? 'ATTESTED'
                        : 'UNVERIFIED'}
                  </h3>
                  <p>
                    {evidenceRun.attestation.id} · signed at{' '}
                    {timeLabel(evidenceRun.attestation.attestedAt)}
                  </p>
                  <span className="evidence-state">
                    {evidenceRun.attestation.revoked
                      ? 'REVOKED'
                      : evidenceRun.attestation.verified
                        ? 'ATTESTED'
                        : 'UNKNOWN'}
                  </span>
                </article>
              </div>
            ) : (
              <div className="empty evidence-empty">
                No completed run is available to trace yet.
              </div>
            )}
            <div className="evidence-view-grid">
              <section className="evidence-subpanel" aria-labelledby="evidence-events-title">
                <div className="panel-heading">
                  <div>
                    <span className="section-kicker">ACTIVITY</span>
                    <h3 id="evidence-events-title">Recent recorded events</h3>
                  </div>
                  <span className="seal">{evidenceEvents.length.toString().padStart(2, '0')}</span>
                </div>
                {evidenceEvents.length === 0 ? (
                  <p className="empty">No events are available in the bounded recent window.</p>
                ) : (
                  <div className="evidence-event-list">
                    {evidenceEvents.map((event) => (
                      <div className="evidence-event" key={event.id}>
                        <strong>{event.type}</strong>
                        <span>
                          {event.status.toUpperCase()} · {timeLabel(event.timestamp)}
                        </span>
                        <small>
                          {event.correlationId
                            ? `correlation ${event.correlationId}`
                            : 'correlation UNKNOWN'}{' '}
                          · {event.requestId ? `request ${event.requestId}` : 'request UNKNOWN'}
                        </small>
                      </div>
                    ))}
                  </div>
                )}
              </section>
              <section className="evidence-subpanel" aria-labelledby="evidence-uncertainty-title">
                <div className="panel-heading">
                  <div>
                    <span className="section-kicker">DISSENT / LIMITS</span>
                    <h3 id="evidence-uncertainty-title">What remains uncertain</h3>
                  </div>
                  <span className="seal">{unresolvedDissent.toString().padStart(2, '0')}</span>
                </div>
                {dissensus.length > 0 ? (
                  <div className="evidence-dissent-list">
                    {dissensus.slice(0, 3).map((entry) => (
                      <div className="evidence-dissent" key={entry.id}>
                        <strong>{entry.verdict}</strong>
                        <span>{entry.reason}</span>
                        <small>
                          {entry.routing === 'HUMAN' ? 'ROUTED TO HUMAN' : 'AUTOMATIC'} · confidence{' '}
                          {entry.confidence}
                        </small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty">No dissent is recorded in the current bounded view.</p>
                )}
                <p className="evidence-limitation">
                  Runtime readiness, custody labels, and local event history are bounded evidence;
                  they are not proof of distributed recovery, completeness, or future truth.
                </p>
              </section>
            </div>
          </section>
        ) : null}
        <section className="hero-grid">
          <div className="current-panel">
            <div className="section-kicker">
              ACTIVE CURRENT <span>LIVE</span>
            </div>
            <div className="current-orbit">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="core">
                <span>Ω∞v</span>
                <small>CORE</small>
              </div>
            </div>
            <p className="current-caption">
              The current is the system. Every form returns to evidence.
            </p>
            <div className="stage-flow">
              {stages.map((stage, index) => (
                <button
                  className={activeStage === stage ? 'stage active' : 'stage'}
                  key={stage}
                  onClick={() => setMode(stage)}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {stage}
                </button>
              ))}
            </div>
          </div>
          <section className="architecture-panel" aria-labelledby="architecture-title">
            <div className="section-kicker">
              WHOLE SYSTEM <span>OBSERVED SURFACES</span>
            </div>
            <h2 id="architecture-title">Architecture current</h2>
            <p className="current-caption">
              A compact map of the layers currently represented by the repository. Labels do not
              imply production completeness.
            </p>
            <div className="architecture-layers">
              {architectureLayers.map((layer) => (
                <div className="architecture-layer" key={layer.name}>
                  <div>
                    <strong>{layer.name}</strong>
                    <span>{layer.surfaces}</span>
                  </div>
                  <small>{layer.status.toUpperCase()}</small>
                </div>
              ))}
            </div>
          </section>
          <section className="intent-panel" aria-labelledby="scene-simulation-title">
            <div className="section-kicker">
              SCENE EQUATION <span>SYMBOLIC SIMULATION</span>
            </div>
            <h2 id="scene-simulation-title">One current, infinite forms</h2>
            <p className="current-caption">
              Run the opening myth as a bounded evidence trace. This does not verify cosmology or
              consciousness.
            </p>
            <button
              className="run-button"
              onClick={() => void runSceneSimulation()}
              disabled={sceneLoading}
            >
              {sceneLoading ? 'Simulating…' : 'Run scene equation'}
            </button>
            {sceneSimulation && (
              <div className="evidence-chain-card" aria-live="polite">
                <strong>{sceneSimulation.terminalState.toUpperCase()}</strong>
                <p>{sceneSimulation.states.join(' → ')}</p>
                <small>
                  {sceneSimulation.provenance.ruleVersion} · deterministic=
                  {String(sceneSimulation.provenance.deterministic)} · verified=
                  {String(sceneSimulation.provenance.verified)}
                </small>
              </div>
            )}
          </section>
          <div className="intent-panel">
            <div className="section-kicker">
              CREATE AN OBSERVATION <span>OPERATOR INPUT</span>
            </div>
            <label htmlFor="claim">What should enter the current?</label>
            <textarea
              ref={claimInputRef}
              id="claim"
              value={claim}
              onChange={(event) => setClaim(event.target.value)}
              rows={3}
            />
            <div className="input-controls">
              <label htmlFor="response-time">
                Response ms
                <input
                  id="response-time"
                  type="number"
                  min="0"
                  value={responseTime}
                  onChange={(event) => setResponseTime(event.target.value)}
                />
              </label>
              <label htmlFor="status-code">
                Status code
                <input
                  id="status-code"
                  type="number"
                  min="100"
                  value={statusCode}
                  onChange={(event) => setStatusCode(event.target.value)}
                />
              </label>
            </div>
            <div className="input-meta">
              <span>health-check / local</span>
              <button
                className="run-button"
                onClick={executeLoop}
                disabled={loading || !claim.trim()}
              >
                {loading ? 'Running current...' : 'Run verification'} <span>↗</span>
              </button>
            </div>
            <div className="truth-note">
              <span>⊙</span> Checks use the values you submit. Failures remain visible as evidence.
            </div>
          </div>
        </section>
        <section className="metrics-row">
          <div>
            <span>EVENTS RECORDED</span>
            <strong>{events.length.toString().padStart(2, '0')}</strong>
          </div>
          <div>
            <span>VERIFICATION</span>
            <strong className="green">
              {result ? (result.verification.summary.passed ? 'PASSED' : 'FAILED') : 'READY'}
            </strong>
          </div>
          <div>
            <span>SERVICES</span>
            <strong>
              {serviceHealth.total
                ? `${String(serviceHealth.ready).padStart(2, '0')} / ${String(serviceHealth.total).padStart(2, '0')}`
                : 'UNKNOWN'}
            </strong>
          </div>
          <div>
            <span>HEALTH</span>
            <strong className={runtimeHealth?.readiness === 'ready' ? 'green' : ''}>
              {runtimeHealth ? runtimeHealth.readiness.toUpperCase() : 'UNKNOWN'}
            </strong>
          </div>
          <div>
            <span>STATE READINESS</span>
            <strong className={trustBasis?.serviceReadiness === 1 ? 'green' : ''}>
              {trustBasis ? (trustBasis.serviceReadiness === 1 ? 'READY' : 'DEGRADED') : 'UNKNOWN'}
            </strong>
          </div>
          <div>
            <span>EVENT LOG</span>
            <strong>
              {runtimeHealth?.checks.persistence
                ? `${runtimeHealth.checks.persistence.eventLogSource.toUpperCase()} / ${runtimeHealth.checks.persistence.skippedLogEntries}`
                : 'UNKNOWN'}
            </strong>
          </div>
          <div>
            <span>LOG KEY</span>
            <strong>
              {runtimeHealth?.checks.persistence?.eventLogKeySource?.toUpperCase() ?? 'UNKNOWN'}
            </strong>
          </div>
          <div>
            <span>ROTATION</span>
            <strong>
              {runtimeHealth?.checks.persistence
                ? runtimeHealth.checks.persistence.rotationPending
                  ? 'PENDING'
                  : 'CURRENT'
                : 'UNKNOWN'}
            </strong>
          </div>
          <div>
            <span>ACTION</span>
            <strong>
              {runtimeHealth?.checks.persistence?.operatorAction?.toUpperCase() ?? 'UNKNOWN'}
            </strong>
          </div>
          {runtimeHealth?.checks.persistence?.eventLogReason ? (
            <div>
              <span>LOG REASON</span>
              <strong>{runtimeHealth.checks.persistence.eventLogReason}</strong>
            </div>
          ) : null}
          <div>
            <span>LOG KEY</span>
            <strong>
              {runtimeHealth?.checks.persistence?.eventLogKeySource?.toUpperCase() ?? 'UNKNOWN'}
            </strong>
          </div>
          <div>
            <span>SECURE DELETION</span>
            <strong>
              {runtimeHealth?.checks.persistence
                ? `${runtimeHealth.checks.persistence.deletionPolicy.mode.toUpperCase()} / VERIFIED=${runtimeHealth.checks.persistence.deletionPolicy.verified} / ${runtimeHealth.checks.persistence.deletionPolicy.reason ?? 'CAPABILITY ONLY'}`
                : 'UNKNOWN'}
            </strong>
          </div>
          <div>
            <span>KEY CUSTODY</span>
            <strong>
              {runtimeHealth?.checks.persistence
                ? `${runtimeHealth.checks.persistence.custodyPolicy.mode.toUpperCase()} / ${runtimeHealth.checks.persistence.custodyPolicy.reference ?? 'NO REFERENCE'} / VERIFIED=${runtimeHealth.checks.persistence.custodyPolicy.verified} / ${runtimeHealth.checks.persistence.custodyPolicy.reason ?? 'DECLARATION ONLY'}`
                : 'UNKNOWN'}
            </strong>
          </div>
          <div>
            <span>COORDINATION</span>
            <strong>
              {runtimeHealth?.checks.persistence
                ? `${runtimeHealth.checks.persistence.coordinationPolicy.mode.toUpperCase()} / ${runtimeHealth.checks.persistence.coordinationPolicy.reference ?? 'NO REFERENCE'} / VERIFIED=${runtimeHealth.checks.persistence.coordinationPolicy.verified} / ${runtimeHealth.checks.persistence.coordinationPolicy.reason ?? 'DECLARATION ONLY'}`
                : 'UNKNOWN'}
            </strong>
          </div>
          <div>
            <span>AT-REST COVERAGE</span>
            <strong>
              {runtimeHealth?.checks.persistence
                ? `${runtimeHealth.checks.persistence.coverage.surfaces.map((surface) => `${surface.name}:${surface.encryption}`).join(' / ')} / UNVERIFIED: ${runtimeHealth.checks.persistence.coverage.unverifiedSurfaces.join(', ')}`
                : 'UNKNOWN'}
            </strong>
          </div>
          <div>
            <span>KEY IDENTITY</span>
            <strong>
              {runtimeHealth?.checks.persistence
                ? `${runtimeHealth.checks.persistence.currentKeyFingerprint ?? 'NONE'} / ${runtimeHealth.checks.persistence.previousKeyFingerprint ?? 'NONE'} / UNVERIFIED LOCAL`
                : 'UNKNOWN'}
            </strong>
          </div>
          {runtimeHealth?.checks.persistence?.acknowledgement ? (
            <div>
              <span>ACKNOWLEDGED</span>
              <strong>
                {runtimeHealth.checks.persistence.acknowledgement.operatorId} /{' '}
                {runtimeHealth.checks.persistence.acknowledgement.action.toUpperCase()}
              </strong>
            </div>
          ) : null}
          {runtimeHealth?.checks.persistence?.reencrypt ? (
            <div>
              <span>REENCRYPTED</span>
              <strong>
                {runtimeHealth.checks.persistence.reencrypt.snapshotRecords} SNAPSHOT /{' '}
                {runtimeHealth.checks.persistence.reencrypt.eventRecords} EVENTS /{' '}
                {runtimeHealth.checks.persistence.reencrypt.operatorId}
              </strong>
            </div>
          ) : null}
          <div>
            <span>RECOVERY POLICY</span>
            <strong>
              {runtimeHealth?.checks.persistence
                ? `${runtimeHealth.checks.persistence.recoveryPolicy.mode.toUpperCase()} / ${runtimeHealth.checks.persistence.recoveryPolicy.reference ?? 'NONE'} / DECLARATION ONLY`
                : 'UNKNOWN'}
            </strong>
          </div>
          {runtimeHealth?.checks.persistence?.reencryptionRecovery.status !== 'none' ? (
            <div>
              <span>ROTATION RECOVERY</span>
              <strong
                className={
                  runtimeHealth?.checks.persistence?.reencryptionRecovery.status === 'blocked'
                    ? 'red'
                    : 'green'
                }
              >
                {runtimeHealth?.checks.persistence?.reencryptionRecovery.status.toUpperCase()}
              </strong>
            </div>
          ) : null}
          <div>
            <span>ENVIRONMENT</span>
            <strong>{persistenceMode ? persistenceMode.toUpperCase() : 'UNKNOWN'}</strong>
          </div>
          <div>
            <span>EVENT LOG</span>
            <strong
              className={
                runtimeHealth?.checks.persistence?.eventLogSource === 'partial' ? 'red' : 'green'
              }
            >
              {runtimeHealth?.checks.persistence
                ? `${runtimeHealth.checks.persistence.eventLogSource.toUpperCase()} / ${runtimeHealth.checks.persistence.skippedLogEntries} SKIPPED`
                : 'UNKNOWN'}
            </strong>
          </div>
          <div>
            <span>REVOCATIONS / REVISION</span>
            <strong className={revocations.length > 0 ? 'red' : ''}>
              {revocations.length.toString().padStart(2, '0')} / r{revocationRevision ?? '?'}
            </strong>
          </div>
          <div>
            <span>REVOCATION INTEGRITY</span>
            <strong className={revocationIntegrity === 'intact' ? 'green' : ''}>
              {revocationIntegrity ? revocationIntegrity.toUpperCase() : 'UNKNOWN'}
            </strong>
          </div>
          <div>
            <span>ATTESTATION TTL</span>
            <strong>
              {attestationTtlMs === null ? 'OFF' : `${Math.round(attestationTtlMs / 1000)}s`}
            </strong>
          </div>
          <div>
            <span>POLICY</span>
            <strong>
              {policy
                ? `${policy.revocationEnabled ? 'REVOCATION' : 'NO REVOCATION'} / ${policy.adminAuthConfigured ? 'ADMIN' : 'LOCAL'}${policy.adminOperatorAllowlistRequired ? ' / ALLOWLIST REQUIRED' : policy.adminOperatorAllowlistConfigured ? ' / IDENTITY OPTIONAL' : ''}`
                : 'UNKNOWN'}
            </strong>
          </div>
          <div>
            <span>PERSISTENCE KEY</span>
            <strong>
              {policy
                ? `${policy.persistenceEncryptionKeySource.toUpperCase()}${policy.persistencePreviousKeyConfigured ? ' / PREVIOUS' : ''}`
                : 'UNKNOWN'}
            </strong>
          </div>
          <div>
            <span>TRUST KEY</span>
            <strong className={publicTrustStatus === 'available' ? 'green' : ''}>
              {publicTrustStatus === 'available' && publicTrust
                ? `${publicTrust.algorithm} / ${publicTrust.keyVersion}`
                : publicTrustStatus === 'loading'
                  ? 'CHECKING'
                  : 'UNAVAILABLE'}
            </strong>
            {publicTrust && <small title={publicTrust.fingerprint}>{publicTrust.keyId}</small>}
          </div>
        </section>
        {revocations.length > 0 && (
          <section className="revocations-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">REVOCATION LEDGER</span>
                <h2>Proofs no longer authorize action</h2>
              </div>
              <span className="seal">{revocations.length.toString().padStart(2, '0')}</span>
            </div>
            <div className="revocation-list">
              {revocations.slice(0, 5).map((revocation) => (
                <div className="revocation-row" key={revocation.id}>
                  <strong>{revocation.attestationId}</strong>
                  <span>{revocation.reason}</span>
                  <small>
                    {revocation.revokedBy} · {timeLabel(revocation.revokedAt)}
                  </small>
                </div>
              ))}
            </div>
          </section>
        )}
        <section className="offline-verify-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">INDEPENDENT VERIFICATION</span>
              <h2>Check a proof without trusting this page</h2>
            </div>
          </div>
          <p className="offline-verify-note">
            Paste an attestation and the public key it claims to be signed by. The check runs
            entirely in your browser against the published envelope specification. No request is
            sent, and the private key is never involved.
          </p>
          <label htmlFor="offline-attestation">Attestation JSON</label>
          <textarea
            id="offline-attestation"
            value={offlineAttestation}
            onChange={(event) => setOfflineAttestation(event.target.value)}
            placeholder={'{ "verificationId": "ver-...", "signature": "0x...", ... }'}
            rows={6}
          />
          <label htmlFor="offline-public-key">Public key (PEM)</label>
          <textarea
            id="offline-public-key"
            value={offlinePublicKey}
            onChange={(event) => setOfflinePublicKey(event.target.value)}
            placeholder={'-----BEGIN PUBLIC KEY-----'}
            rows={4}
          />
          <button
            type="button"
            onClick={checkOffline}
            disabled={offlineChecking || !offlineAttestation || !offlinePublicKey}
          >
            {offlineChecking ? 'Checking...' : 'Verify locally'}
          </button>
          {offlineResult && (
            <div
              className={`offline-verify-result ${offlineResult.valid ? 'is-valid' : 'is-invalid'}`}
              role="status"
            >
              <strong>{offlineResult.valid ? 'VALID' : 'INVALID'}</strong>
              <span>{offlineResult.reason}</span>
              <small>rejected at: {offlineResult.stage}</small>
              {offlineResult.valid && (
                <small>
                  This proves origin and integrity only. It does not prove the verification was
                  correct, nor that the attestation has since been revoked or has expired.
                </small>
              )}
            </div>
          )}
        </section>
        {dissensus.length > 0 && (
          <section className="dissensus-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">DISSENT LEDGER</span>
                <h2>Where the verifiers did not agree</h2>
              </div>
              <span className="seal">{unresolvedDissent.toString().padStart(2, '0')}</span>
            </div>
            <p className="dissensus-note">
              Disagreement is preserved, not resolved. A split does not stop an action; it is
              recorded against it, so the question is not only whether something was authorized but
              whether it was contested at the time.
            </p>
            <div className="dissensus-list">
              {dissensus.slice(0, 5).map((entry) => (
                <div className={`dissensus-row is-${entry.verdict.toLowerCase()}`} key={entry.id}>
                  <div className="dissensus-verdict">
                    <strong>{entry.verdict === 'SPLIT' ? 'DISSENTING' : entry.verdict}</strong>
                    <small>{entry.routing === 'HUMAN' ? 'ROUTED TO HUMAN' : 'AUTOMATIC'}</small>
                  </div>
                  <span className="dissensus-reason">{entry.reason}</span>
                  <div className="dissensus-opinions">
                    {entry.opinions.map((opinion) => {
                      const objecting = entry.dissenting.some(
                        (candidate) => candidate.verifierId === opinion.verifierId
                      );
                      return (
                        <span
                          className={`dissensus-opinion ${objecting ? 'is-objecting' : ''}`}
                          key={`${entry.id}-${opinion.verifierId}`}
                          title={opinion.reason}
                        >
                          {opinion.verifierId}:{' '}
                          {opinion.passed === null
                            ? 'UNKNOWN'
                            : opinion.passed
                              ? 'PASSED'
                              : 'FAILED'}
                        </span>
                      );
                    })}
                  </div>
                  <small className="dissensus-confidence">
                    confidence {entry.confidence} · minimum across verifiers, never the mean
                  </small>
                </div>
              ))}
            </div>
          </section>
        )}
        <section className="jobs-panel" aria-labelledby="local-jobs-title">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">LOCAL JOB EVIDENCE</span>
              <h2 id="local-jobs-title">Local jobs</h2>
            </div>
            <span className="seal">READ-ONLY</span>
          </div>
          <p className="jobs-description">
            Bounded local worker evidence. This view never starts, claims, retries, or deletes work.
          </p>
          {localJobs.status === 'loading' && (
            <p className="jobs-state">Loading local job evidence…</p>
          )}
          {localJobs.status === 'disabled' && (
            <p className="jobs-state jobs-state-muted">
              {localJobs.message} Local evidence is <strong>durable=false</strong> and absent until
              explicitly enabled.
            </p>
          )}
          {localJobs.status === 'unauthorized' && (
            <p className="jobs-state jobs-state-warning">
              {localJobs.message} No credentials or job details are shown in this read-only view.
            </p>
          )}
          {localJobs.status === 'error' && (
            <p className="jobs-state jobs-state-warning">
              {localJobs.message ?? 'Local jobs unavailable.'}
            </p>
          )}
          {localJobs.status === 'available' && localJobs.ledger && (
            <>
              <div className="jobs-contract" aria-live="polite">
                <span>source={localJobs.ledger.source}</span>
                <span>storage=memory</span>
                <strong>durable=false</strong>
                <span>window={localJobs.ledger.recentWindow}</span>
              </div>
              <div className="jobs-counts" aria-label="Local job counts">
                <span>queued {localJobs.ledger.counts.queued}</span>
                <span>running {localJobs.ledger.counts.running}</span>
                <span>succeeded {localJobs.ledger.counts.succeeded}</span>
                <span>failed {localJobs.ledger.counts.failed}</span>
                <span>unknown {localJobs.ledger.counts.unknown}</span>
              </div>
              {localJobs.jobs.length === 0 ? (
                <p className="jobs-state jobs-state-muted">
                  The local ledger is enabled but contains no jobs.
                </p>
              ) : (
                <div className="jobs-list" role="list" aria-label="Recent local jobs">
                  {localJobs.jobs.map((job) => (
                    <article className="job-card" key={job.id} role="listitem">
                      <div className="job-card-heading">
                        <strong>{job.id}</strong>
                        <span className={`job-state job-state-${job.state}`}>{job.state}</span>
                      </div>
                      <p>
                        attempt {job.attempt} · worker {job.workerId ?? 'none'} · updated{' '}
                        {timeLabel(job.updatedAt)}
                      </p>
                      <small>
                        created {timeLabel(job.createdAt)} · finished{' '}
                        {job.finishedAt ? timeLabel(job.finishedAt) : 'not terminal'}
                      </small>
                      {job.errorClass && (
                        <small className="jobs-error">error class: {job.errorClass}</small>
                      )}
                      <small className="jobs-provenance">
                        request {job.provenance.requestId ?? 'unknown'} · correlation{' '}
                        {job.provenance.correlationId ?? 'unknown'}
                      </small>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
        <section className="runs-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">RECENT RUN EVIDENCE</span>
              <h2>What was verified</h2>
            </div>
            <span className="seal">{recentRuns.length.toString().padStart(2, '0')}</span>
          </div>
          <div className="event-list">
            {recentRuns.length === 0 ? (
              <div className="empty">No completed runs are available yet.</div>
            ) : (
              recentRuns.slice(0, 5).map((run) => (
                <button
                  className="event-row"
                  key={run.observation.id}
                  onClick={() => {
                    setResult(run);
                    setSelectedEvent(null);
                  }}
                >
                  <span
                    className={`event-marker ${run.verification.summary.passed ? 'passed' : 'failed'}`}
                  />
                  <div>
                    <strong>{run.observation.id}</strong>
                    <p>
                      verification {run.verification.summary.passed ? 'passed' : 'failed'} ·
                      attestation {run.attestation.verified ? 'valid' : 'invalid'}
                    </p>
                  </div>
                  <span className="event-stage">OPEN</span>
                </button>
              ))
            )}
          </div>
        </section>
        <section className="lower-grid">
          <div className="stream-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">UNIVERSAL EVENT STREAM</span>
                <h2>What is happening</h2>
              </div>
              <span className="live-tag">● LIVE</span>
            </div>
            <div className="event-list">
              {events.length === 0 ? (
                <div className="empty">No observations have entered the current yet.</div>
              ) : (
                events.map((event) => (
                  <button
                    className={selectedEvent?.id === event.id ? 'event-row selected' : 'event-row'}
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <span className={`event-marker ${event.status}`} />
                    <time>{timeLabel(event.timestamp)}</time>
                    <div>
                      <strong>{event.type.replace('.', ' / ').toUpperCase()}</strong>
                      <p>{event.message}</p>
                    </div>
                    <span className="event-stage">{event.stage}</span>
                  </button>
                ))
              )}
            </div>
          </div>
          <div className="evidence-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">EVENT INSPECTOR</span>
                <h2>{selectedEvent ? selectedEvent.type : 'Evidence chain'}</h2>
              </div>
              <span className="seal">◉</span>
            </div>
            {selectedEvent ? (
              <div className="event-inspector">
                <div>
                  <span>EVENT ID</span>
                  <code>{selectedEvent.id}</code>
                </div>
                <div>
                  <span>CORRELATION</span>
                  <code>{selectedEvent.correlationId ?? 'not assigned'}</code>
                </div>
                <div>
                  <span>REQUEST</span>
                  <code>{selectedEvent.requestId ?? 'not assigned'}</code>
                </div>
                <div>
                  <span>PAYLOAD</span>
                  <pre>{JSON.stringify(selectedEvent.details ?? {}, null, 2)}</pre>
                </div>
              </div>
            ) : result ? (
              <div className="chain">
                <div className="chain-item">
                  <span className="chain-line" />
                  <div>
                    <span>OBSERVATION</span>
                    <code>{result.observation.id}</code>
                  </div>
                </div>
                <div className="chain-item">
                  <span className="chain-line" />
                  <div>
                    <span>VERIFICATION / EVIDENCE</span>
                    <code>{result.verification.id}</code>
                    {result.verification.evidencePath.map((step) => (
                      <p
                        className={step.passed ? 'evidence-pass' : 'evidence-fail'}
                        key={step.rule}
                      >
                        {step.passed ? 'PASS' : 'FAIL'} / {step.reasoning}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="chain-item">
                  <span className="chain-line" />
                  <div>
                    <span>MEMORY / KERNEL RECORD</span>
                    <code>{result.memory.id}</code>
                    <small className="memory-note">Recorded in append-only hash chain</small>
                  </div>
                </div>
                <div className="chain-item">
                  <span className="chain-line" />
                  <div>
                    <span>ATTESTATION</span>
                    <code>{result.attestation.id}</code>
                    <button
                      className="verify-button"
                      onClick={verifyAttestation}
                      disabled={attestationStatus === 'checking'}
                    >
                      {attestationStatus === 'checking' ? 'Checking...' : 'Verify signature'}
                    </button>
                    {attestationStatus !== 'idle' && (
                      <small
                        className={
                          attestationStatus === 'valid'
                            ? 'attestation-valid'
                            : 'attestation-invalid'
                        }
                      >
                        {attestationStatus.toUpperCase()}
                      </small>
                    )}
                    <div className="revocation-controls">
                      <label htmlFor="revocation-reason">Revocation reason</label>
                      <input
                        id="revocation-reason"
                        value={revocationReason}
                        onChange={(event) => setRevocationReason(event.target.value)}
                        placeholder="Why should this proof stop authorizing action?"
                        disabled={revocationStatus === 'revoking' || revocationStatus === 'revoked'}
                      />
                      <button
                        className="revoke-button"
                        onClick={revokeAttestation}
                        disabled={
                          !revocationReason.trim() ||
                          revocationStatus === 'revoking' ||
                          revocationStatus === 'revoked'
                        }
                      >
                        {revocationStatus === 'revoking' ? 'Revoking...' : 'Revoke attestation'}
                      </button>
                      {revocationStatus !== 'idle' && (
                        <small
                          className={
                            revocationStatus === 'revoked'
                              ? 'attestation-invalid'
                              : revocationStatus === 'failed'
                                ? 'attestation-invalid'
                                : 'attestation-valid'
                          }
                        >
                          {revocationStatus === 'revoked'
                            ? 'ATTESTATION REVOKED'
                            : revocationStatus === 'failed'
                              ? 'REVOCATION FAILED'
                              : 'REVOCATION IN PROGRESS'}
                        </small>
                      )}
                    </div>
                    <button
                      className="act-button"
                      onClick={authorizeAction}
                      disabled={
                        actionStatus === 'authorizing' || !result.verification.summary.passed
                      }
                    >
                      {actionStatus === 'authorizing' ? 'Authorizing...' : 'Authorize action'}
                    </button>
                    {actionStatus !== 'idle' && (
                      <small
                        className={
                          actionStatus === 'authorized'
                            ? 'attestation-valid'
                            : 'attestation-invalid'
                        }
                      >
                        {actionStatus === 'authorized' ? 'ACTION AUTHORIZED' : 'ACTION DENIED'}
                      </small>
                    )}
                    {actionStatus === 'authorized' && (
                      <div className="learning-controls">
                        <span>LEARNING FEEDBACK</span>
                        <select
                          value={learningOutcome}
                          onChange={(event) =>
                            setLearningOutcome(event.target.value as typeof learningOutcome)
                          }
                        >
                          <option value="success">Success</option>
                          <option value="failure">Failure</option>
                          <option value="uncertain">Uncertain</option>
                        </select>
                        <input
                          value={learningNote}
                          onChange={(event) => setLearningNote(event.target.value)}
                          placeholder="What did the action teach us?"
                        />
                        <button
                          className="learn-button"
                          onClick={recordLearning}
                          disabled={learningStatus === 'recording'}
                        >
                          {learningStatus === 'recording' ? 'Recording...' : 'Record learning'}
                        </button>
                        {learningStatus === 'recorded' && (
                          <small className="attestation-valid">LEARNING RECORDED</small>
                        )}
                        {learningStatus === 'recorded' && (
                          <button
                            className="recompile-button"
                            onClick={proposeRecompile}
                            disabled={recompileStatus === 'proposing'}
                          >
                            {recompileStatus === 'proposing' ? 'Proposing...' : 'Propose recompile'}
                          </button>
                        )}
                        {recompileStatus !== 'idle' && (
                          <small
                            className={
                              recompileStatus === 'proposed'
                                ? 'attestation-valid'
                                : 'attestation-invalid'
                            }
                          >
                            {recompileStatus === 'proposed'
                              ? 'RECOMPILE PROPOSED'
                              : 'RECOMPILE FAILED'}
                          </small>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty evidence-empty">
                Run the loop to generate a traceable evidence chain.
              </div>
            )}
            <div className="panel-foot">
              ATTEST ≠ ASSERT <span>Evidence before trust</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
