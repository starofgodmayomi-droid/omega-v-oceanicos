import * as crypto from 'crypto';

export type DIDSubjectType = 'AGENT' | 'VERIFIER' | 'HUMAN' | 'SERVICE' | 'SYSTEM';

export type DIDCapability =
  'observe:write' | 'verify:execute' | 'attest:sign' | 'governance:vote' | 'admin:all';

export interface DIDDocument {
  did: string;
  type: DIDSubjectType;
  publicKey: string;
  capabilities: DIDCapability[];
  createdAt: string;
  revoked: boolean;
  epoch: number;
}

export interface AuthTokenPayload {
  sub: string;
  iss: string;
  iat: number;
  exp: number;
  capabilities: DIDCapability[];
  nonce: string;
}

export interface TokenVerificationResult {
  valid: boolean;
  subject?: DIDDocument;
  payload?: AuthTokenPayload;
  error?: string;
}

/**
 * OceanicosAuthEngine: Decentralized Identity (DID), Capability-Based Access Control,
 * and Cryptographic Key Rotation Engine for Ω∞v Oceanicos.
 *
 * ```
 * 💧 Ω∞v ::= DID(Subject) ⇄ Capability ⇄ Token ⇄ Verified Action
 * ```
 */
export class OceanicosAuthEngine {
  private identities: Map<string, DIDDocument> = new Map();
  private secrets: Map<string, string> = new Map(); // did -> secretHash
  private masterSecret: string;

  constructor(masterSecret?: string) {
    this.masterSecret = masterSecret || 'omega-v-master-cryptographic-salt';
    this.bootstrapSystemIdentities();
  }

  private bootstrapSystemIdentities(): void {
    // Bootstrap root system identity
    this.createIdentity(
      'SYSTEM',
      ['admin:all'],
      'omega-root-system-secret',
      'did:omega:system:root'
    );
    // Bootstrap verifier identity
    this.createIdentity(
      'VERIFIER',
      ['verify:execute', 'attest:sign'],
      'omega-verifier-secret',
      'did:omega:verifier:core'
    );
    // Bootstrap agent swarm identity
    this.createIdentity(
      'AGENT',
      ['observe:write', 'verify:execute'],
      'omega-agent-swarm-secret',
      'did:omega:agent:swarm'
    );
  }

  /**
   * Create a new DID identity with capabilities
   */
  public createIdentity(
    type: DIDSubjectType,
    capabilities: DIDCapability[] = ['observe:write'],
    customSecret?: string,
    explicitDid?: string
  ): { did: string; secret: string; document: DIDDocument } {
    const rawSecret = customSecret || crypto.randomBytes(24).toString('hex');
    const secretHash = this.hashSecret(rawSecret);

    const did =
      explicitDid ||
      `did:omega:${type.toLowerCase()}:${crypto.createHash('sha256').update(secretHash).digest('hex').slice(0, 16)}`;

    const publicKey = crypto
      .createHash('sha256')
      .update(`${did}:${secretHash}:${this.masterSecret}`)
      .digest('hex');

    const document: DIDDocument = {
      did,
      type,
      publicKey,
      capabilities,
      createdAt: new Date().toISOString(),
      revoked: false,
      epoch: 1,
    };

    this.identities.set(did, document);
    this.secrets.set(did, secretHash);

    return {
      did,
      secret: rawSecret,
      document,
    };
  }

  /**
   * Issue a signed cryptographic bearer token for a DID
   */
  public issueToken(did: string, secret: string, expiresInMs: number = 3600000): string {
    const doc = this.identities.get(did);
    if (!doc) {
      throw new Error(`DID not found: ${did}`);
    }
    if (doc.revoked) {
      throw new Error(`DID is revoked: ${did}`);
    }

    const secretHash = this.hashSecret(secret);
    if (this.secrets.get(did) !== secretHash) {
      throw new Error('Authentication Failed: Invalid secret for DID');
    }

    const now = Date.now();
    const payload: AuthTokenPayload = {
      sub: did,
      iss: 'omega-v-auth',
      iat: now,
      exp: now + expiresInMs,
      capabilities: doc.capabilities,
      nonce: crypto.randomBytes(8).toString('hex'),
    };

    const serializedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = this.signPayload(serializedPayload, secretHash);

    return `Ω∞v-TOKEN-v1.${serializedPayload}.${signature}`;
  }

