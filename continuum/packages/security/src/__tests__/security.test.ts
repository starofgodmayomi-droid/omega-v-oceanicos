import { SecurityEngine } from '../index';
import { IdentitySubject, SecurityToken } from '@omega-v/types';

describe('SecurityEngine (Sections XVIII & XIX)', () => {
  let engine: SecurityEngine;
  let subject: IdentitySubject;

  beforeEach(() => {
    engine = new SecurityEngine('test-secret-key');
    subject = {
      id: 'agent-observer-1',
      type: 'AGENT',
      name: 'Observer Agent',
      permissions: ['CAN_OBSERVE', 'CAN_VERIFY'],
      issuedAt: new Date().toISOString(),
    };
  });

  describe('Capability Tokens & Signatures', () => {
    it('should issue a valid signed security token', () => {
      const token = engine.issueToken(subject);
      expect(token.subjectId).toBe('agent-observer-1');
      expect(token.signature).toHaveLength(64);
      expect(engine.verifyToken(token)).toBe(true);
    });

    it('should reject tampered token signatures', () => {
      const token = engine.issueToken(subject);
      const tampered: SecurityToken = {
        ...token,
        signature: '0000000000000000000000000000000000000000000000000000000000000000',
      };
      expect(engine.verifyToken(tampered)).toBe(false);
    });

    it('should reject expired tokens', () => {
      const token = engine.issueToken(subject, -10); // expired 10s ago
      expect(engine.verifyToken(token)).toBe(false);
    });
  });

  describe('Authorization & Least Privilege', () => {
    it('should grant authorization when permission exists', () => {
      const token = engine.issueToken(subject);
      const res = engine.authorize(subject, 'CAN_OBSERVE', token);
      expect(res.allowed).toBe(true);
      expect(res.reason).toBe('Permission granted');
    });

    it('should deny authorization when permission is missing', () => {
      const token = engine.issueToken(subject);
      const res = engine.authorize(subject, 'CAN_ACT', token);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Missing required permission');
    });

    it('should log all authorization decisions to audit trail', () => {
      engine.authorize(subject, 'CAN_OBSERVE');
      engine.authorize(subject, 'CAN_ACT');

      const trail = engine.getAuditTrail();
      expect(trail).toHaveLength(2);
      expect(trail[0].allowed).toBe(true);
      expect(trail[1].allowed).toBe(false);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize dangerous script tags and command separators', () => {
      const dangerous = '<script>alert("xss")</script>; rm -rf /';
      const clean = engine.sanitizeInput(dangerous);
      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain(';');
    });
  });
});
