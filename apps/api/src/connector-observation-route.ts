import type { FastifyInstance } from 'fastify';
import {
  admitOmegaConnector,
  observeAdmittedConnector,
  type ConnectorObservationStore,
  type OmegaConnectorDeclaration,
} from '@oceanicos/mini';

type JsonError = (reply: any, status: number, error: string, extra?: Record<string, unknown>) => unknown;

const connectorModes = new Set(['read-only', 'build-test', 'local-mutating', 'external-consequence']);
const forbiddenClaimFields = new Set(['status', 'realityStatus', 'admitted', 'authorized', 'decision']);
const forbiddenHandlerFields = new Set(['handler', 'execute', 'transport', 'fetch']);
const MAX_LIST_ENTRIES = 200;

function parseObject(body: unknown): Record<string, unknown> | null {
  return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : null;
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

function parseBooleanFlag(value: unknown): boolean {
  return value === true;
}

function storeFailure(reply: any, jsonError: JsonError, error: unknown): unknown {
  const message = String((error as Error)?.message ?? error);
  if (/integrity|capacity exhausted/i.test(message)) {
    return jsonError(reply, 503, 'CONNECTOR_OBSERVATION_JOURNAL_UNAVAILABLE');
  }
  throw error;
}

export function registerConnectorObservationRoute(
  fastify: FastifyInstance,
  jsonError: JsonError,
  store: ConnectorObservationStore,
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

  fastify.post('/v1/omega/connectors/observe', async (request, reply) => {
    if (!store.verifyIntegrity()) {
      return jsonError(reply, 503, 'CONNECTOR_OBSERVATION_JOURNAL_INTEGRITY_DEGRADED');
    }
    const body = parseObject(request.body);
    if (!body) return jsonError(reply, 400, 'INVALID_CONNECTOR_OBSERVATION');
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

    let execution;
    if (body.execution !== undefined) {
      const executionBody = parseObject(body.execution);
      if (!executionBody) return jsonError(reply, 400, 'INVALID_CONNECTOR_EXECUTION');
      if (typeof executionBody.attempted !== 'boolean' || typeof executionBody.executed !== 'boolean') {
        return jsonError(reply, 400, 'INVALID_CONNECTOR_EXECUTION');
      }
      if (executionBody.actualObservation !== undefined && typeof executionBody.actualObservation !== 'string') {
        return jsonError(reply, 400, 'INVALID_CONNECTOR_EXECUTION');
      }
      if (executionBody.error !== undefined && typeof executionBody.error !== 'string') {
        return jsonError(reply, 400, 'INVALID_CONNECTOR_EXECUTION');
      }
      execution = {
        attempted: executionBody.attempted,
        executed: executionBody.executed,
        actualObservation: executionBody.actualObservation,
        error: executionBody.error,
      };
    }

    const admission = admitOmegaConnector({
      connector,
      authorityVerified: parseBooleanFlag(body.authorityVerified),
      policySatisfied: parseBooleanFlag(body.policySatisfied),
      approvalVerified: parseBooleanFlag(body.approvalVerified),
    });
    const observation = observeAdmittedConnector({ connector, admission, execution });

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
