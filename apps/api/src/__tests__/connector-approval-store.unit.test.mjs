import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  ConnectorApprovalStore,
  connectorDeclarationDigest,
} from '../../dist/connector-approval-store.js';

test('connector declaration digests use canonical fields and preserve target binding', () => {
  const declaration = {
    id: 'github.read-repository',
    version: '1',
    system: 'github',
    capability: 'read-repository',
    authRef: 'none',
    scope: ['repo:starofgodmayomi-droid/omega-v-oceanicos'],
    mode: 'read-only',
    policyRefs: ['public-repository-read'],
    stopCondition: 'timeout',
    expectedObservation: 'github:starofgodmayomi-droid/omega-v-oceanicos:metadata',
    timeoutMs: 1000,
    maxAttempts: 1,
    rollbackSupported: false,
  };
  assert.equal(
    connectorDeclarationDigest(declaration),
    connectorDeclarationDigest(Object.fromEntries(Object.entries(declaration).reverse())),
  );
  assert.notEqual(
    connectorDeclarationDigest(declaration),
    connectorDeclarationDigest({
      ...declaration,
      scope: ['repo:another-owner/another-repository'],
    }),
  );
});

test('connector approvals are identity-bound, expire, revoke, and consume once', () => {
  const store = new ConnectorApprovalStore(':memory:');
  const identity = {
    issuer: 'https://identity.example.test',
    subject: 'operator-123',
    audience: 'omega-api',
    issuedAt: 100,
    expiresAt: 1000,
  };
  const digest = 'a'.repeat(64);

  try {
    const approval = store.create(identity, digest, 100);
    assert.equal(
      store.consume(approval.id, { ...identity, subject: 'operator-456' }, digest, 101),
      false,
    );
    assert.equal(store.consume(approval.id, identity, 'b'.repeat(64), 101), false);
    assert.equal(store.consume(approval.id, identity, digest, approval.expiresAt - 1), true);
    assert.equal(store.consume(approval.id, identity, digest, approval.expiresAt - 1), false);

    const expired = store.create(identity, digest, 200);
    assert.equal(store.consume(expired.id, identity, digest, expired.expiresAt), false);

    const revoked = store.create(identity, digest, 300);
    assert.equal(
      store.revoke(revoked.id, { ...identity, subject: 'operator-456' }, 301),
      false,
    );
    assert.equal(store.revoke(revoked.id, identity, 301), true);
    assert.equal(store.consume(revoked.id, identity, digest, 302), false);
  } finally {
    store.close();
  }
});

test('connector approvals survive store reload from the configured SQLite file', () => {
  const directory = mkdtempSync(join(tmpdir(), 'omega-connector-approvals-'));
  const path = join(directory, 'approvals.db');
  const identity = {
    issuer: 'https://identity.example.test',
    subject: 'operator-123',
    audience: 'omega-api',
    issuedAt: 100,
    expiresAt: 1000,
  };
  const digest = 'c'.repeat(64);
  let firstStore;
  let reloadedStore;

  try {
    firstStore = new ConnectorApprovalStore(path);
    const approval = firstStore.create(identity, digest, 100);
    firstStore.close();
    firstStore = undefined;

    reloadedStore = new ConnectorApprovalStore(path);
    assert.equal(reloadedStore.consume(approval.id, identity, digest, 101), true);
    assert.equal(reloadedStore.consume(approval.id, identity, digest, 102), false);
  } finally {
    firstStore?.close();
    reloadedStore?.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