  /**
   * Verify an incoming bearer token and enforce capabilities
   */
  public verifyToken(token: string, requiredCapability?: DIDCapability): TokenVerificationResult {
    if (!token || !token.startsWith('Ω∞v-TOKEN-v1.')) {
      return { valid: false, error: 'Malformed or missing Ω∞v token' };
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token structure' };
    }

    const [, payloadBase64, signature] = parts;
    let payload: AuthTokenPayload;

    try {
      payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    } catch {
      return { valid: false, error: 'Failed to decode token payload' };
    }

    // Check expiration
    if (Date.now() > payload.exp) {
      return { valid: false, error: 'Token expired', payload };
    }

    // Retrieve DID document
    const doc = this.identities.get(payload.sub);
    if (!doc) {
      return { valid: false, error: 'DID not found', payload };
    }
    if (doc.revoked) {
      return { valid: false, error: 'DID is revoked', payload, subject: doc };
    }

    // Verify cryptographic signature against secret hash
    const secretHash = this.secrets.get(payload.sub);
    if (!secretHash) {
      return { valid: false, error: 'DID credentials not found', payload, subject: doc };
    }

    const expectedSignature = this.signPayload(payloadBase64, secretHash);
    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid token signature', payload, subject: doc };
    }

    // Enforce capability if specified
    if (requiredCapability) {
      const hasCapability =
        doc.capabilities.includes('admin:all') || doc.capabilities.includes(requiredCapability);
      if (!hasCapability) {
        return {
          valid: false,
          error: `Insufficient capabilities: requires '${requiredCapability}'`,
          payload,
          subject: doc,
        };
      }
    }

    return {
      valid: true,
      subject: doc,
      payload,
    };
  }

  /**
   * Revoke a DID identity
   */
  public revokeIdentity(did: string): boolean {
    const doc = this.identities.get(did);
    if (!doc) return false;
    doc.revoked = true;
    return true;
  }

  /**
   * Rotate cryptographic secret for a DID identity
   */
  public rotateSecret(did: string, oldSecret: string): string {
    const doc = this.identities.get(did);
    if (!doc || doc.revoked) {
      throw new Error(`DID not eligible for rotation: ${did}`);
    }

    const oldSecretHash = this.hashSecret(oldSecret);
    if (this.secrets.get(did) !== oldSecretHash) {
      throw new Error('Rotation Failed: Invalid current secret');
    }

    const newSecret = crypto.randomBytes(24).toString('hex');
    const newSecretHash = this.hashSecret(newSecret);

    this.secrets.set(did, newSecretHash);
    doc.epoch++;
    doc.publicKey = crypto
      .createHash('sha256')
      .update(`${did}:${newSecretHash}:${this.masterSecret}`)
      .digest('hex');

    return newSecret;
  }

  /**
   * Get DID document by DID string
   */
  public getIdentity(did: string): DIDDocument | null {
    return this.identities.get(did) || null;
  }

  /**
   * List all registered DID documents
   */
  public listIdentities(): DIDDocument[] {
    return Array.from(this.identities.values());
  }

  private hashSecret(secret: string): string {
    return crypto.createHash('sha256').update(`${secret}:${this.masterSecret}`).digest('hex');
  }

  private signPayload(payloadBase64: string, secretHash: string): string {
    return crypto
      .createHmac('sha256', `${secretHash}:${this.masterSecret}`)
      .update(payloadBase64)
      .digest('hex');
  }
}

export default OceanicosAuthEngine;
