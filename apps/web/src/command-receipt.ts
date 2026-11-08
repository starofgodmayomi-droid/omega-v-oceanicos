/*
 * The front prompt's receipt must state what the command actually is.
 *
 * A command that has been executed must never keep reading "not executed",
 * and the receipt's action must name the next real step for that status.
 * This is a projection of the server's command status, not a new claim:
 * unknown statuses stay visibly unknown.
 */

export type CommandReceipt = {
  status: string;
  state: string;
  action: string;
};

const STATES: Record<string, string> = {
  PROPOSED: 'Proposed — not executed',
  REVIEW: 'In review — not executed',
  AUTHORIZED: 'Authorized — not executed',
  DENIED: 'Denied — not executed',
  EXECUTED: 'Executed — awaiting observation',
  ATTESTED: 'Executed and attested — awaiting observation',
  VERIFIED: 'Executed — reconciled VERIFIED',
  DIVERGENT: 'Executed — reconciled DIVERGENT',
  UNKNOWN: 'Executed — observation UNKNOWN',
  FAILED: 'Execution failed — not reconciled',
};

const ACTIONS: Record<string, string> = {
  PROPOSED: 'Review & authorize',
  REVIEW: 'Review & authorize',
  AUTHORIZED: 'Review & execute',
  EXECUTED: 'Observe & reconcile',
  ATTESTED: 'Observe & reconcile',
};

/**
 * A command with nothing left to do (reconciled, denied, failed) is history,
 * not resumable work. Only a command still on the path to a result is brought
 * back to the front on load.
 */
const RESUMABLE = new Set(['PROPOSED', 'REVIEW', 'AUTHORIZED', 'EXECUTED', 'ATTESTED']);

export function isResumableCommandStatus(status: unknown): boolean {
  return typeof status === 'string' && RESUMABLE.has(status.trim().toUpperCase());
}

export function commandReceipt(command: unknown): CommandReceipt {
  const record = command as { command?: { status?: unknown }; status?: unknown } | null;
  const raw = record?.command?.status ?? record?.status;
  const status = typeof raw === 'string' && raw.trim() ? raw.trim().toUpperCase() : 'UNRECORDED';
  return {
    status,
    state:
      status === 'UNRECORDED' ? 'Status not recorded — not verified' : STATES[status] ?? `${status} — not verified`,
    action: ACTIONS[status] ?? 'Review evidence',
  };
}
