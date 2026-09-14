import { OceanicosAuthEngine } from '../index';

describe('@omega-v/auth — OceanicosAuthEngine', () => {
  let auth: OceanicosAuthEngine;

  beforeEach(() => {
    auth = new OceanicosAuthEngine('test-master-secret-1234');
  });

  describe('Identity Creation & Retrieval', () => {
    it('should bootstrap system root identities', () => {
      const root = auth.getIdentity('did:omega:system:root');
      expect(root).toBeDefined();
      expect(root?.type).toBe('SYSTEM');
      expect(root?.capabilities).toContain('admin:all');

      const verifier = auth.getIdentity('did:omega:verifier:core');
      expect(verifier).toBeDefined();
      expect(verifier?.capabilities).toContain('verify:execute');
    });

    it('should create a new agent identity with capabilities and verifiable public key', () => {
      const created = auth.createIdentity('AGENT', ['observe:write', 'verify:execute']);

      expect(created.did).toMatch(/^did:omega:agent:/);
      expect(created.secret).toBeDefined();
      expect(created.document.type).toBe('AGENT');
      expect(created.document.capabilities).toContain('observe:write');
      expect(created.document.epoch).toBe(1);
      expect(created.document.revoked).toBe(false);
    });

    it('should list all identities', () => {
      auth.createIdentity('HUMAN', ['governance:vote']);
      const all = auth.listIdentities();
      expect(all.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Token Issuance & Verification', () => {
    it('should issue and verify a valid token with required capability', () => {
      const { did, secret } = auth.createIdentity('AGENT', ['observe:write', 'verify:execute']);

      const token = auth.issueToken(did, secret, 60000);
      expect(token).toMatch(/^Ω∞v-TOKEN-v1\./);

      const verification = auth.verifyToken(token, 'observe:write');
      expect(verification.valid).toBe(true);
      expect(verification.subject?.did).toBe(did);
      expect(verification.payload?.sub).toBe(did);
    });

    it('should grant access to admin:all for any required capability', () => {
      const token = auth.issueToken('did:omega:system:root', 'omega-root-system-secret');
      const verification = auth.verifyToken(token, 'governance:vote');
      expect(verification.valid).toBe(true);
    });

    it('should reject token with insufficient capability', () => {
      const { did, secret } = auth.createIdentity('HUMAN', ['governance:vote']);
      const token = auth.issueToken(did, secret);

      const verification = auth.verifyToken(token, 'attest:sign');
      expect(verification.valid).toBe(false);
      expect(verification.error).toContain('Insufficient capabilities');
    });

    it('should reject token with invalid secret or tampered signature', () => {
      const { did } = auth.createIdentity('SERVICE', ['observe:write']);
      expect(() => auth.issueToken(did, 'wrong-secret')).toThrow('Authentication Failed');

      const token = auth.issueToken('did:omega:system:root', 'omega-root-system-secret');
      const tampered = `${token.slice(0, -5)}abcde`;
      const verification = auth.verifyToken(tampered);
      expect(verification.valid).toBe(false);
      expect(verification.error).toBe('Invalid token signature');
    });

    it('should reject expired tokens', () => {
      const { did, secret } = auth.createIdentity('AGENT', ['observe:write']);
      const expiredToken = auth.issueToken(did, secret, -1000); // expired 1s ago

      const verification = auth.verifyToken(expiredToken);
      expect(verification.valid).toBe(false);
      expect(verification.error).toBe('Token expired');
    });
  });

  describe('Revocation & Key Rotation', () => {
    it('should revoke identity and deny token verification', () => {
      const { did, secret } = auth.createIdentity('SERVICE', ['observe:write']);
      const token = auth.issueToken(did, secret);

      expect(auth.verifyToken(token).valid).toBe(true);

      const revoked = auth.revokeIdentity(did);
      expect(revoked).toBe(true);

      const postRevocation = auth.verifyToken(token);
      expect(postRevocation.valid).toBe(false);
      expect(postRevocation.error).toBe('DID is revoked');
    });

    it('should rotate secret, increment epoch, and invalidate old secret', () => {
      const { did, secret: oldSecret } = auth.createIdentity('AGENT', ['observe:write']);

      const newSecret = auth.rotateSecret(did, oldSecret);
      expect(newSecret).not.toBe(oldSecret);

      const doc = auth.getIdentity(did);
      expect(doc?.epoch).toBe(2);

      // Old secret should fail
      expect(() => auth.issueToken(did, oldSecret)).toThrow('Authentication Failed');

      // New secret should succeed
      const token = auth.issueToken(did, newSecret);
      expect(auth.verifyToken(token).valid).toBe(true);
    });
  });
});
