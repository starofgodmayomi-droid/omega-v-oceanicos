import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  admitOmegaConnector,
  createGithubPublicRepositoryHandler,
  GITHUB_PUBLIC_REPOSITORY_ADAPTER,
  observeAdmittedConnector,
  type ConnectorExecutionObservation,
  type ConnectorObservationStore,
  type OmegaConnectorDeclaration,
} from '@oceanicos/mini';
import {
  connectorDeclarationDigest,
  ConnectorApprovalStore,
} from './connector-approval-store.js';

type JsonError = (reply: any, status: number, error: string, extra?: Record<string, unknown>) => unknown;

const connectorModes = new Set(['read-only', 'build-test', 'local-mutating', 'external-consequence']);
const forbiddenClaimFields = new Set(['status', 'realityStatus', 'admitted', 'authorized', 'decision']);
const forbiddenHandlerFields = new Set(['handler', 'execute', 'transport', 'fetch']);
const forbiddenAdmissionFields = new Set(['authorityVerified', 'policySatisfied', 'approvalVerified']);
const MAX_LIST_ENTRIES = 200;

function parseObject(body: unknown): Record<string, unknown> | null {
  return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function requiredStringList(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.some((entry) => typeof entry !== 'string' || !entry.trim())) {
    throw new Error(`${field} must contain non-empty strings`);
  }
  return value.map((entry) => entry.trim());
}

function requiredPositiveInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive integer`);
  }
  return value;
}

function parseConnector(value: unknown): OmegaConnectorDeclaration {
  const connector = parseObject(value);
  if (!connector) throw new Error('connector declaration is required');
  const mode = requiredText(connector.mode, 'mode');
  if (!connectorModes.has(mode)) throw new Error('connector mode is unsupported');
  if (typeof connector.rollbackSupported !== 'boolean') throw new Error('rollbackSupported must be a boolean');
  return {
    id: requiredText(connector.id, 'id'),
    version: requiredText(connector.version, 'version'),
    system: requiredText(connector.system, 'system'),
    capability: requiredText(connector.capability, 'capability'),
    authRef: requiredText(connector.authRef, 'authRef'),
    scope: requiredStringList(connector.scope, 'scope'),
    mode: mode as OmegaConnectorDeclaration['mode'],
    policyRefs: requiredStringList(connector.policyRefs, 'policyRefs'),
    stopCondition: requiredText(connector.stopCondition, 'stopCondition'),
    expectedObservation: requiredText(connector.expectedObservation, 'expectedObservation'),
    timeoutMs: requiredPositiveInteger(connector.timeoutMs, 'timeoutMs'),
    maxAttempts: requiredPositiveInteger(connector.maxAttempts, 'maxAttempts'),
    rollbackSupported: connector.rollbackSupported,
  };
}

function storeFailure(reply: any, jsonError: JsonError, error: unknown): unknown {
  const message = String((error as Error)?.message ?? error);
  if (/integrity|capacity exhausted/i.test(message)) {
    return jsonError(reply, 503, 'CONNECTOR_OBSERVATION_JOURNAL_UNAVAILABLE');
  }
  throw error;
}

export interface ConnectorAdmissionEvidence {
  readonly authorityVerified: boolean;
  readonly policySatisfied: boolean;
  readonly approvalVerified: boolean;
}

function isConnectorAdmissionEvidence(value: unknown): value is ConnectorAdmissionEvidence {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  try {
    const evidence = value as Record<string, unknown>;
    return (
      typeof evidence.authorityVerified === 'boolean' &&
      typeof evidence.policySatisfied === 'boolean' &&
      typeof evidence.approvalVerified === 'boolean'
    );
  } catch {
    return false;
  }
}

export type ConnectorAdmissionEvidenceResolver = (
  request: FastifyRequest,
  connector: OmegaConnectorDeclaration,
) => ConnectorAdmissionEvidence | Promise<ConnectorAdmissionEvidence>;

export interface ConnectorObservationRouteOptions {
  readonly githubFetch?: typeof fetch;
  /** Trusted server-side evidence source. Missing resolver means deny by default. */
  readonly resolveAdmissionEvidence?: ConnectorAdmissionEvidenceResolver;
  readonly oidcIdentityEnabled?: boolean;
  readonly approverSubject?: string;
  readonly policyDigests?: ReadonlySet<string>;
  readonly approvalStore?: ConnectorApprovalStore;
}

export function registerConnectorObservationRoute(
  fastify: FastifyInstance,
  jsonError: JsonError,
  store: ConnectorObservationStore,
  options: ConnectorObservationRouteOptions = {},
): void {
  fastify.get('/v1/omega/connectors/observations', async (_request, reply) => {
    if (!store.verifyIntegrity()) {
      return jsonError(reply, 503, 'CONNECTOR_OBSERVATION_JOURNAL_INTEGRITY_DEGRADED');
    }
    const allEntries = store.all();
    const entries = allEntries.slice(-MAX_LIST_ENTRIES);
    return {
      success: true,
      entries,
      total: allEntries.length,
      truncated: allEntries.length > entries.length,
      integrity: 'verified-local-hash-chain',
      limitation:
        'local connector journal is not deployment health, not live GitHub execution, not revenue, and not durable across a destroyed volume',
    };
  });

  fastify.post('/v1/omega/connectors/approvals', async (request, reply) => {
    const identity = request.omegaIdentity;
    if (!options.oidcIdentityEnabled || !identity) {
      return jsonError(reply, 401, 'CONNECTOR_IDENTITY_REQUIRED');
    }
    if (identity.subject !== options.approverSubject) {
      return jsonError(reply, 403, 'CONNECTOR_APPROVER_NOT_ALLOWED');
    }
    const body = parseObject(request.body);
    if (!body || Object.keys(body).some((field) => field !== 'connector')) {
      return jsonError(reply, 400, 'INVALID_CONNECTOR_APPROVAL');
    }

    let connector: OmegaConnectorDeclaration;
    try {
      connector = parseConnector(body.connector);
    } catch (error) {
      return jsonError(reply, 400, 'INVALID_CONNECTOR_DECLARATION', {
        message: String((error as Error)?.message ?? error),
      });
    }

    const connectorDigest = connectorDeclarationDigest(connector);
    if (!options.policyDigests?.has(connectorDigest)) {
      return jsonError(reply, 403, 'CONNECTOR_POLICY_DENIED');
    }
    if (!options.approvalStore) {
      return jsonError(reply, 503, 'CONNECTOR_APPROVAL_STORE_UNAVAILABLE');
    }

    const now = Math.floor(Date.now() / 1000);
    try {
      const approval = options.approvalStore.create(identity, connectorDigest, now);
      return reply.status(201).send({
        success: true,
        approval: {
          ...approval,
          use: 'single-use',
          approver: { issuer: identity.issuer, subject: identity.subject },
        },
      });
    } catch {
      return jsonError(reply, 503, 'CONNECTOR_APPROVAL_STORE_UNAVAILABLE');
    }
  });

  fastify.post('/v1/omega/connectors/approvals/:id/revoke', async (request, reply) => {
    const identity = request.omegaIdentity;
    if (!options.oidcIdentityEnabled || !identity) {
      return jsonError(reply, 401, 'CONNECTOR_IDENTITY_REQUIRED');
    }
    if (identity.subject !== options.approverSubject) {
      return jsonError(reply, 403, 'CONNECTOR_APPROVER_NOT_ALLOWED');
    }
    if (!options.approvalStore) {
      return jsonError(reply, 503, 'CONNECTOR_APPROVAL_STORE_UNAVAILABLE');
    }

    try {
      const revoked = options.approvalStore.revoke(
        (request.params as { id: string }).id,
        identity,
        Math.floor(Date.now() / 1000),
      );
      if (!revoked) return jsonError(reply, 409, 'CONNECTOR_APPROVAL_NOT_REVOCABLE');
      return { success: true, revoked: true };
    } catch {
      return jsonError(reply, 503, 'CONNECTOR_APPROVAL_STORE_UNAVAILABLE');
    }
  });

  fastify.post('/v1/omega/connectors/observe', async (request, reply) => {
    if (!store.verifyIntegrity()) {
      return jsonError(reply, 503, 'CONNECTOR_OBSERVATION_JOURNAL_INTEGRITY_DEGRADED');
    }
    const body = parseObject(request.body);
    if (!body) return jsonError(reply, 400, 'INVALID_CONNECTOR_OBSERVATION');
    if (Object.keys(body).some((field) => forbiddenAdmissionFields.has(field))) {
      return jsonError(reply, 400, 'CONNECTOR_ADMISSION_EVIDENCE_NOT_ACCEPTED');
    }
    if (Object.keys(body).some((field) => forbiddenClaimFields.has(field))) {
      return jsonError(reply, 400, 'CONNECTOR_OBSERVATION_CANNOT_SET_STATUS');
    }
    if (Object.keys(body).some((field) => forbiddenHandlerFields.has(field))) {
      return jsonError(reply, 400, 'CONNECTOR_HANDLER_NOT_ACCEPTED');
    }

    let connector: OmegaConnectorDeclaration;
    try {
      connector = parseConnector(body.connector);
    } catch (error) {
      return jsonError(reply, 400, 'INVALID_CONNECTOR_DECLARATION', {
        message: String((error as Error)?.message ?? error),
      });
    }

    const liveAdapter = body.liveAdapter;
    if (liveAdapter !== undefined && liveAdapter !== GITHUB_PUBLIC_REPOSITORY_ADAPTER) {
      return jsonError(reply, 400, 'UNKNOWN_LIVE_ADAPTER', {
        message: 'only github-public-repository is a declared live adapter',
      });
    }

    // A caller-supplied execution is not an observation. The only HTTP
    // execution is the server-side live adapter, and only after admission.
    if (body.execution !== undefined) {
      return jsonError(reply, 400, 'CONNECTOR_EXECUTION_NOT_ACCEPTED');
    }

    const identity = request.omegaIdentity;
    const connectorDigest = connectorDeclarationDigest(connector);
    const approverAuthorized = Boolean(identity && identity.subject === options.approverSubject);
    const policySatisfied = Boolean(options.policyDigests?.has(connectorDigest));
    let resolverEvidence: ConnectorAdmissionEvidence | undefined;
    if (options.resolveAdmissionEvidence && (!options.oidcIdentityEnabled || (approverAuthorized && policySatisfied))) {
      let resolvedEvidence: unknown;
      try {
        resolvedEvidence = await options.resolveAdmissionEvidence(request, connector);
      } catch {
        return jsonError(reply, 503, 'CONNECTOR_ADMISSION_EVIDENCE_UNAVAILABLE');
      }
      if (!isConnectorAdmissionEvidence(resolvedEvidence)) {
        return jsonError(reply, 503, 'CONNECTOR_ADMISSION_EVIDENCE_INVALID');
      }
      resolverEvidence = resolvedEvidence;
    }

    let approvalVerified = false;
    let usedApprovalId: string | undefined;
    const approvalId = body.approvalId;
    if (
      options.oidcIdentityEnabled &&
      identity &&
      approverAuthorized &&
      policySatisfied &&
      typeof approvalId === 'string' &&
      liveAdapter === GITHUB_PUBLIC_REPOSITORY_ADAPTER &&
      (!resolverEvidence || resolverEvidence.authorityVerified && resolverEvidence.policySatisfied && resolverEvidence.approvalVerified)
    ) {
      if (!options.approvalStore) return jsonError(reply, 503, 'CONNECTOR_APPROVAL_STORE_UNAVAILABLE');
      try {
        approvalVerified = options.approvalStore.consume(
          approvalId,
          identity,
          connectorDigest,
          Math.floor(Date.now() / 1000),
        );
        if (approvalVerified) usedApprovalId = approvalId;
      } catch {
        return jsonError(reply, 503, 'CONNECTOR_APPROVAL_STORE_UNAVAILABLE');
      }
    }

    const admissionEvidence: ConnectorAdmissionEvidence = options.oidcIdentityEnabled
      ? {
          authorityVerified: approverAuthorized && (resolverEvidence?.authorityVerified ?? true),
          policySatisfied: policySatisfied && (resolverEvidence?.policySatisfied ?? true),
          approvalVerified: approvalVerified && (resolverEvidence?.approvalVerified ?? true),
        }
      : resolverEvidence ?? {
          authorityVerified: false,
          policySatisfied: false,
          approvalVerified: false,
        };
    const kernelAdmission = admitOmegaConnector({ connector, ...admissionEvidence });
    const missingRequiredApproval = options.oidcIdentityEnabled && !admissionEvidence.approvalVerified;
    const admission = missingRequiredApproval
      ? {
          ...kernelAdmission,
          decision: 'DENY' as const,
          admitted: false,
          issues: [...kernelAdmission.issues, 'connector requires a current single-use human approval'],
        }
      : kernelAdmission;

    let execution: ConnectorExecutionObservation | undefined;
    if (liveAdapter === GITHUB_PUBLIC_REPOSITORY_ADAPTER && admission.admitted) {
      try {
        execution = await createGithubPublicRepositoryHandler(connector, options.githubFetch)();
      } catch (error) {
        return jsonError(reply, 400, 'INVALID_LIVE_ADAPTER', {
          message: String((error as Error)?.message ?? error),
        });
      }
    }

    const observed = observeAdmittedConnector({ connector, admission, execution });
    const observation = usedApprovalId ? { ...observed, approvalId: usedApprovalId } : observed;

    let journal;
    try {
      journal = store.append(connector.id, connector.system, observation);
    } catch (error) {
      return storeFailure(reply, jsonError, error);
    }

    return {
      success: true,
      ...observation,
      remembered: true,
      liveAdapter: liveAdapter === GITHUB_PUBLIC_REPOSITORY_ADAPTER ? GITHUB_PUBLIC_REPOSITORY_ADAPTER : null,
      journal: {
        sequence: journal.sequence,
        hash: journal.hash,
        previousHash: journal.previousHash,
      },
      limitation:
        'admitted-connector observation is not deployment health, revenue, secret material, or proof of an undeclared network call',
    };
  });
}
