import { describe, expect, it } from '@jest/globals';
import { commandReceipt, isResumableCommandStatus } from '../../command-receipt';

describe('front command receipt', () => {
  it('never calls an executed command not executed', () => {
    expect(commandReceipt({ command: { status: 'EXECUTED' } })).toMatchObject({
      state: 'Executed — awaiting observation',
      action: 'Observe & reconcile',
    });
    expect(commandReceipt({ command: { status: 'VERIFIED' } })).toMatchObject({
      state: 'Executed — reconciled VERIFIED',
      action: 'Review evidence',
    });
    expect(commandReceipt({ command: { status: 'FAILED' } }).state).toBe(
      'Execution failed — not reconciled'
    );
  });

  it('names the next real step instead of repeating one fixed action', () => {
    expect(commandReceipt({ command: { status: 'PROPOSED' } }).action).toBe('Review & authorize');
    expect(commandReceipt({ command: { status: 'REVIEW' } }).action).toBe('Review & authorize');
    expect(commandReceipt({ command: { status: 'AUTHORIZED' } }).action).toBe('Review & execute');
    expect(commandReceipt({ command: { status: 'ATTESTED' } }).action).toBe('Observe & reconcile');
    expect(commandReceipt({ command: { status: 'DIVERGENT' } }).action).toBe('Review evidence');
  });

  it('keeps an absent or unrecorded status visibly unverified', () => {
    expect(commandReceipt(null).state).toBe('Status not recorded — not verified');
    expect(commandReceipt({}).state).toBe('Status not recorded — not verified');
    expect(commandReceipt({ command: { status: 'SOMETHING_NEW' } }).state).toBe(
      'SOMETHING_NEW — not verified'
    );
    expect(commandReceipt({ command: { status: 'SOMETHING_NEW' } }).action).toBe('Review evidence');
  });

  it('resumes only commands that still have a next step', () => {
    for (const status of ['PROPOSED', 'REVIEW', 'AUTHORIZED', 'EXECUTED', 'ATTESTED']) {
      expect(isResumableCommandStatus(status)).toBe(true);
    }
    for (const status of ['VERIFIED', 'DIVERGENT', 'UNKNOWN', 'DENIED', 'FAILED', '']) {
      expect(isResumableCommandStatus(status)).toBe(false);
    }
    expect(isResumableCommandStatus(undefined)).toBe(false);
  });
});
