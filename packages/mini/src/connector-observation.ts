import { createHash } from 'node:crypto';
import {
  admitOmegaConnector,
  type OmegaConnectorAdmissionInput,
  type OmegaConnectorAdmissionResult,
  type OmegaConnectorDeclaration,
} from './connector-admission.js';

export type ConnectorRealityStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

export interface ConnectorExecutionObservation {
  readonly attempted: boolean;
  readonly executed: boolean;
  readonly actualObservation?: string;
  readonly error?: string;
}

export interface ConnectorObservationResult {
  readonly admission: OmegaConnectorAdmissionResult;
  readonly status: ConnectorRealityStatus;
  readonly authorized: boolean;
  readonly executed: boolean;
  readonly observed: boolean;
  readonly expectedObservation: string;
  readonly actualObservation?: string;
  readonly evidence: string;
  readonly issues: readonly string[];
  readonly observedAt: string;
  readonly verificationScope: 'admitted-connector-observation-only';
}

export type ConnectorHandler = () => ConnectorExecutionObservation | Promise<ConnectorExecutionObservation>;

export interface ObserveAdmittedConnectorInput {
  readonly connector: OmegaConnectorDeclaration;
  readonly admission: OmegaConnectorAdmissionResult;
  readonly execution?: ConnectorExecutionObservation;
  readonly now?: () => string;
}

export interface ExecuteAdmittedConnectorInput extends OmegaConnectorAdmissionInput {
  readonly handler?: ConnectorHandler;
  readonly now?: () => string;
}

const evidenceFor = (payload: unknown): string =>
  `sha256:${createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`;

const result = (
  connector: OmegaConnectorDeclaration,
  admission: OmegaConnectorAdmissionResult,
  status: ConnectorRealityStatus,
  issues: readonly string[],
  execution: ConnectorExecutionObservation | undefined,
  observedAt: string,
): ConnectorObservationResult => {
  const authorized = admission.admitted;
  const executed = authorized && execution?.executed === true;
  const actualObservation = authorized ? execution?.actualObservation?.trim() : undefined;
  const observed = Boolean(actualObservation);
  return {
    admission,
    status,
    authorized,
    executed,
    observed,
    expectedObservation: connector.expectedObservation,
    ...(actualObservation ? { actualObservation } : {}),
    evidence: evidenceFor({
      connectorId: connector.id,
      system: connector.system,
      capability: connector.capability,
      scope: connector.scope,
      admission: admission.decision,
      status,
      attempted: authorized ? execution?.attempted === true : false,
      executed,
      expectedObservation: connector.expectedObservation,
      actualObservation: actualObservation ?? null,
      observedAt,
    }),
    issues,
    observedAt,
    verificationScope: 'admitted-connector-observation-only',
  };
};

/**
 * Reconcile an admitted connector against an explicit execution observation.
 *
 * Admission is not execution. Execution is not verification. This function
 * never opens a network connection or invokes a handler. Unadmitted connectors
 * cannot produce VERIFIED, and supplied execution evidence is discarded.
 */
export function observeAdmittedConnector(input: ObserveAdmittedConnectorInput): ConnectorObservationResult {
  const now = input.now ?? (() => new Date().toISOString());
  const observedAt = now();
  const { connector, admission } = input;

  if (!admission.admitted) {
    return result(
      connector,
      admission,
      'NOT_EXECUTED',
      [...admission.issues, 'connector is not admitted; execution is refused'],
      undefined,
      observedAt,
    );
  }

  const execution = input.execution;
  if (!execution || execution.attempted !== true) {
    return result(
      connector,
      admission,
      'NOT_EXECUTED',
      ['connector was admitted but not executed'],
      execution,
      observedAt,
    );
  }

  if (execution.error || execution.executed !== true) {
    const issues = [
      execution.executed === true
        ? 'execution completed with an error; reality cannot be verified'
        : 'execution was attempted but did not complete',
      ...(execution.error ? [execution.error] : []),
    ];
    return result(connector, admission, 'UNKNOWN', issues, execution, observedAt);
  }

  const actual = execution.actualObservation?.trim() ?? '';
  if (!actual) {
    return result(
      connector,
      admission,
      'UNKNOWN',
      ['execution completed without an observation'],
      execution,
      observedAt,
    );
  }

  const expected = connector.expectedObservation.trim();
  if (actual !== expected) {
    return result(
      connector,
      admission,
      'DIVERGENT',
      ['observed connector result does not match the declared expected observation'],
      execution,
      observedAt,
    );
  }

  return result(connector, admission, 'VERIFIED', [], execution, observedAt);
}

/**
 * Admit, then optionally invoke an explicit handler. The handler is never
 * inferred, never discovered, and never called unless admission succeeded.
 * Absence of a handler is NOT_EXECUTED, not a hidden default action.
 */
export async function executeAdmittedConnector(
  input: ExecuteAdmittedConnectorInput,
): Promise<ConnectorObservationResult> {
  const admission = admitOmegaConnector({
    connector: input.connector,
    authorityVerified: input.authorityVerified,
    policySatisfied: input.policySatisfied,
    approvalVerified: input.approvalVerified,
  });
  if (!admission.admitted || !input.handler) {
    return observeAdmittedConnector({
      connector: input.connector,
      admission,
      execution: admission.admitted ? { attempted: false, executed: false } : undefined,
      now: input.now,
    });
  }

  let execution: ConnectorExecutionObservation;
  try {
    execution = await input.handler();
  } catch (error) {
    execution = {
      attempted: true,
      executed: false,
      error: String((error as Error)?.message ?? error),
    };
  }
  return observeAdmittedConnector({
    connector: input.connector,
    admission,
    execution,
    now: input.now,
  });
}

/** Bounded in-process memory. Not durable across process restart. */
export class ConnectorObservationMemory {
  private readonly items: ConnectorObservationResult[] = [];

  constructor(private readonly limit = 32) {}

  remember(entry: ConnectorObservationResult): ConnectorObservationResult {
    this.items.push(entry);
    if (this.items.length > this.limit) this.items.shift();
    return entry;
  }

  list(): readonly ConnectorObservationResult[] {
    return this.items.slice();
  }
}
