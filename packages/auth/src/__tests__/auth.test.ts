import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { OceanicosAuthEngine } from '../index.ts';

describe('@omega-v/auth — OceanicosAuthEngine', () => {
  let auth: OceanicosAuthEngine;

  beforeEach(() => {
    auth = new OceanicosAuthEngine('01234567890123456789012345678901');
  });

  describe('Identity Creation & Retrieval', () => {
    it('should bootstrap system root identities', () => {
      const root = auth.getIdentity('did:omega:system:root');
      assert.ok(root);
      assert.equal(root.type, 'SYSTEM');
      assert.ok(root.capabilities.includes('admin:all'));

      const verifier = auth.getIdentity('did:omega:verifier:core');
      assert.ok(verifier);
      assert.equal(verifier.type, 'VERIFIER');
      assert.ok(verifier.capabilities.includes('verify:execute'));
    });

    it('should create a new agent identity with capabilities and verifiable public key', () => {
      const created = auth.createIdentity('AGENT', ['observe:write', 'verify:execute']);

      assert.match(created.did, /^did:omega:agent:/);
      assert.ok(created.secret);
      assert.equal(created.document.type, 'AGENT');
      assert.ok(created.document.capabilities.includes('observe:write'));
      assert.equal(created.document.epoch, 1);
      assert.equal(created.document.revoked, false);
    });

    it('should list all identities', () => {
      auth.createIdentity('HUMAN', ['governance:vote']);
      const all = auth.listIdentities();
      assert.ok(all.length >= 4);
    });
  });

  describe('Token Issuance & Verification', () => {
    it('should issue and verify a valid token with required capability', () => {
      const { did, secret } = auth.createIdentity('AGENT', ['observe:write', 'verify:execute']);

      const token = auth.issueToken(did, secret, 60000);
      assert.match(token, /^Ω∞v-TOKEN-v1\./);

      const verification = auth.verifyToken(token, 'observe:write');
      assert.equal(verification.valid, true);
      assert.equal(verification.subject?.did, did);
      assert.equal(verification.payload?.sub, did);
    });

    it('should grant access to admin:all for any required capability', () => {
      const { did, secret } = auth.createIdentity('SYSTEM', ['admin:all']);
      const token = auth.issueToken(did, secret);
      const verification = auth.verifyToken(token, 'governance:vote');
      assert.equal(verification.valid, true);
    });

    it('should reject token with insufficient capability', () => {
      const { did, secret } = auth.createIdentity('HUMAN', ['governance:vote']);
      const token = auth.issueToken(did, secret);

      const verification = auth.verifyToken(token, 'attest:sign');
      assert.equal(verification.valid, false);
      assert.match(verification.error ?? '', /Insufficient capabilities/);
    });

    it('should reject token with invalid secret or tampered signature', () => {
      const { did } = auth.createIdentity('SERVICE', ['observe:write']);
      assert.throws(() => auth.issueToken(did, 'wrong-secret'), /Authentication Failed/);

      const { did: systemDid, secret } = auth.createIdentity('SYSTEM', ['admin:all']);
      const token = auth.issueToken(systemDid, secret);
      const tampered = `${token.slice(0, -5)}abcde`;
      const verification = auth.verifyToken(tampered);
      assert.equal(verification.valid, false);
      assert.equal(verification.error, 'Invalid token signature');
    });

    it('should reject expired tokens', () => {
      const { did, secret } = auth.createIdentity('AGENT', ['observe:write']);
      const expiredToken = auth.issueToken(did, secret, -1000);

      const verification = auth.verifyToken(expiredToken);
      assert.equal(verification.valid, false);
      assert.equal(verification.error, 'Token expired');
    });
  });

  describe('Revocation & Key Rotation', () => {
    it('should revoke identity and deny token verification', () => {
      const { did, secret } = auth.createIdentity('SERVICE', ['observe:write']);
      const token = auth.issueToken(did, secret);

      assert.equal(auth.verifyToken(token).valid, true);

      const revoked = auth.revokeIdentity(did);
      assert.equal(revoked, true);

      const postRevocation = auth.verifyToken(token);
      assert.equal(postRevocation.valid, false);
      assert.equal(postRevocation.error, 'DID is revoked');
    });

    it('should rotate secret, increment epoch, and invalidate old secret', () => {
      const { did, secret: oldSecret } = auth.createIdentity('AGENT', ['observe:write']);

      const newSecret = auth.rotateSecret(did, oldSecret);
      assert.notEqual(newSecret, oldSecret);

      const doc = auth.getIdentity(did);
      assert.equal(doc?.epoch, 2);

      assert.throws(() => auth.issueToken(did, oldSecret), /Authentication Failed/);

      const token = auth.issueToken(did, newSecret);
      assert.equal(auth.verifyToken(token).valid, true);
    });
  });
});
