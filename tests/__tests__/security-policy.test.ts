import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A cryptographic system needs somewhere to send a cryptographic flaw.
 *
 * This repository shipped an attestation format, three implementations of
 * it, and a published container with signed provenance — and had no
 * disclosure path. Someone finding a way to forge a signature had one
 * channel available: a public issue, which tells every reader how to forge
 * before anyone can fix it.
 *
 * The policy also has to scope honestly. The write endpoints are
 * unauthenticated by design and documented in GOVERNANCE.md; a policy that
 * did not say so would collect reports of a known property while burying
 * the ones that matter.
 */
describe('security policy', () => {
  const root = process.cwd();
  const policyPath = join(root, 'SECURITY.md');

  it('exists at the path GitHub looks for', () => {
    assert.equal(existsSync(policyPath), true);
  });

  const policy = readFileSync(policyPath, 'utf8');

  it('routes reports privately rather than into a public issue', () => {
    assert.ok(policy.includes('security/advisories/new'));
    assert.match(policy, /not a public issue|private vulnerability reporting/i);
  });

  it('scopes the attestation surface it actually implements', () => {
    for (const surface of ['envelope', 'Algorithm confusion', 'Revocation', 'Supply chain']) {
      assert.ok(policy.includes(surface));
    }
  });

  it('declares the unauthenticated writes out of scope, and points at where they are documented', () => {
    // Otherwise the policy invites reports of a property the governance
    // document already records, and real findings get lost among them.
    assert.ok(policy.includes('docs/GOVERNANCE.md'));
    assert.match(policy, /unauthenticated/i);
  });

  it('promises no response time it cannot keep', () => {
    // An unfunded project with no users cannot honour an SLA, and claiming
    // one would be the unbacked assertion this charter forbids.
    assert.match(policy, /no bounty and no service-level commitment/i);
  });

  it('names the specification so a reporter checks the right thing', () => {
    assert.ok(policy.includes('docs/spec/ATTESTATION-ENVELOPE.md'));
    // Three implementations of one format: a disagreement between any two
    // is a finding even without an exploit.
    assert.match(policy, /disagreement between any two of them is a finding/i);
  });
});
