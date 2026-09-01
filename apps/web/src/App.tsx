import { useState, useEffect, useCallback } from 'react';
import './App.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EvidenceStep {
  step: number;
  rule: string;
  passed: boolean;
  reasoning: string;
  value?: unknown;
}

interface LogEntry {
  id: number;
  type: 'OBSERVATION' | 'VERIFICATION' | 'ATTESTATION';
  recordedAt: string;
  hash: string;
  previousHash: string;
  data: {
    // Observation fields
    claim?: { statement: string; category: string };
    confidence?: number;
    // Verification fields
    summary?: { passed: boolean; rulesApplied: number; rulesPassed: number };
    evidencePath?: EvidenceStep[];
    // Attestation fields
    verified?: boolean;
    signature?: string;
    signingAlgorithm?: string;
    attestedAt?: string;
  };
}

interface Metrics {
  totalObservations: number;
  totalVerifications: number;
  totalAttestations: number;
  successRate: number;
  systemConfidence: number;
}

interface MoodData {
  state: string;
  confidence: number;
  uncertainty: number;
  verificationHealth: number;
  evidenceQuality: number;
  errorRate: number;
  dissentCount: number;
  description: string;
  evaluatedAt: string;
}

interface FrictionItem {
  id: string;
  category: string;
  source: string;
  description: string;
  severity: string;
  status: string;
  recordedAt: string;
}

interface DissentItem {
  id: string;
  claimId: string;
  status: string;
  recordedAt: string;
  interpretations: { position: string; source: string; confidence: number }[];
}

interface GreenData {
  isGreen: boolean;
  allChecksPassed: boolean;
  evidenceExists: boolean;
  lineageExists: boolean;
  attestationExists: boolean;
  noCriticalFailures: boolean;
  reason: string;
  evaluatedAt: string;
}

interface GovernanceData {
  rules: {
    id: string;
    action: string;
    requiresHumanApproval: boolean;
    minimumConfidenceThreshold: number;
    maximumRiskThreshold: number;
    active: boolean;
  }[];
  failClosed: boolean;
}

interface LearningData {
  insights: { description: string; confidence: number; learnedAt: string }[];
  historyCount: number;
}

interface ScheduledRun {
  runIndex: number;
  scheduledAt: string;
  completedAt: string;
  passed: boolean;
  confidence: number;
  attestationId: string;
}

interface SchedulerData {
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED';
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  startedAt: string | null;
  history: ScheduledRun[];
}

interface SLOData {
  targetPassRate: number;
  actualPassRate: number;
  errorBudgetRemaining: number;
  isHealthy: boolean;
  totalVerifications: number;
  evaluatedAt: string;
}

interface Tenant {
  id: string;
  name: string;
  tier: 'FREE' | 'PRO' | 'ENTERPRISE';
  quotaPerMinute: number;
  active: boolean;
  createdAt: string;
}

interface ReplaySnapshotItem {
  id: string;
  label: string;
  claim: string;
  fingerprint: string;
  capturedAt: string;
  tags: string[];
  status: string;
}

interface ReplaySummaryData {
  totalSnapshots: number;
  totalReplays: number;
  uniqueClaims: number;
  tags: string[];
}

interface FormalContractItem {
  id: string;
  name: string;
  version: string;
  category: string;
  description: string;
  fields: Record<
    string,
    { type: string; required?: boolean; min?: number; max?: number; enum?: (string | number)[] }
  >;
  invariants: { name: string; kind: string; description: string; expression: string }[];
  active: boolean;
}

interface DIDIdentityItem {
  did: string;
  type: 'AGENT' | 'VERIFIER' | 'HUMAN' | 'SERVICE' | 'SYSTEM';
  publicKey: string;
  capabilities: string[];
  createdAt: string;
  revoked: boolean;
  epoch: number;
}

interface MeshPeerItem {
  nodeId: string;
  clusterName: string;
  endpoint: string;
  publicKey: string;
  trustScore: number;
  status: 'ONLINE' | 'PEERED' | 'UNREACHABLE' | 'REVOKED';
  lastSeen: string;
}

interface MeshSummaryData {
  clusterId: string;
  totalPeers: number;
  activePeers: number;
  totalProofsExchanged: number;
  avgTrustScore: number;
}

interface BenchmarkResultItem {
  testName: string;
  iterations: number;
  totalDurationMs: number;
  throughputOpsSec: number;
  latency: {
    minMs: number;
    avgMs: number;
    p50Ms: number;
    p90Ms: number;
    p99Ms: number;
    maxMs: number;
  };
  memoryUsageMb: number;
  timestamp: string;
}

interface NotarySealItem {
  sealId: string;
  treeHeight: number;
  leafIndex: number;
  leafHash: string;
  merkleRoot: string;
  timestamp: string;
  notarySignature: string;
}

interface NotarySummaryData {
  treeSize: number;
  merkleRoot: string;
  totalSeals: number;
  lastNotarizedAt: string;
}

interface SandboxStatsData {
  totalRuns: number;
  successfulRuns: number;
  violationsBlocked: number;
  avgExecutionTimeMs: number;
}

interface PolicyRuleItem {
  id: string;
  name: string;
  field: string;
  operator: string;
  value: unknown;
  severity: string;
}

interface PolicyItem {
  id: string;
  name: string;
  domain: string;
  version: string;
  rules: PolicyRuleItem[];
  active: boolean;
}

interface ZKCircuitItem {
  circuitId: string;
  name: string;
  type: string;
  description: string;
  publicParameters: Record<string, unknown>;
}

interface ZKProofItem {
  proofId: string;
  circuitId: string;
  circuitType: string;
  commitment: string;
  publicInputs: Record<string, unknown>;
  proofToken: string;
  timestamp: string;
}

interface GatewayStatsData {
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  anomaliesDetected: number;
  activeClients: number;
  avgRequestsPerMinute: number;
}

interface AnomalyAlertItem {
  alertId: string;
  clientId: string;
  type: string;
  severity: string;
  description: string;
  detectedAt: string;
}

interface WebhookSubItem {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  maxRetries: number;
}

interface WebhookStatsData {
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalDispatches: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successRate: number;
}

interface OracleFeedItem {
  feedId: string;
  name: string;
  description: string;
  aggregation: string;
  heartbeatMs: number;
  minResponses: number;
  active: boolean;
}

interface OracleReceiptItem {
  receiptId: string;
  feedId: string;
  aggregatedValue: unknown;
  strategyUsed: string;
  participants: number;
  variance: number;
  computedAt: string;
  oracleSignature: string;
}

interface OracleStatsData {
  totalFeeds: number;
  activeFeeds: number;
  totalProviders: number;
  activeProviders: number;
  totalConsensusReceipts: number;
}

interface StateCheckpointItem {
  checkpointId: string;
  label: string;
  epoch: number;
  merkleRoot: string;
  totalEvents: number;
  totalRules: number;
  payloadSize: number;
  sealedAt: string;
  signature: string;
}

interface VaultStatsData {
  totalCheckpoints: number;
  latestEpoch: number;
  totalVaultBytes: number;
  healthy: boolean;
}

interface DisputeCaseItem {
  caseId: string;
  targetEventHash: string;
  claimantDid: string;
  challengerDid: string;
  stakeAmount: number;
  reason: string;
  status: string;
  evidenceCount?: number;
  createdAt: string;
}

interface DisputeStatsData {
  totalCases: number;
  activeChallenges: number;
  upheldCases: number;
  overturnedCases: number;
  dismissedCases: number;
  totalStaked: number;
}

interface WorkerNodeItem {
  workerId: string;
  name: string;
  capabilities: string[];
  maxConcurrency: number;
  activeJobs: number;
  status: string;
  registeredAt: string;
  lastHeartbeatAt: string;
  resourceMetrics: {
    cpuCores: number;
    memoryMb: number;
    avgExecutionTimeMs: number;
    jobsCompleted: number;
    jobsFailed: number;
  };
}

interface BuildJobItem {
  jobId: string;
  name: string;
  requiredCapability: string;
  inputFingerprint: string;
  status: string;
  priority: number;
  assignedWorkerId?: string;
  retries: number;
  maxRetries: number;
  createdAt: string;
  completedAt?: string;
}

interface BuildAttestationItem {
  attestationId: string;
  jobId: string;
  workerId: string;
  inputFingerprint: string;
  outputMerkleRoot: string;
  executionTimeMs: number;
  slsaLevel: string;
  builderSignature: string;
  timestamp: string;
}

interface WorkerStatsData {
  totalWorkers: number;
  onlineWorkers: number;
  busyWorkers: number;
  queuedJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  avgDurationMs: number;
  reproducibilityRate: number;
}

interface PipelineStageItem {
  stageId: string;
  name: string;
  capability: string;
  dependsOn: string[];
  status: string;
  parallelism: number;
  attestations: Array<{ attestationId: string; slsaLevel: string }>;
}

interface PipelineRunItem {
  runId: string;
  name: string;
  version: string;
  triggeredBy: string;
  status: string;
  stages: PipelineStageItem[];
  inputHash: string;
  pipelineSignature?: string;
  durationMs?: number;
  createdAt: string;
}

interface PipelineStatsData {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  rolledBackRuns: number;
  avgDurationMs: number;
  totalStagesExecuted: number;
  totalAttestations: number;
}

interface RuleEfficacy {
  ruleName: string;
  totalExecutions: number;
  passCount: number;
  failCount: number;
  efficacyScore: number;
  avgConfidence: number;
}

interface AnalyticsProposal {
  ruleName: string;
  currentEfficacy: number;
  recommendedAction: string;
  rationale: string;
}

interface AnalyticsData {
  summary: {
    totalEvents: number;
    totalVerifications: number;
    overallPassRate: number;
    avgConfidence: number;
    anomaliesDetected: number;
    ruleEfficacyMap: Record<string, RuleEfficacy>;
    analyzedAt: string;
  };
  proposals: AnalyticsProposal[];
}

const MOOD_ICONS: Record<string, string> = {
  OPTIMAL_FLOW: '🌊',
  HIGH_INTEGRITY: '💎',
  EVIDENCE_SEARCH: '🔍',
  FRICTION_DETECTED: '⚡',
  RECOMPILING: '🔄',
};

const MOOD_COLORS: Record<string, string> = {
  OPTIMAL_FLOW: '#38b2ac',
  HIGH_INTEGRITY: '#9f7aea',
  EVIDENCE_SEARCH: '#ed8936',
  FRICTION_DETECTED: '#fc8181',
  RECOMPILING: '#63b3ed',
};

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = 'http://localhost:3000';
const POLL_INTERVAL = 3000;

// ─── Components ───────────────────────────────────────────────────────────────

function EntryIcon({ type, data }: { type: string; data: LogEntry['data'] }) {
  if (type === 'OBSERVATION') return <div className="entry-icon observation">👁</div>;
  if (type === 'VERIFICATION')
    return (
      <div
        className={`entry-icon ${data.summary?.passed ? 'verification-pass' : 'verification-fail'}`}
      >
        {data.summary?.passed ? '✓' : '✗'}
      </div>
    );
  return <div className="entry-icon attestation">🔏</div>;
}

