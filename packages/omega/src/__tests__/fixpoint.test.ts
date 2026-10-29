import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EMPTY_MEMORY, digestOf, stepFixpoint } from '../index.ts';

const value = { intent: 'summarize the loop', engine: 'Local Ollama' };

describe('@oceanicos/omega — fixpoint turn', () => {
  it('halts DIVERGENT on a scam without executing', async () => {
    let calls = 0;
    const turn = await stepFixpoint(
      { value, scam: true, evidence: true, authority: true, execute: () => (calls += 1) },
      EMPTY_MEMORY,
    );
    assert.equal(turn.verdict, 'DIVERGENT');
    assert.equal(turn.halted, true);
    assert.equal(turn.executed, false);
    assert.equal(calls, 0);
    assert.deepEqual(turn.memory, EMPTY_MEMORY);
  });

  it('halts UNKNOWN when evidence is empty', async () => {
    const turn = await stepFixpoint({
      value,
      scam: false,
      evidence: false,
      authority: true,
      execute: () => value,
    });
    assert.equal(turn.verdict, 'UNKNOWN');
    assert.equal(turn.executed, false);
    assert.match(turn.reason, /Evidence\(x\) = ∅/);
  });

  it('halts NOT_EXECUTED when authority is below the requirement', async () => {
    let calls = 0;
    const turn = await stepFixpoint({
      value,
      scam: false,
      evidence: true,
      authority: false,
      execute: () => (calls += 1),
    });
    assert.equal(turn.verdict, 'NOT_EXECUTED');
    assert.equal(calls, 0);
    assert.match(turn.reason, /Authority\(x\) < Required/);
  });

  it('appends Hash(x) to memory when expected and observed reconcile', async () => {
    const turn = await stepFixpoint({
      value,
      scam: false,
      evidence: true,
      authority: true,
      execute: () => ({ ...value }),
    });
    assert.equal(turn.verdict, 'VERIFIED');
    assert.equal(turn.halted, false);
    assert.equal(turn.remembered, true);
    assert.equal(turn.delta, digestOf(value));
    assert.deepEqual(turn.memory, [digestOf(value)]);
    assert.equal(turn.verification?.realityClaimed, false);
  });

  it('is a set union: a repeated verified delta is remembered once', async () => {
    const first = await stepFixpoint({
      value,
      scam: false,
      evidence: true,
      authority: true,
      execute: () => value,
    });
    const second = await stepFixpoint(
      { value, scam: false, evidence: true, authority: true, execute: () => value },
      first.memory,
    );
    assert.equal(second.verdict, 'VERIFIED');
    assert.equal(second.remembered, false);
    assert.deepEqual(second.memory, first.memory);
  });

  it('halts DIVERGENT and leaves memory untouched when observed differs', async () => {
    const memory = [digestOf({ other: true }) as string];
    const turn = await stepFixpoint(
      {
        value,
        scam: false,
        evidence: true,
        authority: true,
        execute: () => ({ intent: 'something else', engine: 'Local Ollama' }),
      },
      memory,
    );
    assert.equal(turn.verdict, 'DIVERGENT');
    assert.equal(turn.executed, true);
    assert.equal(turn.delta, null);
    assert.deepEqual(turn.memory, memory);
  });

  it('preserves UNKNOWN when execution throws', async () => {
    const turn = await stepFixpoint({
      value,
      scam: false,
      evidence: true,
      authority: true,
      execute: () => {
        throw new Error('handler offline');
      },
    });
    assert.equal(turn.verdict, 'UNKNOWN');
    assert.equal(turn.executed, true);
    assert.match(turn.reason, /EXECUTION_FAILED: handler offline/);
    assert.deepEqual(turn.memory, EMPTY_MEMORY);
  });
});