function TimelineEntry({ entry }: { entry: LogEntry }) {
  const time = new Date(entry.recordedAt).toLocaleTimeString();
  const isFailed = entry.type === 'VERIFICATION' && !entry.data.summary?.passed;

  return (
    <div className="timeline-entry">
      <EntryIcon type={entry.type} data={entry.data} />
      <div className="entry-body">
        <div className="entry-header">
          <span className={`entry-type ${entry.type}${isFailed ? ' failed' : ''}`}>
            {entry.type}
          </span>
          <span className="entry-id">#{entry.id}</span>
          <span className="entry-timestamp">{time}</span>
        </div>

        {entry.type === 'OBSERVATION' && entry.data.claim && (
          <>
            <div className="entry-claim">{entry.data.claim.statement}</div>
            <div className="entry-details">
              <span className="entry-detail">
                <strong>Category:</strong> {entry.data.claim.category}
              </span>
              <span className="entry-detail">
                <strong>Confidence:</strong> {((entry.data.confidence ?? 0) * 100).toFixed(0)}%
              </span>
            </div>
          </>
        )}

        {entry.type === 'VERIFICATION' && entry.data.summary && (
          <>
            <div className="entry-claim">
              {entry.data.summary.passed ? 'Verification PASSED' : 'Verification FAILED'}
            </div>
            <div className="entry-details">
              <span className="entry-detail">
                <strong>Rules:</strong> {entry.data.summary.rulesPassed}/
                {entry.data.summary.rulesApplied} passed
              </span>
            </div>
            {entry.data.evidencePath && (
              <div className="evidence-pills">
                {entry.data.evidencePath.map((s: EvidenceStep, i: number) => (
                  <span key={i} className={`evidence-pill ${s.passed ? 'pass' : 'fail'}`}>
                    {s.passed ? '✓' : '✗'} {s.rule}
                  </span>
                ))}
              </div>
            )}
          </>
        )}

        {entry.type === 'ATTESTATION' && (
          <>
            <div className="entry-claim">
              {entry.data.verified ? 'Attested & Signed' : 'Attestation Rejected'}
            </div>
            <div className="entry-details">
              <span className="entry-detail">
                <strong>Algorithm:</strong> {entry.data.signingAlgorithm}
              </span>
            </div>
            {entry.data.signature && <span className="signature-chip">{entry.data.signature}</span>}
          </>
        )}

        <div className="entry-detail" style={{ marginTop: 4 }}>
          <strong>Hash:</strong>&nbsp;
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.68rem',
              color: '#475569',
            }}
          >
            {entry.hash.slice(0, 18)}…
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export function App(): JSX.Element {
  const [claim, setClaim] = useState('Ω∞v Oceanicos core loop is operational');
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [chainIntegrity, setChainIntegrity] = useState<{ valid: boolean } | null>(null);
  const [apiOnline, setApiOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mood, setMood] = useState<MoodData | null>(null);
  const [frictionList, setFrictionList] = useState<FrictionItem[]>([]);
  const [dissentList, setDissentList] = useState<DissentItem[]>([]);
  const [greenState, setGreenState] = useState<GreenData | null>(null);
  const [governanceData, setGovernanceData] = useState<GovernanceData | null>(null);
  const [learningData, setLearningData] = useState<LearningData | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [schedulerData, setSchedulerData] = useState<SchedulerData | null>(null);
  const [schedulerActionLoading, setSchedulerActionLoading] = useState(false);
  const [sloData, setSloData] = useState<SLOData | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [replaySnapshots, setReplaySnapshots] = useState<ReplaySnapshotItem[]>([]);
  const [replaySummary, setReplaySummary] = useState<ReplaySummaryData | null>(null);
  const [replayLoading, setReplayLoading] = useState(false);
  const [vaasTenantName, setVaasTenantName] = useState('');
  const [vaasTenantTier, setVaasTenantTier] = useState<'FREE' | 'PRO' | 'ENTERPRISE'>('PRO');
  const [vaasCreatedCreds, setVaasCreatedCreds] = useState<{
    apiKey: string;
    tenant: Tenant;
  } | null>(null);
  const [contracts, setContracts] = useState<FormalContractItem[]>([]);
  const [selectedContractName, setSelectedContractName] = useState<string>(
    'canonical-observation-contract'
  );
  const [contractTestResult, setContractTestResult] = useState<{
    valid: boolean;
    contractName: string;
    violations: { field?: string; invariant?: string; message: string }[];
  } | null>(null);
  const [contractTestLoading, setContractTestLoading] = useState(false);
  const [identities, setIdentities] = useState<DIDIdentityItem[]>([]);
  const [newIdentityType, setNewIdentityType] = useState<
    'AGENT' | 'VERIFIER' | 'HUMAN' | 'SERVICE'
  >('AGENT');
  const [createdIdentity, setCreatedIdentity] = useState<{
    did: string;
    secret: string;
    token?: string;
  } | null>(null);
  const [meshPeers, setMeshPeers] = useState<MeshPeerItem[]>([]);
  const [meshSummary, setMeshSummary] = useState<MeshSummaryData | null>(null);
  const [meshExporting, setMeshExporting] = useState(false);
  const [exportedProof, setExportedProof] = useState<{
    proofId: string;
    originCluster: string;
    verificationMerkleRoot: string;
    attestationSignature: string;
  } | null>(null);
  const [benchmarks, setBenchmarks] = useState<Record<string, BenchmarkResultItem> | null>(null);
  const [runningBenchmark, setRunningBenchmark] = useState(false);
  const [notarySummary, setNotarySummary] = useState<NotarySummaryData | null>(null);
  const [notarySeals, setNotarySeals] = useState<NotarySealItem[]>([]);
  const [anchoringNotary, setAnchoringNotary] = useState(false);
  const [verifiedInclusionProof, setVerifiedInclusionProof] = useState<boolean | null>(null);
  const [sandboxStats, setSandboxStats] = useState<SandboxStatsData | null>(null);
  const [sandboxCode, setSandboxCode] = useState('responseTime < 100 && statusCode === 200');
  const [sandboxResult, setSandboxResult] = useState<{
    success: boolean;
    result: unknown;
    executionTimeMs: number;
    gasConsumed: number;
    error?: string;
    violation?: string;
  } | null>(null);
  const [sandboxExecuting, setSandboxExecuting] = useState(false);
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState('enterprise-sla-policy');
  const [policyReceipt, setPolicyReceipt] = useState<{
    receiptId: string;
    policyName: string;
    compliant: boolean;
    passedRules: number;
    failedRules: number;
    ruleResults: Array<{
      name: string;
      field: string;
      operator: string;
      passed: boolean;
      reason?: string;
    }>;
    signature: string;
  } | null>(null);
  const [evaluatingPolicy, setEvaluatingPolicy] = useState(false);
  const [zkCircuits, setZkCircuits] = useState<ZKCircuitItem[]>([]);
  const [selectedZKCircuit, setSelectedZKCircuit] = useState('circuit-confidence-range');
  const [zkWitness, setZkWitness] = useState('0.96');
  const [generatedProof, setGeneratedProof] = useState<ZKProofItem | null>(null);
  const [zkVerified, setZkVerified] = useState<boolean | null>(null);
  const [provingZK, setProvingZK] = useState(false);
  const [gatewayStats, setGatewayStats] = useState<GatewayStatsData | null>(null);
  const [gatewayAnomalies, setGatewayAnomalies] = useState<AnomalyAlertItem[]>([]);
  const [testingGateway, setTestingGateway] = useState(false);
  const [gatewayResult, setGatewayResult] = useState<string | null>(null);
  const [webhooks, setWebhooks] = useState<WebhookSubItem[]>([]);
  const [webhookStats, setWebhookStats] = useState<WebhookStatsData | null>(null);
  const [triggeringWebhook, setTriggeringWebhook] = useState(false);
  const [webhookResult, setWebhookResult] = useState<string | null>(null);
  const [oracleFeeds, setOracleFeeds] = useState<OracleFeedItem[]>([]);
  const [oracleReceipts, setOracleReceipts] = useState<OracleReceiptItem[]>([]);
  const [oracleStats, setOracleStats] = useState<OracleStatsData | null>(null);
  const [aggregatingOracle, setAggregatingOracle] = useState(false);
  const [oracleResult, setOracleResult] = useState<string | null>(null);
  const [checkpoints, setCheckpoints] = useState<StateCheckpointItem[]>([]);
  const [vaultStats, setVaultStats] = useState<VaultStatsData | null>(null);
  const [creatingCheckpoint, setCreatingCheckpoint] = useState(false);
  const [vaultResult, setVaultResult] = useState<string | null>(null);
  const [disputes, setDisputes] = useState<DisputeCaseItem[]>([]);
  const [disputeStats, setDisputeStats] = useState<DisputeStatsData | null>(null);
  const [raisingDispute, setRaisingDispute] = useState(false);
  const [disputeResult, setDisputeResult] = useState<string | null>(null);
  const [workers, setWorkers] = useState<WorkerNodeItem[]>([]);
  const [workerJobs, setWorkerJobs] = useState<BuildJobItem[]>([]);
  const [workerAttestations, setWorkerAttestations] = useState<BuildAttestationItem[]>([]);
  const [workerStats, setWorkerStats] = useState<WorkerStatsData | null>(null);
  const [workerJobName, setWorkerJobName] = useState('Reproducible Oceanicum WASM Compilation');
  const [workerJobCap, setWorkerJobCap] = useState('COMPILE');
  const [submittingWorkerJob, setSubmittingWorkerJob] = useState(false);
  const [workerResult, setWorkerResult] = useState<string | null>(null);
  const [pipelines, setPipelines] = useState<PipelineRunItem[]>([]);
  const [pipelineStats, setPipelineStats] = useState<PipelineStatsData | null>(null);
  const [pipelineName, setPipelineName] = useState('Production Core Release Pipeline');
  const [pipelineVersion, setPipelineVersion] = useState('6.2.0');
  const [executingPipeline, setExecutingPipeline] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<string | null>(null);

  // ── Poll log + metrics ──
  const fetchState = useCallback(async () => {
    try {
      const [
        logRes,
        metricsRes,
        moodRes,
        frictionRes,
        dissentRes,
        greenRes,
        govRes,
        learnRes,
        analyticsRes,
        schedulerRes,
        sloRes,
        vaasRes,
        replayRes,
        contractsRes,
        authRes,
        fedRes,
        benchRes,
        notarySumRes,
        notarySealsRes,
        sandRes,
        polRes,
        zkRes,
        gwStatsRes,
        gwAnomRes,
        whRes,
        orcFeedsRes,
        orcRecRes,
        vaultRes,
        dispRes,
        workersRes,
        wJobsRes,
        wAttRes,
        wStatsRes,
        pipeRes,
        pipeStatsRes,
      ] = await Promise.all([
        fetch(`${API_BASE}/log?limit=30`),
        fetch(`${API_BASE}/metrics`),
        fetch(`${API_BASE}/mood`),
        fetch(`${API_BASE}/friction`),
        fetch(`${API_BASE}/dissent`),
        fetch(`${API_BASE}/green`),
        fetch(`${API_BASE}/governance`),
        fetch(`${API_BASE}/learning`),
        fetch(`${API_BASE}/analytics`),
        fetch(`${API_BASE}/scheduler`),
        fetch(`${API_BASE}/telemetry/slo`),
        fetch(`${API_BASE}/vaas/tenants`),
        fetch(`${API_BASE}/replay`),
        fetch(`${API_BASE}/contracts`),
        fetch(`${API_BASE}/auth/identities`),
        fetch(`${API_BASE}/federation/peers`),
        fetch(`${API_BASE}/benchmark`),
        fetch(`${API_BASE}/notary/summary`),
        fetch(`${API_BASE}/notary/seals`),
        fetch(`${API_BASE}/sandbox/stats`),
        fetch(`${API_BASE}/policies`),
        fetch(`${API_BASE}/zk/circuits`),
        fetch(`${API_BASE}/gateway/stats`),
        fetch(`${API_BASE}/gateway/anomalies`),
        fetch(`${API_BASE}/webhooks`),
        fetch(`${API_BASE}/oracle/feeds`),
        fetch(`${API_BASE}/oracle/receipts`),
        fetch(`${API_BASE}/vault/checkpoints`),
        fetch(`${API_BASE}/disputes`),
        fetch(`${API_BASE}/workers`),
        fetch(`${API_BASE}/workers/jobs`),
        fetch(`${API_BASE}/workers/attestations`),
        fetch(`${API_BASE}/workers/stats`),
        fetch(`${API_BASE}/pipelines`),
        fetch(`${API_BASE}/pipelines/stats`),
      ]);
      if (!logRes.ok || !metricsRes.ok) throw new Error('API error');

      const logData = await logRes.json();
      const metricsData = await metricsRes.json();

      // Reverse so newest is on top
      setLog([...(logData.data.events as LogEntry[])].reverse());
      setMetrics(metricsData.data.metrics as Metrics);
      setChainIntegrity(logData.data.integrity);
      setApiOnline(true);
      setError(null);

      if (moodRes.ok) setMood((await moodRes.json()).data as MoodData);
      if (frictionRes.ok) setFrictionList((await frictionRes.json()).data.events as FrictionItem[]);
      if (dissentRes.ok) setDissentList((await dissentRes.json()).data.records as DissentItem[]);
      if (greenRes.ok) setGreenState((await greenRes.json()).data as GreenData);
      if (govRes.ok) setGovernanceData((await govRes.json()).data as GovernanceData);
      if (learnRes.ok) setLearningData((await learnRes.json()).data as LearningData);
      if (analyticsRes.ok) setAnalyticsData((await analyticsRes.json()).data as AnalyticsData);
      if (schedulerRes.ok) setSchedulerData((await schedulerRes.json()).data as SchedulerData);
      if (sloRes.ok) setSloData((await sloRes.json()).data as SLOData);
      if (vaasRes.ok) setTenants((await vaasRes.json()).data.tenants as Tenant[]);
      if (replayRes.ok) {
        const rData = (await replayRes.json()).data;
        setReplaySnapshots(rData.snapshots as ReplaySnapshotItem[]);
        setReplaySummary(rData.summary as ReplaySummaryData);
      }
      if (contractsRes.ok) {
        setContracts((await contractsRes.json()).data.contracts as FormalContractItem[]);
      }
      if (authRes.ok) {
        setIdentities((await authRes.json()).data.identities as DIDIdentityItem[]);
      }
      if (fedRes.ok) {
        const fData = (await fedRes.json()).data;
        setMeshPeers(fData.peers as MeshPeerItem[]);
        setMeshSummary(fData.summary as MeshSummaryData);
      }
      if (benchRes.ok) {
        const bData = (await benchRes.json()).data;
        setBenchmarks(bData.results as Record<string, BenchmarkResultItem>);
      }
      if (notarySumRes.ok) {
        setNotarySummary((await notarySumRes.json()).data as NotarySummaryData);
      }
      if (notarySealsRes.ok) {
        setNotarySeals((await notarySealsRes.json()).data.seals as NotarySealItem[]);
      }
      if (sandRes.ok) {
        setSandboxStats((await sandRes.json()).data as SandboxStatsData);
      }
      if (polRes.ok) {
        setPolicies((await polRes.json()).data.policies as PolicyItem[]);
      }
      if (zkRes.ok) {
        setZkCircuits((await zkRes.json()).data.circuits as ZKCircuitItem[]);
      }
      if (gwStatsRes && gwStatsRes.ok) {
        setGatewayStats((await gwStatsRes.json()).data as GatewayStatsData);
      }
      if (gwAnomRes && gwAnomRes.ok) {
        setGatewayAnomalies((await gwAnomRes.json()).data.anomalies as AnomalyAlertItem[]);
      }
      if (whRes && whRes.ok) {
        const whData = (await whRes.json()).data;
        setWebhooks(whData.subscriptions as WebhookSubItem[]);
        setWebhookStats(whData.stats as WebhookStatsData);
      }
      if (orcFeedsRes && orcFeedsRes.ok) {
        const oData = (await orcFeedsRes.json()).data;
        setOracleFeeds(oData.feeds as OracleFeedItem[]);
        setOracleStats(oData.stats as OracleStatsData);
      }
      if (orcRecRes && orcRecRes.ok) {
        setOracleReceipts((await orcRecRes.json()).data.receipts as OracleReceiptItem[]);
      }
      if (vaultRes && vaultRes.ok) {
        const vData = (await vaultRes.json()).data;
        setCheckpoints(vData.checkpoints as StateCheckpointItem[]);
        setVaultStats(vData.stats as VaultStatsData);
      }
      if (dispRes && dispRes.ok) {
        const dData = (await dispRes.json()).data;
        setDisputes(dData.cases as DisputeCaseItem[]);
        setDisputeStats(dData.stats as DisputeStatsData);
      }
      if (workersRes && workersRes.ok) {
        setWorkers((await workersRes.json()).data as WorkerNodeItem[]);
      }
      if (wJobsRes && wJobsRes.ok) {
        setWorkerJobs((await wJobsRes.json()).data as BuildJobItem[]);
      }
      if (wAttRes && wAttRes.ok) {
        setWorkerAttestations((await wAttRes.json()).data as BuildAttestationItem[]);
      }
      if (wStatsRes && wStatsRes.ok) {
        setWorkerStats((await wStatsRes.json()).data as WorkerStatsData);
      }
      if (pipeRes && pipeRes.ok) {
        setPipelines((await pipeRes.json()).data as PipelineRunItem[]);
      }
      if (pipeStatsRes && pipeStatsRes.ok) {
        setPipelineStats((await pipeStatsRes.json()).data as PipelineStatsData);
      }
    } catch {
      setApiOnline(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
    const id = setInterval(fetchState, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchState]);

  // ── Execute loop ──
  const [swarmLoading, setSwarmLoading] = useState(false);
  const [swarmResult, setSwarmResult] = useState<any | null>(null);

  const runLoop = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/complete-loop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim,
          category: 'health-check',
          source: { system: 'web-dashboard', version: '0.1.0', environment: 'production' },
          observedBy: 'user',
          metadata: { statusCode: 200, responseTime: Math.round(20 + Math.random() * 60) },
          confidence: 0.97,
          confidenceReason: 'Manual verification via dashboard',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach API');
    } finally {
      setLoading(false);
    }
  };

  const runSwarm = async () => {
    setSwarmLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/swarm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim,
          ruleName: 'dashboard-swarm-rule',
          ruleDefinition: 'responseTime < 100',
          metadata: { responseTime: Math.round(15 + Math.random() * 40) },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSwarmResult(data.data);
      await fetchState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute Swarm');
    } finally {
      setSwarmLoading(false);
    }
  };

  const successPct = metrics ? (metrics.successRate * 100).toFixed(0) : '—';
  const confPct = metrics ? (metrics.systemConfidence * 100).toFixed(0) : '—';

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-brand">
          <div>
            <div className="header-logo">Ω∞v Oceanicos</div>
            <div className="header-subtitle">Verification-First Intelligence Platform</div>
          </div>
        </div>
        <div className="header-status">
          <span
            className={`status-dot${apiOnline ? '' : ' offline'}`}
            style={!apiOnline ? { background: '#fc8181', boxShadow: '0 0 8px #fc8181' } : {}}
          />
          {apiOnline ? 'API Online' : 'API Offline'}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="main">
        {/* Control Panel */}
        <aside className="panel">
          <div>
            <div className="panel-title">Verification Loop</div>
            <div className="loop-indicator" style={{ marginTop: 12 }}>
              <div>Observe</div>
              <div className="arrow"> ↓</div>
              <div>Verify</div>
              <div className="arrow"> ↓</div>
              <div>Attest</div>
              <div className="arrow"> ↓</div>
              <div>Record</div>
              <div className="arrow"> ↓</div>
              <div>Learn → ∞</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="claim-input">
              Claim to Observe
            </label>
            <input
              id="claim-input"
              className="form-input"
              type="text"
              value={claim}
              onChange={(e) => setClaim(e.target.value)}
              placeholder="Enter a claim to verify…"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              id="run-loop-btn"
              className={`btn-run${loading ? ' running' : ''}`}
              onClick={runLoop}
              disabled={loading || swarmLoading || !apiOnline || !claim.trim()}
            >
              {loading ? '⟳  Executing Loop…' : '▶  Run Single Verification'}
            </button>

            <button
              id="run-swarm-btn"
              className={`btn-run${swarmLoading ? ' running' : ''}`}
              style={{ background: 'linear-gradient(135deg, var(--accent-secondary), #805ad5)' }}
              onClick={runSwarm}
              disabled={loading || swarmLoading || !apiOnline || !claim.trim()}
            >
              {swarmLoading ? '⚡ Executing 5-Agent Swarm…' : '🐝 Run Formless Swarm (5-Agent)'}
            </button>
          </div>

          {error && (
            <div
              style={{
                fontSize: '0.8rem',
                color: 'var(--accent-red)',
                padding: '10px 14px',
                background: 'rgba(252,129,129,0.06)',
                border: '1px solid rgba(252,129,129,0.2)',
                borderRadius: 8,
              }}
            >
              ✗ {error}
            </div>
          )}

          {chainIntegrity && (
            <div className="integrity-bar">
              <span className="dot" />
              Chain integrity: {chainIntegrity.valid ? 'VALID' : 'BROKEN'}
            </div>
          )}
        </aside>

        {/* Right Column */}
        <section>
          {/* Metrics */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Observations</div>
              <div className="metric-value">{metrics?.totalObservations ?? '—'}</div>
              <div className="metric-sub">Total captured</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Verifications</div>
              <div className="metric-value">{metrics?.totalVerifications ?? '—'}</div>
              <div className="metric-sub">Rules executed</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Success Rate</div>
              <div className="metric-value">{successPct}%</div>
              <div className="metric-sub">Passed verifications</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Confidence</div>
              <div className="metric-value">{confPct}%</div>
              <div className="metric-sub">System confidence</div>
            </div>
          </div>

          {/* ── Mood Indicator (Pillar 19) ── */}
          {mood && (
            <div
              className="mood-card"
              style={{ borderColor: MOOD_COLORS[mood.state] || '#38b2ac' }}
            >
              <div className="mood-header">
                <span className="mood-icon">{MOOD_ICONS[mood.state] || '💧'}</span>
                <span
                  className="mood-state"
                  style={{ color: MOOD_COLORS[mood.state] || '#38b2ac' }}
                >
                  {mood.state.replace(/_/g, ' ')}
                </span>
                <span className="mood-confidence">
                  {(mood.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>
              <div className="mood-desc">{mood.description}</div>
              <div className="mood-dims">
                <span>Health: {(mood.verificationHealth * 100).toFixed(0)}%</span>
                <span>Evidence: {(mood.evidenceQuality * 100).toFixed(0)}%</span>
                <span>Error: {(mood.errorRate * 100).toFixed(1)}%</span>
                <span>Uncertainty: {(mood.uncertainty * 100).toFixed(0)}%</span>
                {mood.dissentCount > 0 && (
                  <span style={{ color: '#ed8936' }}>Dissent: {mood.dissentCount}</span>
                )}
              </div>
            </div>
          )}

          {/* ── Telemetry SLO & Error Budget (Phase 14) ── */}
          {sloData && (
            <div
              style={{
                background: sloData.isHealthy
                  ? 'rgba(56, 178, 172, 0.06)'
                  : 'rgba(245, 101, 101, 0.06)',
                border: `1px solid ${sloData.isHealthy ? 'rgba(56, 178, 172, 0.3)' : 'rgba(245, 101, 101, 0.3)'}`,
                borderRadius: 'var(--radius)',
                padding: '14px 18px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.2rem' }}>{sloData.isHealthy ? '🎯' : '⚠️'}</span>
                <div>
                  <div
                    style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}
                  >
                    Verification SLO: {sloData.isHealthy ? 'HEALTHY' : 'DEGRADED'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Target: {(sloData.targetPassRate * 100).toFixed(0)}% · Actual:{' '}
                    {(sloData.actualPassRate * 100).toFixed(1)}% · Total:{' '}
                    {sloData.totalVerifications}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: '0.68rem',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Error Budget
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: sloData.isHealthy ? 'var(--accent-green)' : 'var(--accent-red)',
                    }}
                  >
                    {(sloData.errorBudgetRemaining * 100).toFixed(0)}% remaining
                  </div>
                </div>
                <div
                  style={{
                    width: 60,
                    height: 8,
                    background: 'var(--bg-surface)',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${sloData.errorBudgetRemaining * 100}%`,
                      height: '100%',
                      background: sloData.isHealthy ? 'var(--accent-green)' : 'var(--accent-red)',
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── GREEN Rule Evaluation Banner (Pillar 25) ── */}
          {greenState && (
            <div
              style={{
                background: greenState.isGreen
                  ? 'rgba(56, 178, 172, 0.08)'
                  : 'rgba(237, 137, 54, 0.08)',
                border: `1px solid ${greenState.isGreen ? 'var(--accent-green)' : 'var(--accent-amber)'}`,
                borderRadius: 'var(--radius)',
                padding: 16,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: greenState.isGreen ? 'var(--accent-green)' : 'var(--accent-amber)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span>
                    {greenState.isGreen
                      ? '🟢 SYSTEM STATE: GREEN (Pillar 25 Verified)'
                      : '🟠 SYSTEM STATE: UNVERIFIED / INITIALIZING'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  {greenState.reason}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <span
                  style={{
                    padding: '4px 8px',
                    background: greenState.allChecksPassed
                      ? 'rgba(56, 178, 172, 0.2)'
                      : 'rgba(237, 137, 54, 0.2)',
                    borderRadius: 4,
                  }}
                >
                  Checks: {greenState.allChecksPassed ? 'PASS' : 'PENDING'}
                </span>
                <span
                  style={{
                    padding: '4px 8px',
                    background: greenState.lineageExists
                      ? 'rgba(56, 178, 172, 0.2)'
                      : 'rgba(237, 137, 54, 0.2)',
                    borderRadius: 4,
                  }}
                >
                  Lineage: {greenState.lineageExists ? 'INTACT' : 'BROKEN'}
                </span>
                <span
                  style={{
                    padding: '4px 8px',
                    background: greenState.attestationExists
                      ? 'rgba(56, 178, 172, 0.2)'
                      : 'rgba(237, 137, 54, 0.2)',
                    borderRadius: 4,
                  }}
                >
                  Attest: {greenState.attestationExists ? 'SIGNED' : 'MISSING'}
                </span>
              </div>
            </div>
          )}

          {/* ── Governance & Learning Engines (Pillars 26 & 29) ── */}
          {(governanceData || learningData) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 16,
                marginBottom: 24,
              }}
            >
              {governanceData && (
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: 'var(--text-primary)',
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>⚖ Governance Engine (Pillar 29)</span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        background: 'rgba(99, 179, 237, 0.15)',
                        color: '#63b3ed',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                    >
                      FAIL-CLOSED
                    </span>
                  </div>
                  {governanceData.rules.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        fontSize: '0.78rem',
                        borderBottom: '1px solid var(--border-subtle)',
                        padding: '6px 0',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>
                        <strong>{r.action}</strong> (
                        {r.requiresHumanApproval ? 'Human Required' : 'Auto'})
                      </span>
                      <span style={{ color: 'var(--accent-green)' }}>Active</span>
                    </div>
                  ))}
                </div>
              )}

              {learningData && (
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: 'var(--text-primary)',
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>🧠 Learning Engine (Pillar 26)</span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        background: 'rgba(159, 122, 234, 0.15)',
                        color: '#9f7aea',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                    >
                      CLOSED-LOOP
                    </span>
                  </div>
                  {learningData.insights.map((ins, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: '0.78rem',
                        padding: '4px 0',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      💡 {ins.description}{' '}
                      <span style={{ color: 'var(--accent-green)' }}>
                        ({(ins.confidence * 100).toFixed(0)}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {swarmResult && (
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--accent-secondary)',
                borderRadius: 'var(--radius)',
                padding: 20,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 14,
                }}
              >
                <span
                  style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--accent-secondary)' }}
                >
                  🐝 Formless Swarm Execution Complete ({swarmResult.agentResults.length} Agents
                  Verified)
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    background: 'rgba(159, 122, 234, 0.15)',
                    color: 'var(--accent-secondary)',
                    padding: '4px 8px',
                    borderRadius: 6,
                  }}
                >
                  {swarmResult.fullLoopResult.attestation.signature.slice(0, 20)}…
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: 10,
                }}
              >
                {swarmResult.agentResults.map((agent: any, idx: number) => {
                  const roleIcons: Record<string, string> = {
                    Observer: '👁',
                    Verifier: '⚡',
                    Security: '🛡',
                    Governance: '⚖',
                    Learning: '🧠',
                    Human: '👤',
                  };
                  return (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: 12,
                      }}
                    >
                      <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>
                        {roleIcons[agent.agentRole] || '🤖'}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        {agent.agentRole} Agent
                      </div>
                      <div
                        style={{ fontSize: '0.72rem', color: 'var(--accent-green)', marginTop: 4 }}
                      >
                        ✓ {agent.action}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Autonomous Scheduler Control Panel (Phase 13) ── */}
          {schedulerData &&
            (() => {
              const statusColors: Record<string, string> = {
                IDLE: 'var(--text-muted)',
                RUNNING: 'var(--accent-green)',
                PAUSED: 'var(--accent-amber)',
                STOPPED: 'var(--accent-red)',
              };
              const statusIcons: Record<string, string> = {
                IDLE: '○',
                RUNNING: '▶',
                PAUSED: '⏸',
                STOPPED: '■',
              };
              const doSchedulerAction = async (action: string, body?: object) => {
                setSchedulerActionLoading(true);
                try {
                  await fetch(`${API_BASE}/scheduler/${action}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: body ? JSON.stringify(body) : undefined,
                  });
                  await fetchState();
                } finally {
                  setSchedulerActionLoading(false);
                }
              };
              const passRate =
                schedulerData.totalRuns > 0
                  ? ((schedulerData.passedRuns / schedulerData.totalRuns) * 100).toFixed(0)
                  : '—';

              return (
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: `1px solid ${statusColors[schedulerData.status]}44`,
                    borderRadius: 'var(--radius)',
                    padding: 20,
                    marginBottom: 24,
                  }}
                >
                  {/* Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <span>⏱ Autonomous Scheduler</span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: statusColors[schedulerData.status],
                          background: `${statusColors[schedulerData.status]}18`,
                          padding: '2px 8px',
                          borderRadius: 4,
                          letterSpacing: '0.06em',
                        }}
                      >
                        {statusIcons[schedulerData.status]} {schedulerData.status}
                      </span>
                    </div>
                    {/* Control buttons */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(schedulerData.status === 'IDLE' || schedulerData.status === 'STOPPED') && (
                        <button
                          id="scheduler-start-btn"
                          onClick={() => doSchedulerAction('start')}
                          disabled={schedulerActionLoading}
                          style={{
                            background: 'var(--accent-green)',
                            color: '#0f172a',
                            border: 'none',
                            borderRadius: 6,
                            padding: '5px 12px',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                          }}
                        >
                          ▶ Start
                        </button>
                      )}
                      {schedulerData.status === 'RUNNING' && (
                        <button
                          id="scheduler-pause-btn"
                          onClick={() => doSchedulerAction('pause')}
                          disabled={schedulerActionLoading}
                          style={{
                            background: 'var(--accent-amber)',
                            color: '#0f172a',
                            border: 'none',
                            borderRadius: 6,
                            padding: '5px 12px',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                          }}
                        >
                          ⏸ Pause
                        </button>
                      )}
                      {schedulerData.status === 'PAUSED' && (
                        <button
                          id="scheduler-resume-btn"
                          onClick={() => doSchedulerAction('resume')}
                          disabled={schedulerActionLoading}
                          style={{
                            background: 'var(--accent-primary)',
                            color: '#0f172a',
                            border: 'none',
                            borderRadius: 6,
                            padding: '5px 12px',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                          }}
                        >
                          ▶ Resume
                        </button>
                      )}
                      {(schedulerData.status === 'RUNNING' ||
                        schedulerData.status === 'PAUSED') && (
                        <button
                          id="scheduler-stop-btn"
                          onClick={() => doSchedulerAction('stop')}
                          disabled={schedulerActionLoading}
                          style={{
                            background: 'var(--bg-surface)',
                            color: 'var(--accent-red)',
                            border: '1px solid var(--accent-red)',
                            borderRadius: 6,
                            padding: '5px 12px',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                          }}
                        >
                          ■ Stop
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stats row */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                      gap: 10,
                      marginBottom: 14,
                    }}
                  >
                    {[
                      { label: 'Total Runs', value: schedulerData.totalRuns, icon: '🔄' },
                      { label: 'Passed', value: schedulerData.passedRuns, icon: '✅' },
                      { label: 'Failed', value: schedulerData.failedRuns, icon: '❌' },
                      { label: 'Pass Rate', value: `${passRate}%`, icon: '🎯' },
                    ].map((s) => (
                      <div
                        key={s.label}
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '10px 12px',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: '1rem', marginBottom: 3 }}>{s.icon}</div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: '1rem',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {s.value}
                        </div>
                        <div
                          style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}
                        >
                          {s.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Last / Next run timestamps */}
                  {(schedulerData.lastRunAt || schedulerData.nextRunAt) && (
                    <div
                      style={{
                        display: 'flex',
                        gap: 16,
                        fontSize: '0.72rem',
                        color: 'var(--text-muted)',
                        marginBottom: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      {schedulerData.lastRunAt && (
                        <span>
                          ⏱ Last run:{' '}
                          <strong style={{ color: 'var(--text-secondary)' }}>
                            {new Date(schedulerData.lastRunAt).toLocaleTimeString()}
                          </strong>
                        </span>
                      )}
                      {schedulerData.nextRunAt && (
                        <span>
                          🕐 Next run:{' '}
                          <strong style={{ color: 'var(--accent-primary)' }}>
                            {new Date(schedulerData.nextRunAt).toLocaleTimeString()}
                          </strong>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Run history */}
                  {schedulerData.history.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          marginBottom: 6,
                        }}
                      >
                        Recent Runs
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          maxHeight: 160,
                          overflowY: 'auto',
                        }}
                      >
                        {[...schedulerData.history].reverse().map((r) => (
                          <div
                            key={r.runIndex}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '5px 8px',
                              background: 'var(--bg-surface)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.72rem',
                            }}
                          >
                            <span
                              style={{
                                color: r.passed ? 'var(--accent-green)' : 'var(--accent-red)',
                                fontWeight: 700,
                              }}
                            >
                              {r.passed ? '✓' : '✗'}
                            </span>
                            <span
                              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                            >
                              #{r.runIndex}
                            </span>
                            <span style={{ color: 'var(--text-secondary)', flex: 1 }}>
                              {new Date(r.completedAt).toLocaleTimeString()}
                            </span>
                            <span
                              style={{
                                color: r.passed ? 'var(--accent-green)' : 'var(--accent-amber)',
                              }}
                            >
                              {(r.confidence * 100).toFixed(0)}% conf
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

          {/* ── Rule Efficacy & Analytics Engine (Phase 4) ── */}
          {analyticsData && (
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid rgba(99,179,237,0.3)',
                borderRadius: 'var(--radius)',
                padding: 20,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: 'var(--accent-primary)',
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span>📊 Rule Efficacy & Analytics Engine</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    background: 'rgba(99,179,237,0.12)',
                    color: 'var(--accent-primary)',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  {(analyticsData.summary.overallPassRate * 100).toFixed(0)}% Pass Rate ·{' '}
                  {analyticsData.summary.totalVerifications} Verifications
                </span>
              </div>

              {/* Summary metrics row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                {[
                  { label: 'Total Events', value: analyticsData.summary.totalEvents, icon: '📋' },
                  {
                    label: 'Avg Confidence',
                    value: `${(analyticsData.summary.avgConfidence * 100).toFixed(0)}%`,
                    icon: '🎯',
                  },
                  {
                    label: 'Anomalies',
                    value: analyticsData.summary.anomaliesDetected,
                    icon: '⚠️',
                  },
                  { label: 'Rules Active', value: analyticsData.proposals.length, icon: '📐' },
                ].map((m) => (
                  <div
                    key={m.label}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '1.1rem', marginBottom: 4 }}>{m.icon}</div>
                    <div
                      style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}
                    >
                      {m.value}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {m.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Per-rule efficacy bars */}
              {Object.values(analyticsData.summary.ruleEfficacyMap).length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      marginBottom: 8,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    Per-Rule Efficacy
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {Object.values(analyticsData.summary.ruleEfficacyMap).map((r) => (
                      <div key={r.ruleName}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.74rem',
                            marginBottom: 3,
                          }}
                        >
                          <span
                            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
                          >
                            {r.ruleName}
                          </span>
                          <span
                            style={{
                              color:
                                r.efficacyScore > 0.7
                                  ? 'var(--accent-green)'
                                  : r.efficacyScore > 0.4
                                    ? 'var(--accent-amber)'
                                    : 'var(--accent-red)',
                              fontWeight: 700,
                            }}
                          >
                            {(r.efficacyScore * 100).toFixed(0)}% ({r.passCount}/{r.totalExecutions}
                            )
                          </span>
                        </div>
                        <div
                          style={{
                            background: 'var(--bg-surface)',
                            borderRadius: 4,
                            height: 6,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${r.efficacyScore * 100}%`,
                              height: '100%',
                              background:
                                r.efficacyScore > 0.7
                                  ? 'var(--accent-green)'
                                  : r.efficacyScore > 0.4
                                    ? 'var(--accent-amber)'
                                    : 'var(--accent-red)',
                              borderRadius: 4,
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Adaptation proposals */}
              {analyticsData.proposals.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      marginBottom: 8,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    Adaptation Proposals
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {analyticsData.proposals.map((p) => {
                      const actionColors: Record<string, string> = {
                        MAINTAIN: 'var(--accent-green)',
                        INCREASE_CONFIDENCE_THRESHOLD: 'var(--accent-primary)',
                        REDUCE_STRICTNESS: 'var(--accent-amber)',
                        DEPRECATE: 'var(--accent-red)',
                      };
                      return (
                        <div
                          key={p.ruleName}
                          style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '8px 12px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: actionColors[p.recommendedAction] || 'var(--text-muted)',
                              background: 'rgba(0,0,0,0.2)',
                              padding: '2px 6px',
                              borderRadius: 4,
                              whiteSpace: 'nowrap',
                              marginTop: 1,
                            }}
                          >
                            {p.recommendedAction.replace(/_/g, ' ')}
                          </span>
                          <div>
                            <div
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.75rem',
                                color: 'var(--text-primary)',
                              }}
                            >
                              {p.ruleName}
                            </div>
                            <div
                              style={{
                                fontSize: '0.7rem',
                                color: 'var(--text-muted)',
                                marginTop: 2,
                              }}
                            >
                              {p.rationale}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Friction & Dissent Ledger (Pillars 20-21) ── */}
          {(frictionList.length > 0 || dissentList.length > 0) && (
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: 20,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: 'var(--accent-amber)',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>⚡ Friction & Dissent Ledger (Pillars 20–21)</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    background: 'rgba(237,137,54,0.15)',
                    color: 'var(--accent-amber)',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  {frictionList.length} Friction | {dissentList.length} Dissent
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: 12,
                }}
              >
                {frictionList.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.75rem',
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--accent-red)' }}>
                        ⚡ {f.category}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {f.status}
                      </span>
                    </div>
                    <div
                      style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: 4 }}
                    >
                      {f.description}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Source: {f.source}
                    </div>
                  </div>
                ))}
                {dissentList.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid rgba(159,122,234,0.3)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.75rem',
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--accent-secondary)' }}>
                        ⚖ DISSENT ({d.interpretations.length} Views)
                      </span>
                      <span
                        style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-secondary)' }}
                      >
                        {d.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Claim: {d.claimId}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Multi-Tenant VaaS Gateway (Section XXIX) ── */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(237, 137, 54, 0.3)',
              borderRadius: 'var(--radius)',
              padding: 20,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.95rem',
                color: 'var(--accent-amber)',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>🏢 Verification-as-a-Service (VaaS) Multi-Tenant Gateway</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    background: 'rgba(237, 137, 54, 0.15)',
                    color: 'var(--accent-amber)',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  {tenants.length} Active Tenants
                </span>
              </div>
            </div>

            {/* Tenant Registration Form */}
            <div
              style={{
                display: 'flex',
                gap: 10,
                marginBottom: 14,
                flexWrap: 'wrap',
              }}
            >
              <input
                type="text"
                placeholder="New Tenant / Organization Name..."
                value={vaasTenantName}
                onChange={(e) => setVaasTenantName(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 200,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  fontSize: '0.85rem',
                }}
              />
              <select
                value={vaasTenantTier}
                onChange={(e) => setVaasTenantTier(e.target.value as 'FREE' | 'PRO' | 'ENTERPRISE')}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  fontSize: '0.85rem',
                }}
              >
                <option value="FREE">FREE (60 req/min)</option>
                <option value="PRO">PRO (600 req/min)</option>
                <option value="ENTERPRISE">ENTERPRISE (6000 req/min)</option>
              </select>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                onClick={async () => {
                  if (!vaasTenantName.trim()) return;
                  try {
                    const res = await fetch(`${API_BASE}/vaas/tenants`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: vaasTenantName, tier: vaasTenantTier }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setVaasCreatedCreds(data.data);
                      setVaasTenantName('');
                      await fetchState();
                    }
                  } catch (e) {
                    console.error(e);
                  }
                }}
              >
                + Register Tenant
              </button>
            </div>

            {/* Credential notification if created */}
            {vaasCreatedCreds && (
              <div
                style={{
                  background: 'rgba(56, 178, 172, 0.12)',
                  border: '1px solid var(--accent-green)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  marginBottom: 14,
                  fontSize: '0.78rem',
                }}
              >
                <div style={{ color: 'var(--accent-green)', fontWeight: 700, marginBottom: 4 }}>
                  ✓ Tenant Registered: {vaasCreatedCreds.tenant.name} ({vaasCreatedCreds.tenant.id})
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>
                  API Key:{' '}
                  <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {vaasCreatedCreds.apiKey}
                  </code>
                </div>
              </div>
            )}

            {/* Tenants list */}
            {tenants.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 10,
                }}
              >
                {tenants.map((t) => {
                  const tierColors: Record<string, string> = {
                    FREE: 'var(--text-muted)',
                    PRO: 'var(--accent-primary)',
                    ENTERPRISE: 'var(--accent-secondary)',
                  };
                  return (
                    <div
                      key={t.id}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: 12,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t.name}</span>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            color: tierColors[t.tier] || 'var(--text-muted)',
                            background: 'rgba(0,0,0,0.2)',
                            padding: '2px 6px',
                            borderRadius: 4,
                          }}
                        >
                          {t.tier}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        ID: {t.id}
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-secondary)',
                          marginTop: 4,
                        }}
                      >
                        Quota: {t.quotaPerMinute} req/min
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                No external tenants registered yet. Use form above to provision VaaS access.
              </div>
            )}
          </div>

          {/* ── Verification Replay & Regression Engine (Section XXX) ── */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(159, 122, 234, 0.3)',
              borderRadius: 'var(--radius)',
              padding: 20,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.95rem',
                color: 'var(--accent-secondary)',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>⏪ Verification Replay & Temporal Diff Engine</span>
                {replaySummary && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      background: 'rgba(159, 122, 234, 0.15)',
                      color: 'var(--accent-secondary)',
                      padding: '2px 8px',
                      borderRadius: 4,
                    }}
                  >
                    {replaySummary.totalSnapshots} Snapshots · {replaySummary.totalReplays} Replays
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={replayLoading}
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                onClick={async () => {
                  setReplayLoading(true);
                  try {
                    await fetch(`${API_BASE}/replay/capture`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        claim: claim || 'Web Replay Baseline Snapshot',
                        label: `Snapshot ${replaySnapshots.length + 1}`,
                        tags: ['web-ui'],
                      }),
                    });
                    await fetchState();
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setReplayLoading(false);
                  }
                }}
              >
                📸 Capture Snapshot
              </button>
            </div>

            {replaySnapshots.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {replaySnapshots.slice(0, 5).map((snap) => (
                  <div
                    key={snap.id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {snap.label}
                        </span>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--accent-secondary)',
                            background: 'rgba(159,122,234,0.12)',
                            padding: '1px 6px',
                            borderRadius: 3,
                          }}
                        >
                          {snap.status}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '0.74rem',
                          color: 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        Claim: {snap.claim}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={replayLoading}
                      style={{ padding: '4px 8px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                      onClick={async () => {
                        setReplayLoading(true);
                        try {
                          await fetch(`${API_BASE}/replay/${snap.id}/replay`, {
                            method: 'POST',
                          });
                          await fetchState();
                        } catch (e) {
                          console.error(e);
                        } finally {
                          setReplayLoading(false);
                        }
                      }}
                    >
                      ▶ Replay & Diff
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                No snapshots captured yet. Click "Capture Snapshot" to freeze the current
                verification state.
              </div>
            )}
          </div>

          {/* ── Formal Schema & Behavioral Contract Explorer (Section XXXI) ── */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(56, 178, 172, 0.3)',
              borderRadius: 'var(--radius)',
              padding: 20,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.95rem',
                color: 'var(--accent-green)',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>📜 Formal Schema & Behavioral Contract Registry</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    background: 'rgba(56, 178, 172, 0.15)',
                    color: 'var(--accent-green)',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  {contracts.length} Registered Contracts
                </span>
              </div>
            </div>

            {/* Contract cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 12,
                marginBottom: 16,
              }}
            >
              {contracts.map((c) => (
                <div
                  key={c.id}
                  style={{
                    background: 'var(--bg-surface)',
                    border:
                      selectedContractName === c.name
                        ? '1px solid var(--accent-green)'
                        : '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 14,
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                  }}
                  onClick={() => setSelectedContractName(c.name)}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {c.name}
                    </span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--accent-green)',
                        background: 'rgba(56, 178, 172, 0.12)',
                        padding: '2px 6px',
                        borderRadius: 3,
                      }}
                    >
                      v{c.version}
                    </span>
                  </div>
                  <div
                    style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: 8 }}
                  >
                    {c.description}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span>📐 {Object.keys(c.fields).length} Fields</span>
                    <span>⚖ {c.invariants.length} Invariants</span>
                    <span>🏷 {c.category}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Live Interactive Contract Tester */}
            {contracts.find((c) => c.name === selectedContractName) && (
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 14,
                }}
              >
                {(() => {
                  const contract = contracts.find((c) => c.name === selectedContractName)!;
                  return (
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 10,
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                          }}
                        >
                          Inspect & Test:{' '}
                          <code style={{ color: 'var(--accent-green)' }}>{contract.name}</code>
                        </span>
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={contractTestLoading}
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          onClick={async () => {
                            setContractTestLoading(true);
                            try {
                              const samplePayload =
                                contract.category === 'health-check'
                                  ? { responseTime: 45, statusCode: 200 }
                                  : {
                                      claim: 'Interactive dashboard formal verification claim',
                                      category: 'observation',
                                      observedBy: 'web-dashboard',
                                      confidence: 0.98,
                                    };
                              const res = await fetch(`${API_BASE}/contracts/verify`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  contractIdOrName: contract.name,
                                  data: samplePayload,
                                }),
                              });
                              if (res.ok) {
                                const data = await res.json();
                                setContractTestResult(data.data);
                              }
                            } catch (e) {
                              console.error(e);
                            } finally {
                              setContractTestLoading(false);
                            }
                          }}
                        >
                          🧪 Verify Sample Payload
                        </button>
                      </div>

                      {/* Invariants list */}
                      <div style={{ marginBottom: 10 }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                          }}
                        >
                          Enforced Invariants:
                        </span>
                        <div
                          style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}
                        >
                          {contract.invariants.map((inv) => (
                            <div
                              key={inv.name}
                              style={{
                                fontSize: '0.72rem',
                                color: 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <span
                                style={{
                                  color: 'var(--accent-primary)',
                                  fontFamily: 'var(--font-mono)',
                                }}
                              >
                                [{inv.kind}]
                              </span>
                              <span>{inv.name}:</span>
                              <code
                                style={{
                                  color: 'var(--accent-amber)',
                                  fontFamily: 'var(--font-mono)',
                                }}
                              >
                                {inv.expression}
                              </code>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Test result feedback */}
                      {contractTestResult && contractTestResult.contractName === contract.name && (
                        <div
                          style={{
                            background: contractTestResult.valid
                              ? 'rgba(56, 178, 172, 0.12)'
                              : 'rgba(252, 129, 129, 0.12)',
                            border: `1px solid ${contractTestResult.valid ? 'var(--accent-green)' : 'var(--accent-red)'}`,
                            borderRadius: 'var(--radius-sm)',
                            padding: '8px 12px',
                            fontSize: '0.74rem',
                            marginTop: 8,
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              color: contractTestResult.valid
                                ? 'var(--accent-green)'
                                : 'var(--accent-red)',
                            }}
                          >
                            {contractTestResult.valid
                              ? '✓ Contract Verified (All constraints and invariants passed)'
                              : '✗ Contract Violated'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* ── Decentralized Identity (DID) & Capability Auth Engine (Section XXXII) ── */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(159, 122, 234, 0.3)',
              borderRadius: 'var(--radius)',
              padding: 20,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.95rem',
                color: 'var(--accent-secondary)',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>🔐 Decentralized Identity (DID) & Capability Auth Engine</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    background: 'rgba(159, 122, 234, 0.15)',
                    color: 'var(--accent-secondary)',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  {identities.length} Active DIDs
                </span>
              </div>
            </div>

            {/* Create DID Form */}
            <div
              style={{
                display: 'flex',
                gap: 10,
                marginBottom: 14,
                flexWrap: 'wrap',
              }}
            >
              <select
                value={newIdentityType}
                onChange={(e) =>
                  setNewIdentityType(e.target.value as 'AGENT' | 'VERIFIER' | 'HUMAN' | 'SERVICE')
                }
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  fontSize: '0.85rem',
                }}
              >
                <option value="AGENT">AGENT (observe:write, verify:execute)</option>
                <option value="VERIFIER">VERIFIER (verify:execute, attest:sign)</option>
                <option value="HUMAN">HUMAN (governance:vote, observe:write)</option>
                <option value="SERVICE">SERVICE (observe:write)</option>
              </select>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                onClick={async () => {
                  try {
                    const capabilitiesMap: Record<string, string[]> = {
                      AGENT: ['observe:write', 'verify:execute'],
                      VERIFIER: ['verify:execute', 'attest:sign'],
                      HUMAN: ['governance:vote', 'observe:write'],
                      SERVICE: ['observe:write'],
                    };
                    const res = await fetch(`${API_BASE}/auth/identities`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        type: newIdentityType,
                        capabilities: capabilitiesMap[newIdentityType] || ['observe:write'],
                      }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      // Issue a token automatically
                      const tokenRes = await fetch(`${API_BASE}/auth/token`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          did: data.data.did,
                          secret: data.data.secret,
                        }),
                      });
                      const tokenData = tokenRes.ok
                        ? (await tokenRes.json()).data.token
                        : undefined;
                      setCreatedIdentity({
                        did: data.data.did,
                        secret: data.data.secret,
                        token: tokenData,
                      });
                      await fetchState();
                    }
                  } catch (e) {
                    console.error(e);
                  }
                }}
              >
                + Issue Decentralized Identity (DID)
              </button>
            </div>

            {/* Credential notification */}
            {createdIdentity && (
              <div
                style={{
                  background: 'rgba(159, 122, 234, 0.12)',
                  border: '1px solid var(--accent-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  marginBottom: 14,
                  fontSize: '0.78rem',
                }}
              >
                <div style={{ color: 'var(--accent-secondary)', fontWeight: 700, marginBottom: 4 }}>
                  ✓ DID Issued:{' '}
                  <code style={{ fontFamily: 'var(--font-mono)' }}>{createdIdentity.did}</code>
                </div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: 2 }}>
                  Secret:{' '}
                  <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {createdIdentity.secret}
                  </code>
                </div>
                {createdIdentity.token && (
                  <div style={{ color: 'var(--text-secondary)' }}>
                    Bearer Token:{' '}
                    <code
                      style={{
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--accent-green)',
                        wordBreak: 'break-all',
                      }}
                    >
                      {createdIdentity.token}
                    </code>
                  </div>
                )}
              </div>
            )}

            {/* List of Identities */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 10,
              }}
            >
              {identities.map((id) => (
                <div
                  key={id.did}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {id.did.length > 26 ? `${id.did.slice(0, 24)}…` : id.did}
                    </span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: 'var(--accent-secondary)',
                        background: 'rgba(159,122,234,0.15)',
                        padding: '2px 6px',
                        borderRadius: 3,
                      }}
                    >
                      {id.type}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                    Epoch: {id.epoch} · {id.revoked ? '❌ Revoked' : '✓ Active'}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {id.capabilities.map((cap) => (
                      <span
                        key={cap}
                        style={{
                          fontSize: '0.65rem',
                          background: 'var(--bg-card)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border)',
                          padding: '1px 5px',
                          borderRadius: 3,
                        }}
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Cross-Mesh Verification Federation Engine (Section XXXIII) ── */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(99, 179, 237, 0.3)',
              borderRadius: 'var(--radius)',
              padding: 20,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.95rem',
                color: 'var(--accent-primary)',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>🌐 Cross-Mesh Inter-Cluster Verification Federation</span>
                {meshSummary && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      background: 'rgba(99, 179, 237, 0.15)',
                      color: 'var(--accent-primary)',
                      padding: '2px 8px',
                      borderRadius: 4,
                    }}
                  >
                    {meshSummary.activePeers} Active Mesh Peers · Avg Trust:{' '}
                    {meshSummary.avgTrustScore}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={meshExporting}
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                onClick={async () => {
                  setMeshExporting(true);
                  try {
                    const res = await fetch(`${API_BASE}/federation/proofs/export`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        claim: claim || 'Web Mesh Inter-Cluster Verification Claim',
                        targetCluster: 'global-mesh',
                      }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setExportedProof(data.data);
                      await fetchState();
                    }
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setMeshExporting(false);
                  }
                }}
              >
                📡 Export Mesh Proof
              </button>
            </div>

            {/* Exported proof notification */}
            {exportedProof && (
              <div
                style={{
                  background: 'rgba(99, 179, 237, 0.12)',
                  border: '1px solid var(--accent-primary)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  marginBottom: 14,
                  fontSize: '0.78rem',
                }}
              >
                <div style={{ color: 'var(--accent-primary)', fontWeight: 700, marginBottom: 4 }}>
                  ✓ Federated Proof Exported: {exportedProof.proofId}
                </div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: 2 }}>
                  Origin Cluster:{' '}
                  <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {exportedProof.originCluster}
                  </code>
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>
                  Merkle Root:{' '}
                  <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                    {exportedProof.verificationMerkleRoot.slice(0, 32)}…
                  </code>
                </div>
              </div>
            )}

            {/* Mesh peers grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 10,
              }}
            >
              {meshPeers.map((peer) => (
                <div
                  key={peer.nodeId}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{peer.clusterName}</span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: 'var(--accent-green)',
                        background: 'rgba(56, 178, 172, 0.12)',
                        padding: '2px 6px',
                        borderRadius: 3,
                      }}
                    >
                      {peer.status}
                    </span>
                  </div>
                  <div
                    style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 4 }}
                  >
                    {peer.endpoint}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span>Node ID: {peer.nodeId}</span>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                      Trust: {(peer.trustScore * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Micro-Benchmark & Latency Quantile Profiling (Section XXXIV) ── */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(236, 201, 75, 0.3)',
              borderRadius: 'var(--radius)',
              padding: 20,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.95rem',
                color: 'var(--accent-amber)',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>⚡ Micro-Benchmark & Latency Quantile Profiling Engine</span>
                {benchmarks && benchmarks.loop && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      background: 'rgba(236, 201, 75, 0.15)',
                      color: 'var(--accent-amber)',
                      padding: '2px 8px',
                      borderRadius: 4,
                    }}
                  >
                    {benchmarks.loop.throughputOpsSec} Ops/Sec · P50:{' '}
                    {benchmarks.loop.latency.p50Ms}ms · P99: {benchmarks.loop.latency.p99Ms}ms
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={runningBenchmark}
                style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                onClick={async () => {
                  setRunningBenchmark(true);
                  try {
                    const res = await fetch(`${API_BASE}/benchmark/run`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ iterations: 20 }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setBenchmarks(data.data);
                      await fetchState();
                    }
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setRunningBenchmark(false);
                  }
                }}
              >
                {runningBenchmark ? '⏳ Profiling Engine…' : '⚡ Run Stress Benchmark'}
              </button>
            </div>

            {benchmarks ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: 12,
                }}
              >
                {Object.entries(benchmarks).map(([key, b]) => (
                  <div
                    key={key}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 12,
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: 4 }}>
                      {b.testName}
                    </div>
                    <div
                      style={{
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        color: 'var(--accent-green)',
                        marginBottom: 6,
                      }}
                    >
                      {b.throughputOpsSec}{' '}
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        ops/sec
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 4,
                        fontSize: '0.68rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <div>
                        P50: <strong>{b.latency.p50Ms}ms</strong>
                      </div>
                      <div>
                        P90: <strong>{b.latency.p90Ms}ms</strong>
                      </div>
                      <div>
                        P99: <strong>{b.latency.p99Ms}ms</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Click "Run Stress Benchmark" to compute real-time latency quantiles (P50/P90/P99)
                and engine throughput.
              </div>
            )}
          </div>

          {/* ── RFC-6962 Merkle Notary & Transparency Log (Section XXXV) ── */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(72, 187, 120, 0.3)',
              borderRadius: 'var(--radius)',
              padding: 20,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.95rem',
                color: 'var(--accent-green)',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>📜 RFC-6962 Merkle Notary & Public Transparency Log</span>
                {notarySummary && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      background: 'rgba(72, 187, 120, 0.15)',
                      color: 'var(--accent-green)',
                      padding: '2px 8px',
                      borderRadius: 4,
                    }}
                  >
                    Tree Size: {notarySummary.treeSize} Leaves · Root:{' '}
                    {notarySummary.merkleRoot.slice(0, 12)}…
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  onClick={async () => {
                    if (!notarySummary || notarySummary.treeSize === 0) return;
                    try {
                      const proofRes = await fetch(`${API_BASE}/notary/proof`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ leafIndex: 0 }),
                      });
                      if (proofRes.ok) {
                        const pData = (await proofRes.json()).data;
                        const vRes = await fetch(`${API_BASE}/notary/verify-proof`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ proof: pData }),
                        });
                        if (vRes.ok) {
                          const vData = (await vRes.json()).data;
                          setVerifiedInclusionProof(vData.valid);
                        }
                      }
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                >
                  🔍 Verify Inclusion Proof
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={anchoringNotary}
                  style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                  onClick={async () => {
                    setAnchoringNotary(true);
                    try {
                      const res = await fetch(`${API_BASE}/notary/anchor`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          claim: claim || 'Web Notarized Verification Seal',
                        }),
                      });
                      if (res.ok) {
                        await fetchState();
                      }
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setAnchoringNotary(false);
                    }
                  }}
                >
                  {anchoringNotary ? '⏳ Anchoring…' : '+ Anchor Attestation'}
                </button>
              </div>
            </div>

            {/* Inclusion proof verification badge */}
            {verifiedInclusionProof !== null && (
              <div
                style={{
                  background: verifiedInclusionProof
                    ? 'rgba(72, 187, 120, 0.12)'
                    : 'rgba(245, 101, 101, 0.12)',
                  border: `1px solid ${verifiedInclusionProof ? 'var(--accent-green)' : 'var(--accent-red)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  marginBottom: 12,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: verifiedInclusionProof ? 'var(--accent-green)' : 'var(--accent-red)',
                }}
              >
                {verifiedInclusionProof
                  ? '✓ Cryptographic RFC-6962 Inclusion Proof Verified (Leaf exists in Merkle Root without tampering)'
                  : '✗ Inclusion Proof Failed Verification'}
              </div>
            )}

            {/* Recent seals list */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 10,
              }}
            >
              {notarySeals
                .slice(-4)
                .reverse()
                .map((seal) => (
                  <div
                    key={seal.sealId}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {seal.sealId}
                      </span>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          color: 'var(--accent-green)',
                          background: 'rgba(72, 187, 120, 0.15)',
                          padding: '1px 6px',
                          borderRadius: 3,
                        }}
                      >
                        Leaf #{seal.leafIndex}
                      </span>
                    </div>
                    <div
                      style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}
                    >
                      Leaf Hash:{' '}
                      <code
                        style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}
                      >
                        {seal.leafHash.slice(0, 24)}…
                      </code>
                    </div>
                    <div
                      style={{
                        fontSize: '0.68rem',
                        color: 'var(--text-muted)',
                        wordBreak: 'break-all',
                      }}
                    >
                      Signature:{' '}
                      <code
                        style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)' }}
                      >
                        {seal.notarySignature.slice(0, 32)}…
                      </code>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* ── Isolated Deterministic Rule Execution Sandbox (Section XXXVI) ── */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(237, 100, 166, 0.3)',
              borderRadius: 'var(--radius)',
              padding: 20,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.95rem',
                color: 'var(--accent-pink)',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>🛡️ Isolated Deterministic Rule Execution Sandbox</span>
                {sandboxStats && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      background: 'rgba(237, 100, 166, 0.15)',
                      color: 'var(--accent-pink)',
                      padding: '2px 8px',
                      borderRadius: 4,
                    }}
                  >
                    {sandboxStats.totalRuns} Runs · {sandboxStats.violationsBlocked} Blocked
                    Violations · Avg Time: {sandboxStats.avgExecutionTimeMs}ms
                  </span>
                )}
              </div>
            </div>

            {/* Sandbox input controls */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <input
                type="text"
                value={sandboxCode}
                onChange={(e) => setSandboxCode(e.target.value)}
                placeholder="Enter safe rule expression (e.g. responseTime < 100 && statusCode === 200)"
                style={{
                  flex: 1,
                  minWidth: 280,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.82rem',
                }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                disabled={sandboxExecuting}
                style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                onClick={async () => {
                  setSandboxExecuting(true);
                  try {
                    const res = await fetch(`${API_BASE}/sandbox/execute`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        code: sandboxCode,
                        context: { responseTime: 45, statusCode: 200, confidence: 0.95 },
                      }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setSandboxResult(data.data);
                      await fetchState();
                    }
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setSandboxExecuting(false);
                  }
                }}
              >
                {sandboxExecuting ? '⏳ Executing…' : '⚡ Run in Sandbox'}
              </button>
            </div>

            {/* Sandbox result card */}
            {sandboxResult && (
              <div
                style={{
                  background: sandboxResult.success
                    ? 'rgba(72, 187, 120, 0.12)'
                    : 'rgba(245, 101, 101, 0.12)',
                  border: `1px solid ${sandboxResult.success ? 'var(--accent-green)' : 'var(--accent-red)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: 12,
                  fontSize: '0.78rem',
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    color: sandboxResult.success ? 'var(--accent-green)' : 'var(--accent-red)',
                    marginBottom: 4,
                  }}
                >
                  {sandboxResult.success
                    ? `✓ Execution Succeeded: Result = ${JSON.stringify(sandboxResult.result)}`
                    : `✗ Sandbox Blocked: ${sandboxResult.error} (${sandboxResult.violation})`}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 16,
                    color: 'var(--text-muted)',
                    fontSize: '0.72rem',
                  }}
                >
                  <span>Execution Time: {sandboxResult.executionTimeMs}ms</span>
                  <span>Gas Consumed: {sandboxResult.gasConsumed} units</span>
                  <span>Isolated Scope: Strict Mode (Frozen Globals)</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Declarative Policy & Compliance Guard (Section XXXVII) ── */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(129, 230, 217, 0.3)',
              borderRadius: 'var(--radius)',
              padding: 20,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.95rem',
                color: 'var(--accent-teal)',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>📜 Declarative Policy Bundles & Compliance Guard</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    background: 'rgba(129, 230, 217, 0.15)',
                    color: 'var(--accent-teal)',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  {policies.length} Active Policy Bundles
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={selectedPolicyId}
                  onChange={(e) => setSelectedPolicyId(e.target.value)}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '4px 8px',
                    fontSize: '0.75rem',
                  }}
                >
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={evaluatingPolicy}
                  style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                  onClick={async () => {
                    setEvaluatingPolicy(true);
                    try {
                      const res = await fetch(`${API_BASE}/policies/evaluate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          policyId: selectedPolicyId,
                          context: {
                            confidence: 0.96,
                            metadata: { responseTime: 30, region: 'us-east-1' },
                            source: { environment: 'production' },
                          },
                        }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setPolicyReceipt(data.data);
                        await fetchState();
                      }
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setEvaluatingPolicy(false);
                    }
                  }}
                >
                  {evaluatingPolicy ? '⏳ Evaluating…' : '⚖️ Evaluate Compliance'}
                </button>
              </div>
            </div>

            {/* Compliance Receipt Badge */}
            {policyReceipt && (
              <div
                style={{
                  background: policyReceipt.compliant
                    ? 'rgba(72, 187, 120, 0.12)'
                    : 'rgba(245, 101, 101, 0.12)',
                  border: `1px solid ${policyReceipt.compliant ? 'var(--accent-green)' : 'var(--accent-red)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: 12,
                  marginBottom: 12,
                  fontSize: '0.78rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      color: policyReceipt.compliant ? 'var(--accent-green)' : 'var(--accent-red)',
                    }}
                  >
                    {policyReceipt.compliant
                      ? `✓ Policy Compliant (${policyReceipt.passedRules}/${policyReceipt.passedRules + policyReceipt.failedRules} rules passed)`
                      : `✗ Policy Non-Compliant (${policyReceipt.failedRules} violations)`}
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    Receipt: {policyReceipt.receiptId}
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                  Signature:{' '}
                  <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)' }}>
                    {policyReceipt.signature.slice(0, 32)}…
                  </code>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                  {policyReceipt.ruleResults.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: '0.7rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        color: r.passed ? 'var(--accent-green)' : 'var(--accent-red)',
                      }}
                    >
                      <span>{r.passed ? '✓' : '✗'}</span>
                      <span style={{ fontWeight: 600 }}>{r.name}:</span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {r.field} {r.operator} {r.reason ? `(${r.reason})` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Policy list preview */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 10,
              }}
            >
              {policies.map((pol) => (
                <div
                  key={pol.id}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{pol.name}</span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        color: 'var(--accent-teal)',
                        background: 'rgba(129, 230, 217, 0.15)',
                        padding: '1px 6px',
                        borderRadius: 3,
                      }}
                    >
                      v{pol.version}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                    Domain: <span style={{ color: 'var(--text-secondary)' }}>{pol.domain}</span> ·
                    Rules: {pol.rules.length}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Zero-Knowledge Succinct Privacy Proofs (Section XXXVIII) ── */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(129, 140, 248, 0.3)',
              borderRadius: 'var(--radius)',
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div className="section-header">
              <div className="section-title">🔐 Zero-Knowledge Privacy Proofs</div>
              <span className="section-badge">{zkCircuits.length} circuits</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 14 }}>
              Generate and verify succinct zero-knowledge proofs — prove statements without
              revealing private witnesses.
            </div>

            {/* Circuit selector + witness input */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              <select
                value={selectedZKCircuit}
                onChange={(e) => setSelectedZKCircuit(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 200,
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 10px',
                  fontSize: '0.8rem',
                }}
              >
                {zkCircuits.map((c) => (
                  <option key={c.circuitId} value={c.circuitId}>
                    {c.name} ({c.type})
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={zkWitness}
                onChange={(e) => setZkWitness(e.target.value)}
                placeholder="Private witness (e.g. 0.96)"
                style={{
                  width: 160,
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 10px',
                  fontSize: '0.8rem',
                }}
              />
              <button
                onClick={async () => {
                  setProvingZK(true);
                  setZkVerified(null);
                  setGeneratedProof(null);
                  try {
                    const circuit = zkCircuits.find((c) => c.circuitId === selectedZKCircuit);
                    const witnessValue =
                      circuit?.type === 'MEMBERSHIP' ? zkWitness : Number(zkWitness);
                    const proveRes = await fetch(`${API_BASE}/zk/prove`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ circuitId: selectedZKCircuit, witness: witnessValue }),
                    });
                    if (!proveRes.ok) throw new Error('Proving failed');
                    const proof = (await proveRes.json()).data as ZKProofItem;
                    setGeneratedProof(proof);
                    // Auto-verify
                    const verifyRes = await fetch(`${API_BASE}/zk/verify`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ proof }),
                    });
                    if (verifyRes.ok) {
                      const result = (await verifyRes.json()).data;
                      setZkVerified(result.valid);
                    }
                  } catch {
                    setZkVerified(false);
                  } finally {
                    setProvingZK(false);
                  }
                }}
                disabled={provingZK || zkCircuits.length === 0}
                style={{
                  background: provingZK
                    ? 'var(--bg-surface)'
                    : 'linear-gradient(135deg, #818cf8, #6366f1)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 16px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: provingZK ? 'not-allowed' : 'pointer',
                  opacity: provingZK ? 0.6 : 1,
                }}
              >
                {provingZK ? '⏳ Proving…' : '🔏 Generate & Verify Proof'}
              </button>
            </div>

            {/* Proof result */}
            {generatedProof && (
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: `1px solid ${zkVerified ? 'rgba(72, 187, 120, 0.4)' : 'rgba(245, 101, 101, 0.4)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: 14,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                    {zkVerified === true ? '✅' : zkVerified === false ? '❌' : '⏳'} ZK Proof{' '}
                    {zkVerified === true ? 'VERIFIED' : zkVerified === false ? 'FAILED' : 'PENDING'}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    {generatedProof.proofId}
                  </span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '6px 16px',
                    fontSize: '0.73rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <div>
                    Circuit:{' '}
                    <span style={{ color: 'var(--accent-teal)' }}>{generatedProof.circuitId}</span>
                  </div>
                  <div>
                    Type:{' '}
                    <span style={{ color: 'var(--accent-purple)' }}>
                      {generatedProof.circuitType}
                    </span>
                  </div>
                  <div
                    style={{ gridColumn: '1 / -1', fontFamily: 'monospace', fontSize: '0.65rem' }}
                  >
                    Commitment: {generatedProof.commitment.slice(0, 32)}…
                  </div>
                  <div
                    style={{ gridColumn: '1 / -1', fontFamily: 'monospace', fontSize: '0.65rem' }}
                  >
                    Token: {generatedProof.proofToken.slice(0, 32)}…
                  </div>
                </div>
              </div>
            )}

            {/* Circuit list */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 10,
              }}
            >
              {zkCircuits.map((c) => (
                <div
                  key={c.circuitId}
                  style={{
                    background: 'var(--bg-surface)',
                    border: `1px solid ${selectedZKCircuit === c.circuitId ? 'rgba(129, 140, 248, 0.5)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: 12,
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedZKCircuit(c.circuitId)}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{c.name}</span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        color: '#818cf8',
                        background: 'rgba(129, 140, 248, 0.15)',
                        padding: '1px 6px',
                        borderRadius: 3,
                      }}
                    >
                      {c.type}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {c.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Adaptive Gateway, Rate Limiting & Anomaly Defense (Section XXXIX) ── */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(246, 173, 85, 0.3)',
              borderRadius: 'var(--radius)',
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div className="section-header">
              <div className="section-title">🛡️ Adaptive Gateway & Anomaly Defense</div>
              <span className="section-badge">
                {gatewayStats?.totalRequests || 0} reqs · {gatewayAnomalies.length} alerts
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 14 }}>
              Sliding-window rate limiting, HMAC-SHA256 request signing, anti-replay guards, and
              real-time anomaly alerts.
            </div>

            {/* Gateway stats grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 10,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: 10,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>ALLOWED REQS</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-teal)' }}>
                  {gatewayStats?.allowedRequests || 0}
                </div>
              </div>
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: 10,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>BLOCKED (429)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-red)' }}>
                  {gatewayStats?.blockedRequests || 0}
                </div>
              </div>
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: 10,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>ANOMALIES</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f6ad55' }}>
                  {gatewayStats?.anomaliesDetected || 0}
                </div>
              </div>
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: 10,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  ACTIVE CLIENTS
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-purple)' }}>
                  {gatewayStats?.activeClients || 0}
                </div>
              </div>
            </div>

            {/* Test Request Form */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <button
                onClick={async () => {
                  setTestingGateway(true);
                  setGatewayResult(null);
                  try {
                    const res = await fetch(`${API_BASE}/gateway/request`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ clientId: 'dashboard-tester' }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setGatewayResult(`✅ Allowed (${data.data.remainingRequests} remaining)`);
                    } else {
                      setGatewayResult(
                        `⛔ Throttled: ${data.data?.reason || 'Rate limit exceeded'}`
                      );
                    }
                    fetchState();
                  } catch {
                    setGatewayResult('❌ Gateway connection error');
                  } finally {
                    setTestingGateway(false);
                  }
                }}
                disabled={testingGateway}
                style={{
                  background: testingGateway
                    ? 'var(--bg-surface)'
                    : 'linear-gradient(135deg, #f6ad55, #ed8936)',
                  color: '#1a202c',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 16px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: testingGateway ? 'not-allowed' : 'pointer',
                  opacity: testingGateway ? 0.6 : 1,
                }}
              >
                {testingGateway ? '⏳ Testing…' : '⚡ Simulate Gateway Request'}
              </button>
              {gatewayResult && (
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {gatewayResult}
                </div>
              )}
            </div>

            {/* Anomalies Feed */}
            {gatewayAnomalies.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    marginBottom: 6,
                    color: '#f6ad55',
                  }}
                >
                  🚨 Recent Anomaly Alerts
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {gatewayAnomalies.slice(-3).map((a) => (
                    <div
                      key={a.alertId}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid rgba(246, 173, 85, 0.3)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.75rem',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600, color: '#f6ad55', marginRight: 8 }}>
                          [{a.type}]
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>{a.description}</span>
                      </div>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          background:
                            a.severity === 'CRITICAL' || a.severity === 'HIGH'
                              ? 'rgba(245, 101, 101, 0.2)'
                              : 'rgba(246, 173, 85, 0.2)',
                          color:
                            a.severity === 'CRITICAL' || a.severity === 'HIGH'
                              ? 'var(--accent-red)'
                              : '#f6ad55',
                          padding: '1px 6px',
                          borderRadius: 3,
                          fontWeight: 600,
                        }}
                      >
                        {a.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Real-Time Verification Event Webhooks (Section XL) ── */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(56, 178, 172, 0.3)',
              borderRadius: 'var(--radius)',
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div className="section-header">
              <div className="section-title">📡 Real-Time Verification Event Webhooks</div>
              <span className="section-badge">
                {webhookStats?.activeSubscriptions || 0} active · {webhookStats?.successRate || 100}
                % delivery
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 14 }}>
              Push verification attestations, policy violations, and anomaly alerts to external
              systems with HMAC-SHA256 signatures.
            </div>

            {/* Stats row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 10,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: 10,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>SUBSCRIPTIONS</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-teal)' }}>
                  {webhookStats?.totalSubscriptions || 0}
                </div>
              </div>
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: 10,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  TOTAL DISPATCHES
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-purple)' }}>
                  {webhookStats?.totalDispatches || 0}
                </div>
              </div>
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: 10,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>SUCCESSFUL</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-teal)' }}>
                  {webhookStats?.successfulDeliveries || 0}
                </div>
              </div>
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: 10,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>SUCCESS RATE</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38b2ac' }}>
                  {webhookStats?.successRate || 100}%
                </div>
              </div>
            </div>

            {/* Test Trigger Button */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <button
                onClick={async () => {
                  setTriggeringWebhook(true);
                  setWebhookResult(null);
                  try {
                    const res = await fetch(`${API_BASE}/webhooks/dispatch`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        event: 'ATTESTATION_CREATED',
                        data: {
                          claim: 'Dashboard simulated verification event',
                          timestamp: new Date().toISOString(),
                          confidence: 0.995,
                        },
                      }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setWebhookResult(`✅ Dispatched to ${data.data.count} subscriber(s)`);
                    } else {
                      setWebhookResult(`❌ Error: ${data.message || 'Failed'}`);
                    }
                    fetchState();
                  } catch {
                    setWebhookResult('❌ Failed to trigger webhook');
                  } finally {
                    setTriggeringWebhook(false);
                  }
                }}
                disabled={triggeringWebhook}
                style={{
                  background: triggeringWebhook
                    ? 'var(--bg-surface)'
                    : 'linear-gradient(135deg, #38b2ac, #319795)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 16px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: triggeringWebhook ? 'not-allowed' : 'pointer',
                  opacity: triggeringWebhook ? 0.6 : 1,
                }}
              >
                {triggeringWebhook ? '⏳ Dispatching…' : '🚀 Test Webhook Dispatch'}
              </button>
              {webhookResult && (
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {webhookResult}
                </div>
              )}
            </div>

            {/* Subscriptions List */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 10,
              }}
            >
              {webhooks.map((sub) => (
                <div
                  key={sub.id}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{sub.name}</span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        color: sub.active ? '#38b2ac' : 'var(--text-muted)',
                        background: sub.active
                          ? 'rgba(56, 178, 172, 0.15)'
                          : 'rgba(255, 255, 255, 0.05)',
                        padding: '1px 6px',
                        borderRadius: 3,
                        fontWeight: 600,
                      }}
                    >
                      {sub.active ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--text-secondary)',
                      fontFamily: 'monospace',
                      marginBottom: 6,
                    }}
                  >
                    {sub.url}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {sub.events.map((ev) => (
                      <span
                        key={ev}
                        style={{
                          fontSize: '0.6rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          padding: '1px 5px',
                          borderRadius: 3,
                          color: 'var(--text-muted)',
                        }}
                      >
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Multi-Source Cryptographic Consensus Oracle (Section XLI) ── */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(237, 137, 54, 0.3)',
              borderRadius: 'var(--radius)',
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div className="section-header">
              <div className="section-title">🔮 Multi-Source Consensus Oracle</div>
              <span className="section-badge">
                {oracleStats?.activeFeeds || 0} feeds · {oracleStats?.activeProviders || 0}{' '}
                providers
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 14 }}>
              Decentralized multi-provider quorum aggregation (Median, Majority Vote) with signed
              cryptographic consensus receipts.
            </div>

            {/* Oracle stats row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 10,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: 10,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>ACTIVE FEEDS</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-teal)' }}>
                  {oracleStats?.activeFeeds || 0}
                </div>
              </div>
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: 10,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>PROVIDERS</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ed8936' }}>
                  {oracleStats?.activeProviders || 0}
                </div>
              </div>
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: 10,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  CONSENSUS RECEIPTS
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-purple)' }}>
                  {oracleStats?.totalConsensusReceipts || 0}
                </div>
              </div>
            </div>

            {/* Aggregate Test Action */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <button
                onClick={async () => {
                  setAggregatingOracle(true);
                  setOracleResult(null);
                  try {
                    const res = await fetch(`${API_BASE}/oracle/aggregate`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        feedId: 'feed-eth-usd',
                        reports: [
                          {
                            providerId: 'prov-node-alpha',
                            feedId: 'feed-eth-usd',
                            value: 3260,
                            timestamp: new Date().toISOString(),
                            signature: 's1',
                          },
                          {
                            providerId: 'prov-node-beta',
                            feedId: 'feed-eth-usd',
                            value: 3275,
                            timestamp: new Date().toISOString(),
                            signature: 's2',
                          },
                          {
                            providerId: 'prov-node-gamma',
                            feedId: 'feed-eth-usd',
                            value: 3250,
                            timestamp: new Date().toISOString(),
                            signature: 's3',
                          },
                        ],
                      }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setOracleResult(
                        `✅ Consensus Value: $${data.data.aggregatedValue} (${data.data.strategyUsed}, ${data.data.participants} providers)`
                      );
                    } else {
                      setOracleResult(`❌ Error: ${data.message || 'Aggregation failed'}`);
                    }
                    fetchState();
                  } catch {
                    setOracleResult('❌ Failed to aggregate oracle reports');
                  } finally {
                    setAggregatingOracle(false);
                  }
                }}
                disabled={aggregatingOracle}
                style={{
                  background: aggregatingOracle
                    ? 'var(--bg-surface)'
                    : 'linear-gradient(135deg, #ed8936, #dd6b20)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 16px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: aggregatingOracle ? 'not-allowed' : 'pointer',
                  opacity: aggregatingOracle ? 0.6 : 1,
                }}
              >
                {aggregatingOracle ? '⏳ Aggregating…' : '🔮 Compute Quorum Consensus'}
              </button>
              {oracleResult && (
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {oracleResult}
                </div>
              )}
            </div>

            {/* Feeds List */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 10,
              }}
            >
              {oracleFeeds.map((feed) => (
                <div
                  key={feed.feedId}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{feed.name}</span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        color: '#ed8936',
                        background: 'rgba(237, 137, 54, 0.15)',
                        padding: '1px 6px',
                        borderRadius: 3,
                        fontWeight: 600,
                      }}
                    >
                      {feed.aggregation}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                    {feed.description}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                    Heartbeat: {feed.heartbeatMs / 1000}s · Min Quorum: {feed.minResponses}
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Consensus Receipts */}
            {oracleReceipts.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    marginBottom: 6,
                    color: '#ed8936',
                  }}
                >
                  📜 Recent Cryptographic Consensus Receipts ({oracleReceipts.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {oracleReceipts.slice(-3).map((r) => (
                    <div
                      key={r.receiptId}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid rgba(237, 137, 54, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 12px',
                        fontSize: '0.72rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--accent-teal)' }}>
                          {r.feedId}
                        </span>
                        : {String(r.aggregatedValue)}{' '}
                        <span style={{ color: 'var(--text-muted)' }}>
                          ({r.strategyUsed}, {r.participants} nodes)
                        </span>
                      </div>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.65rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {r.receiptId}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Cryptographic State Vault & Disaster Recovery (Section XLII) ── */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(129, 140, 248, 0.3)',
              borderRadius: 'var(--radius)',
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div className="section-header">
              <div className="section-title">🏛️ Cryptographic State Vault & Recovery</div>
              <span className="section-badge">
                {vaultStats?.totalCheckpoints || 0} checkpoints · Epoch{' '}
                {vaultStats?.latestEpoch || 0}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 14 }}>
              Deterministic state checkpointing, Merkle root state proofs, HMAC integrity seals, and
              zero-loss disaster recovery.
            </div>

            {/* Stats row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 10,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: 10,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>CHECKPOINTS</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-teal)' }}>
                  {vaultStats?.totalCheckpoints || 0}
                </div>
              </div>
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: 10,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>LATEST EPOCH</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-purple)' }}>
                  {vaultStats?.latestEpoch || 0}
                </div>
              </div>
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: 10,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>VAULT STORAGE</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#818cf8' }}>
                  {vaultStats?.totalVaultBytes || 0} B
                </div>
              </div>
            </div>

            {/* Create Checkpoint Action */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <button
                onClick={async () => {
                  setCreatingCheckpoint(true);
                  setVaultResult(null);
                  try {
                    const res = await fetch(`${API_BASE}/vault/checkpoint`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        label: `Dashboard State Snapshot #${(vaultStats?.totalCheckpoints || 0) + 1}`,
                      }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setVaultResult(
                        `✅ Checkpoint Sealed: ${data.data.checkpointId} (Epoch ${data.data.epoch}, Root: ${data.data.merkleRoot.slice(0, 12)}…)`
                      );
                    } else {
                      setVaultResult(`❌ Error: ${data.message || 'Checkpoint failed'}`);
                    }
                    fetchState();
                  } catch {
                    setVaultResult('❌ Failed to seal state checkpoint');
                  } finally {
                    setCreatingCheckpoint(false);
                  }
                }}
                disabled={creatingCheckpoint}
                style={{
                  background: creatingCheckpoint
                    ? 'var(--bg-surface)'
                    : 'linear-gradient(135deg, #818cf8, #6366f1)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 16px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: creatingCheckpoint ? 'not-allowed' : 'pointer',
                  opacity: creatingCheckpoint ? 0.6 : 1,
                }}
              >
                {creatingCheckpoint ? '⏳ Sealing…' : '🏛️ Seal State Checkpoint'}
              </button>
              {vaultResult && (
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {vaultResult}
                </div>
              )}
            </div>

            {/* Checkpoints List */}
            {checkpoints.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 10,
                }}
              >
                {checkpoints.slice(0, 4).map((chk) => (
                  <div
                    key={chk.checkpointId}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{chk.label}</span>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          color: '#818cf8',
                          background: 'rgba(129, 140, 248, 0.15)',
                          padding: '1px 6px',
                          borderRadius: 3,
                          fontWeight: 600,
                        }}
                      >
                        EPOCH {chk.epoch}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '0.68rem',
                        color: 'var(--text-muted)',
                        fontFamily: 'monospace',
                        marginBottom: 4,
                      }}
                    >
                      Root: {chk.merkleRoot.slice(0, 24)}…
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                      {chk.totalEvents} events · {chk.totalRules} rules · {chk.payloadSize} bytes
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Decentralized Dispute Resolution & Jury Arbitration (Section XLIII) ── */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(245, 101, 101, 0.3)',
              borderRadius: 'var(--radius)',
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div className="section-header">
              <div className="section-title">⚖️ Decentralized Dispute Arbitration</div>
              <span className="section-badge">
                {disputeStats?.activeChallenges || 0} active · {disputeStats?.totalStaked || 0}{' '}
                staked
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 14 }}>
              Challenge window staking, cryptographic counter-evidence dossiers, multi-juror quorum
              voting, and enforceable arbitration rulings.
            </div>

            {/* Dispute stats row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 10,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: 10,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>TOTAL CASES</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-teal)' }}>
                  {disputeStats?.totalCases || 0}
                </div>
              </div>
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: 10,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  ACTIVE CHALLENGES
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-red)' }}>
                  {disputeStats?.activeChallenges || 0}
                </div>
              </div>
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: 10,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>OVERTURNED</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f6ad55' }}>
                  {disputeStats?.overturnedCases || 0}
                </div>
              </div>
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: 10,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>TOTAL STAKED</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-purple)' }}>
                  {disputeStats?.totalStaked || 0}
                </div>
              </div>
            </div>

            {/* Raise Dispute Action */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <button
                onClick={async () => {
                  setRaisingDispute(true);
                  setDisputeResult(null);
                  try {
                    const res = await fetch(`${API_BASE}/disputes`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        targetEventHash:
                          '0x' + Math.random().toString(16).slice(2).padStart(64, '0'),
                        claimantDid: 'did:omega:agent:node-primary',
                        challengerDid: 'did:omega:auditor:sentinel-1',
                        stakeAmount: 500,
                        reason: 'Observation latency claim contradicts telemetry log trace',
                      }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setDisputeResult(
                        `✅ Case Raised: ${data.data.caseId} (Staked: ${data.data.stakeAmount}, Status: ${data.data.status})`
                      );
                    } else {
                      setDisputeResult(`❌ Error: ${data.message || 'Challenge failed'}`);
                    }
                    fetchState();
                  } catch {
                    setDisputeResult('❌ Failed to raise dispute challenge');
                  } finally {
                    setRaisingDispute(false);
                  }
                }}
                disabled={raisingDispute}
                style={{
                  background: raisingDispute
                    ? 'var(--bg-surface)'
                    : 'linear-gradient(135deg, #f56565, #c53030)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 16px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: raisingDispute ? 'not-allowed' : 'pointer',
                  opacity: raisingDispute ? 0.6 : 1,
                }}
              >
                {raisingDispute ? '⏳ Submitting…' : '⚖️ Raise Dispute Challenge'}
              </button>
              {disputeResult && (
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {disputeResult}
                </div>
              )}
            </div>

            {/* Cases List */}
            {disputes.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 10,
                }}
              >
                {disputes.slice(0, 4).map((c) => (
                  <div
                    key={c.caseId}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--accent-red)' }}
                      >
                        {c.caseId}
                      </span>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          color:
                            c.status === 'OVERTURNED'
                              ? '#f6ad55'
                              : c.status === 'UPHELD'
                                ? 'var(--accent-teal)'
                                : 'var(--accent-red)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          padding: '1px 6px',
                          borderRadius: 3,
                          fontWeight: 600,
                        }}
                      >
                        {c.status}
                      </span>
                    </div>
                    <div
                      style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6 }}
                    >
                      {c.reason}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                      Stake: {c.stakeAmount} tokens · Target: {c.targetEventHash.slice(0, 16)}…
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 25 — Worker Pool & Autonomous Builder Engine */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: 20,
              marginBottom: 24,
            }}
          >
            <div className="section-header" style={{ marginBottom: 16 }}>
              <div className="section-title">🔨 Worker Pool &amp; Autonomous Builder Engine</div>
              {workerStats && (
                <span
                  className="section-badge"
                  style={{
                    background:
                      workerStats.reproducibilityRate >= 1.0
                        ? 'rgba(72,187,120,0.15)'
                        : 'rgba(252,129,74,0.15)',
                    color:
                      workerStats.reproducibilityRate >= 1.0 ? 'var(--accent-green)' : '#fc814a',
                  }}
                >
                  {workerStats.onlineWorkers}/{workerStats.totalWorkers} ONLINE ·{' '}
                  {workerStats.completedJobs} BUILT · REPRO{' '}
                  {(workerStats.reproducibilityRate * 100).toFixed(0)}%
                </span>
              )}
            </div>

            {/* Submit job control */}
            <div
              style={{
                display: 'flex',
                gap: 10,
                marginBottom: 16,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <input
                value={workerJobName}
                onChange={(e) => setWorkerJobName(e.target.value)}
                placeholder="Build job name…"
                style={{
                  flex: '1 1 220px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  padding: '7px 12px',
                  fontSize: '0.82rem',
                }}
              />
              <select
                value={workerJobCap}
                onChange={(e) => setWorkerJobCap(e.target.value)}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  padding: '7px 10px',
                  fontSize: '0.82rem',
                }}
              >
                {['COMPILE', 'VERIFY', 'ATTEST', 'BENCHMARK', 'CONTAINER_BUILD', 'ZKP_GEN', 'REPLAY'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button
                disabled={submittingWorkerJob || !workerJobName.trim()}
                onClick={async () => {
                  setSubmittingWorkerJob(true);
                  setWorkerResult(null);
                  try {
                    const r = await fetch(`${API_BASE}/workers/jobs/submit`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: workerJobName,
                        requiredCapability: workerJobCap,
                        payload: { submittedAt: new Date().toISOString(), source: 'dashboard' },
                        priority: 3,
                      }),
                    });
                    const d = await r.json();
                    if (r.ok) {
                      setWorkerResult(`✅ Job queued: ${d.data.jobId} (fingerprint: ${d.data.inputFingerprint.slice(0, 12)}…)`);
                      setTimeout(fetchState, 400);
                    } else {
                      setWorkerResult(`❌ ${d.message || 'Job submission failed'}`);
                    }
                  } catch {
                    setWorkerResult('❌ Network error');
                  } finally {
                    setSubmittingWorkerJob(false);
                  }
                }}
                className="btn-primary"
                style={{ fontSize: '0.82rem', padding: '7px 16px', whiteSpace: 'nowrap' }}
              >
                {submittingWorkerJob ? '⏳ Queuing…' : '🔨 Submit Build Job'}
              </button>
            </div>
            {workerResult && (
              <div
                style={{
                  fontSize: '0.78rem',
                  color: workerResult.startsWith('✅') ? 'var(--accent-green)' : 'var(--accent-red)',
                  marginBottom: 14,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                {workerResult}
              </div>
            )}

            {/* Worker Nodes */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Registered Builder Nodes
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                {workers.map((w) => (
                  <div
                    key={w.workerId}
                    style={{
                      background: 'var(--bg-surface)',
                      border: `1px solid ${w.status === 'BUSY' ? 'var(--accent-teal)' : w.status === 'OFFLINE' ? 'var(--accent-red)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-sm)',
                      padding: 12,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                        {w.name.length > 28 ? w.name.slice(0, 28) + '…' : w.name}
                      </span>
                      <span style={{
                        fontSize: '0.65rem',
                        padding: '1px 6px',
                        borderRadius: 3,
                        background: w.status === 'BUSY' ? 'rgba(49,151,149,0.15)' : w.status === 'IDLE' ? 'rgba(72,187,120,0.15)' : 'rgba(245,101,101,0.15)',
                        color: w.status === 'BUSY' ? 'var(--accent-teal)' : w.status === 'IDLE' ? 'var(--accent-green)' : 'var(--accent-red)',
                        fontWeight: 700,
                      }}>
                        {w.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                      {w.capabilities.join(' · ')}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'flex', gap: 12 }}>
                      <span>⚡ {w.resourceMetrics.cpuCores} cores</span>
                      <span>🧠 {(w.resourceMetrics.memoryMb / 1024).toFixed(0)} GB</span>
                      <span>✅ {w.resourceMetrics.jobsCompleted} built</span>
                      <span>🔄 {w.activeJobs}/{w.maxConcurrency} active</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Job Queue */}
            {workerJobs.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Build Job Queue ({workerJobs.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                  {workerJobs.slice(-8).reverse().map((j) => (
                    <div
                      key={j.jobId}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        padding: '8px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {j.name}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          {j.requiredCapability} · P{j.priority} · {j.inputFingerprint.slice(0, 10)}…
                        </div>
                      </div>
                      <span style={{
                        fontSize: '0.65rem',
                        padding: '2px 7px',
                        borderRadius: 3,
                        background:
                          j.status === 'COMPLETED' ? 'rgba(72,187,120,0.15)' :
                          j.status === 'FAILED' ? 'rgba(245,101,101,0.15)' :
                          j.status === 'LEASED' ? 'rgba(49,151,149,0.15)' :
                          'rgba(255,255,255,0.07)',
                        color:
                          j.status === 'COMPLETED' ? 'var(--accent-green)' :
                          j.status === 'FAILED' ? 'var(--accent-red)' :
                          j.status === 'LEASED' ? 'var(--accent-teal)' :
                          'var(--text-secondary)',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}>
                        {j.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SLSA Attestations */}
            {workerAttestations.length > 0 && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  SLSA-L3 Build Attestations ({workerAttestations.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                  {workerAttestations.slice(-5).reverse().map((a) => (
                    <div
                      key={a.attestationId}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid rgba(72,187,120,0.2)',
                        borderRadius: 4,
                        padding: '8px 12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-green)', fontFamily: 'JetBrains Mono, monospace' }}>
                          {a.attestationId.slice(0, 22)}…
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--accent-green)', fontWeight: 700 }}>
                          {a.slsaLevel}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                        merkle: {a.outputMerkleRoot.slice(0, 20)}… · {a.executionTimeMs}ms
                      </div>
                      <div style={{ fontSize: '0.63rem', color: 'var(--text-secondary)', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                        sig: {a.builderSignature.slice(0, 22)}…
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 26 — Automated Verified CI/CD Pipeline Orchestration */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: 20,
              marginBottom: 24,
            }}
          >
            <div className="section-header" style={{ marginBottom: 16 }}>
              <div className="section-title">🚀 Verified CI/CD Pipeline Orchestrator</div>
              {pipelineStats && (
                <span
                  className="section-badge"
                  style={{
                    background: 'rgba(56,178,172,0.15)',
                    color: 'var(--accent-teal)',
                  }}
                >
                  {pipelineStats.successfulRuns}/{pipelineStats.totalRuns} SUCCESS ·{' '}
                  {pipelineStats.totalStagesExecuted} STAGES ·{' '}
                  {pipelineStats.totalAttestations} SEALS
                </span>
              )}
            </div>

            {/* Pipeline Trigger Console */}
            <div
              style={{
                display: 'flex',
                gap: 10,
                marginBottom: 16,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <input
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
                placeholder="Pipeline name…"
                style={{
                  flex: '1 1 200px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  padding: '7px 12px',
                  fontSize: '0.82rem',
                }}
              />
              <input
                value={pipelineVersion}
                onChange={(e) => setPipelineVersion(e.target.value)}
                placeholder="v1.0.0"
                style={{
                  width: 90,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  padding: '7px 10px',
                  fontSize: '0.82rem',
                }}
              />
              <button
                disabled={executingPipeline || !pipelineName.trim()}
                onClick={async () => {
                  setExecutingPipeline(true);
                  setPipelineResult(null);
                  try {
                    const r = await fetch(`${API_BASE}/pipelines/execute`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: pipelineName,
                        version: pipelineVersion,
                        triggeredBy: 'did:omega:operator:dashboard',
                        stages: [
                          {
                            stageId: 'stage-compile',
                            name: 'Compile Bytecode & VM Kernel',
                            capability: 'COMPILE',
                            dependsOn: [],
                            jobPayload: { opt: 3 },
                          },
                          {
                            stageId: 'stage-verify',
                            name: 'Run Verification & Invariant Checks',
                            capability: 'VERIFY',
                            dependsOn: ['stage-compile'],
                            gate: { policy: 'REQUIRE_ATTESTATION', rollbackOnFail: true },
                            jobPayload: { strict: true },
                          },
                          {
                            stageId: 'stage-attest',
                            name: 'Issue Merkle Release Attestation',
                            capability: 'ATTEST',
                            dependsOn: ['stage-verify'],
                            gate: { policy: 'AUTO_PASS' },
                            jobPayload: { release: true },
                          },
                        ],
                      }),
                    });
                    const d = await r.json();
                    if (r.ok) {
                      setPipelineResult(`✅ Pipeline executed: ${d.data.run.runId} (${d.data.stagesPassed} stages passed, sig: ${d.data.pipelineSignature.slice(0, 16)}…)`);
                      setTimeout(fetchState, 400);
                    } else {
                      setPipelineResult(`❌ ${d.message || 'Pipeline execution failed'}`);
                    }
                  } catch {
                    setPipelineResult('❌ Network error');
                  } finally {
                    setExecutingPipeline(false);
                  }
                }}
                className="btn-primary"
                style={{ fontSize: '0.82rem', padding: '7px 16px', whiteSpace: 'nowrap' }}
              >
                {executingPipeline ? '⏳ Orchestrating…' : '⚡ Run Verified CI Pipeline'}
              </button>
            </div>
            {pipelineResult && (
              <div
                style={{
                  fontSize: '0.78rem',
                  color: pipelineResult.startsWith('✅') ? 'var(--accent-green)' : 'var(--accent-red)',
                  marginBottom: 14,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                {pipelineResult}
              </div>
            )}

            {/* Pipeline Runs List */}
            {pipelines.length > 0 && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Recent Pipeline Runs ({pipelines.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
                  {pipelines.slice(-5).reverse().map((run) => (
                    <div
                      key={run.runId}
                      style={{
                        background: 'var(--bg-surface)',
                        border: `1px solid ${run.status === 'SUCCESS' ? 'rgba(72,187,120,0.3)' : run.status === 'ROLLED_BACK' ? 'rgba(252,129,74,0.3)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-sm)',
                        padding: 12,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', marginRight: 8 }}>
                            {run.name}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            v{run.version} · {run.runId}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            padding: '2px 7px',
                            borderRadius: 3,
                            background: run.status === 'SUCCESS' ? 'rgba(72,187,120,0.15)' : run.status === 'ROLLED_BACK' ? 'rgba(252,129,74,0.15)' : 'rgba(245,101,101,0.15)',
                            color: run.status === 'SUCCESS' ? 'var(--accent-green)' : run.status === 'ROLLED_BACK' ? '#fc814a' : 'var(--accent-red)',
                            fontWeight: 700,
                          }}
                        >
                          {run.status}
                        </span>
                      </div>

                      {/* Stage DAG Badges */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
                        {run.stages.map((st, idx) => (
                          <div key={st.stageId} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                padding: '2px 6px',
                                borderRadius: 3,
                                background: st.status === 'SUCCESS' ? 'rgba(72,187,120,0.1)' : 'rgba(255,255,255,0.05)',
                                color: st.status === 'SUCCESS' ? 'var(--accent-green)' : 'var(--text-muted)',
                                border: '1px solid var(--border)',
                              }}
                            >
                              {st.status === 'SUCCESS' ? '✓ ' : ''}{st.name}
                            </span>
                            {idx < run.stages.length - 1 && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>➔</span>
                            )}
                          </div>
                        ))}
                      </div>

                      {run.pipelineSignature && (
                        <div style={{ fontSize: '0.63rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                          sig: {run.pipelineSignature.slice(0, 24)}… {run.durationMs ? `(${run.durationMs}ms)` : ''}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="timeline-section">
            <div className="section-header">
              <div className="section-title">Provenance Log</div>
              <span className="section-badge">{log.length} entries</span>
            </div>

            <div className="timeline">
              {log.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📋</div>
                  <div className="empty-state-title">No events recorded yet</div>
                  <div className="empty-state-text">
                    Run the verification loop to observe the first event.
                  </div>
                </div>
              ) : (
                log.map((entry) => (
                  <TimelineEntry key={`${entry.type}-${entry.id}`} entry={entry} />
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        Attest, don't assert. Evidence before trust. Verification before evolution. — Ω∞v Oceanicos
        v0.1.0
      </footer>
    </div>
  );
}

export default App;
