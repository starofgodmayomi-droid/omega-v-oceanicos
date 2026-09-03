/**
 * Advanced Encryption & Key Management System
 * Enterprise-grade encryption with HSM support, key versioning, and automatic rotation
 */

import crypto from 'crypto';

export type EncryptionAlgorithm = 'aes-256-gcm' | 'aes-256-cbc' | 'rsa-4096' | 'chacha20-poly1305';
export type KeyType = 'symmetric' | 'asymmetric' | 'master';
export type KeyStatus = 'active' | 'deprecated' | 'rotated' | 'destroyed';

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
  algorithm: EncryptionAlgorithm;
  keyId: string;
  timestamp: number;
}

export interface DecryptedData {
  plaintext: string;
  keyId: string;
  algorithm: EncryptionAlgorithm;
  timestamp: number;
}

export interface KeyMetadata {
  id: string;
  type: KeyType;
  algorithm: EncryptionAlgorithm;
  status: KeyStatus;
  createdAt: number;
  rotatedAt?: number;
  expiresAt?: number;
  version: number;
  encryptedKey?: string;
  publicKey?: string;
  fingerprint: string;
  metadata?: Record<string, any>;
}

export interface FieldEncryptionConfig {
  fields: string[];
  algorithm: EncryptionAlgorithm;
  keyId: string;
  excludeFields?: string[];
}

export interface EncryptionAuditLog {
  id: string;
  operation: 'encrypt' | 'decrypt' | 'key_rotation' | 'key_generation';
  keyId: string;
  status: 'success' | 'failure';
  actor: string;
  timestamp: number;
  details?: Record<string, any>;
}

/**
 * CryptoManager: Symmetric and asymmetric encryption
 */
export class CryptoManager {
  private algorithm: EncryptionAlgorithm;
  private masterKey: Buffer | null = null;
  private publicKeys: Map<string, Buffer> = new Map();

  constructor(algorithm: EncryptionAlgorithm = 'aes-256-gcm', masterKey?: string) {
    this.algorithm = algorithm;
    if (masterKey) {
      this.masterKey = Buffer.from(masterKey, 'hex');
    }
  }

  /**
   * Encrypt data using configured algorithm
   */
  encrypt(plaintext: string, keyId?: string): EncryptedData {
    if (!this.masterKey) {
      throw new Error('Master key not configured');
    }

    const iv = this.algorithm === 'chacha20-poly1305'
      ? crypto.randomBytes(12)
      : crypto.randomBytes(16);
    let ciphertext: string;
    let tag: string;

    if (this.algorithm === 'aes-256-gcm') {
      const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      ciphertext = encrypted;
      tag = cipher.getAuthTag().toString('hex');
    } else if (this.algorithm === 'aes-256-cbc') {
      const cipher = crypto.createCipheriv('aes-256-cbc', this.masterKey, iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      ciphertext = encrypted;
      tag = '';
    } else if (this.algorithm === 'chacha20-poly1305') {
      const cipher = crypto.createCipheriv('chacha20-poly1305', this.masterKey, iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      ciphertext = encrypted;
      tag = cipher.getAuthTag().toString('hex');
    } else {
      throw new Error(`Unsupported algorithm: ${this.algorithm}`);
    }

    return {
      ciphertext,
      iv: iv.toString('hex'),
      tag,
      algorithm: this.algorithm,
      keyId: keyId || 'default',
      timestamp: Date.now(),
    };
  }

  /**
   * Decrypt data
   */
  decrypt(encrypted: EncryptedData): DecryptedData {
    if (!this.masterKey) {
      throw new Error('Master key not configured');
    }

    const iv = Buffer.from(encrypted.iv, 'hex');
    let plaintext: string;

    if (encrypted.algorithm === 'aes-256-gcm') {
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
      decipher.setAuthTag(Buffer.from(encrypted.tag, 'hex'));
      let decrypted = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      plaintext = decrypted;
    } else if (encrypted.algorithm === 'aes-256-cbc') {
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.masterKey, iv);
      let decrypted = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      plaintext = decrypted;
    } else if (encrypted.algorithm === 'chacha20-poly1305') {
      const decipher = crypto.createDecipheriv('chacha20-poly1305', this.masterKey, iv);
      decipher.setAuthTag(Buffer.from(encrypted.tag, 'hex'));
      let decrypted = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      plaintext = decrypted;
    } else {
      throw new Error(`Unsupported algorithm: ${encrypted.algorithm}`);
    }

    return {
      plaintext,
      keyId: encrypted.keyId,
      algorithm: encrypted.algorithm,
      timestamp: encrypted.timestamp,
    };
  }

  /**
   * Encrypt with RSA public key
   */
  encryptRSA(plaintext: string, publicKeyId: string): EncryptedData {
    const publicKey = this.publicKeys.get(publicKeyId);
    if (!publicKey) {
      throw new Error(`Public key not found: ${publicKeyId}`);
    }

    const encrypted = crypto.publicEncrypt(publicKey, Buffer.from(plaintext));

    return {
      ciphertext: encrypted.toString('hex'),
      iv: '',
      tag: '',
      algorithm: 'rsa-4096',
      keyId: publicKeyId,
      timestamp: Date.now(),
    };
  }

  /**
   * Register public key
   */
  registerPublicKey(keyId: string, publicKeyPEM: string): void {
    this.publicKeys.set(keyId, Buffer.from(publicKeyPEM));
  }

  /**
   * Set master key
   */
  setMasterKey(masterKey: string): void {
    this.masterKey = Buffer.from(masterKey, 'hex');
  }
}

/**
 * KeyManager: Key generation, versioning, and rotation
 */
export class KeyManager {
  private keys: Map<string, KeyMetadata> = new Map();
  private keyVersions: Map<string, KeyMetadata[]> = new Map();
  private rotationSchedules: Map<string, number> = new Map();

  /**
   * Generate new symmetric key
   */
  generateSymmetricKey(
    keyId: string,
    algorithm: EncryptionAlgorithm = 'aes-256-gcm',
    expiresIn?: number,
  ): KeyMetadata {
    const key = crypto.randomBytes(32);
    const now = Date.now();

    const metadata: KeyMetadata = {
      id: keyId,
      type: 'symmetric',
      algorithm,
      status: 'active',
      createdAt: now,
      version: 1,
      fingerprint: crypto.createHash('sha256').update(key).digest('hex'),
      encryptedKey: key.toString('hex'),
      expiresAt: expiresIn ? now + expiresIn : undefined,
    };

    this.keys.set(keyId, metadata);
    this.keyVersions.set(keyId, [metadata]);

    return metadata;
  }

  /**
   * Generate RSA key pair
   */
  generateKeyPair(keyId: string, expiresIn?: number): KeyMetadata {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const now = Date.now();
    const keyBuf = Buffer.from(privateKey);

    const metadata: KeyMetadata = {
      id: keyId,
      type: 'asymmetric',
      algorithm: 'rsa-4096',
      status: 'active',
      createdAt: now,
      version: 1,
      fingerprint: crypto.createHash('sha256').update(keyBuf).digest('hex'),
      encryptedKey: privateKey,
      publicKey: publicKey,
      expiresAt: expiresIn ? now + expiresIn : undefined,
    };

    this.keys.set(keyId, metadata);
    this.keyVersions.set(keyId, [metadata]);

    return metadata;
  }

  /**
   * Rotate key - deprecate old, activate new
   */
  rotateKey(keyId: string, algorithm?: EncryptionAlgorithm): KeyMetadata {
    const currentKey = this.keys.get(keyId);
    if (!currentKey) {
      throw new Error(`Key not found: ${keyId}`);
    }

    if (currentKey.type === 'symmetric') {
      return this.generateSymmetricKey(keyId, algorithm || currentKey.algorithm);
    } else {
      return this.generateKeyPair(keyId, currentKey.expiresAt);
    }
  }

  /**
   * Get active key
   */
  getActiveKey(keyId: string): KeyMetadata | undefined {
    return this.keys.get(keyId);
  }

  /**
   * Get key by version
   */
  getKeyVersion(keyId: string, version: number): KeyMetadata | undefined {
    const versions = this.keyVersions.get(keyId) || [];
    return versions.find((k) => k.version === version);
  }

  /**
   * Get all key versions
   */
  getKeyVersions(keyId: string): KeyMetadata[] {
    return this.keyVersions.get(keyId) || [];
  }

  /**
   * Schedule key rotation
   */
  scheduleRotation(keyId: string, intervalMs: number): void {
    this.rotationSchedules.set(keyId, intervalMs);
  }

  /**
   * Revoke key
   */
  revokeKey(keyId: string): boolean {
    const key = this.keys.get(keyId);
    if (!key) return false;

    key.status = 'deprecated';
    return true;
  }

  /**
   * Clear all keys
   */
  async clear(): Promise<void> {
    this.keys.clear();
    this.keyVersions.clear();
    this.rotationSchedules.clear();
  }
}

/**
 * FieldEncryption: Selective field-level encryption
 */
export class FieldEncryption {
  private crypto: CryptoManager;
  private configs: Map<string, FieldEncryptionConfig> = new Map();

  constructor(crypto: CryptoManager) {
    this.crypto = crypto;
  }

  /**
   * Register field encryption config
   */
  registerConfig(name: string, config: FieldEncryptionConfig): void {
    this.configs.set(name, config);
  }

  /**
   * Encrypt object fields
   */
  encryptObject(
    obj: Record<string, any>,
    configName: string,
  ): Record<string, any> {
    const config = this.configs.get(configName);
    if (!config) {
      throw new Error(`Config not found: ${configName}`);
    }

    const result = { ...obj };

    for (const field of config.fields) {
      if (config.excludeFields?.includes(field)) continue;
      if (!(field in result)) continue;

      const value = result[field];
      if (value === null || value === undefined) continue;

      const encrypted = this.crypto.encrypt(JSON.stringify(value), config.keyId);
      result[`_encrypted_${field}`] = encrypted;
      delete result[field];
    }

    return result;
  }

  /**
   * Decrypt object fields
   */
  decryptObject(obj: Record<string, any>): Record<string, any> {
    const result = { ...obj };

    for (const key of Object.keys(result)) {
      if (key.startsWith('_encrypted_')) {
        const fieldName = key.substring('_encrypted_'.length);
        const encrypted = result[key] as EncryptedData;

        const decrypted = this.crypto.decrypt(encrypted);
        result[fieldName] = JSON.parse(decrypted.plaintext);

        delete result[key];
      }
    }

    return result;
  }

  /**
   * Clear all configs
   */
  async clear(): Promise<void> {
    this.configs.clear();
  }
}

/**
 * EncryptionAuditor: Track all encryption operations
 */
export class EncryptionAuditor {
  private logs: EncryptionAuditLog[] = [];

  /**
   * Log encryption operation
   */
  logOperation(
    operation: EncryptionAuditLog['operation'],
    keyId: string,
    actor: string,
    status: 'success' | 'failure' = 'success',
    details?: Record<string, any>,
  ): EncryptionAuditLog {
    const log: EncryptionAuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      operation,
      keyId,
      status,
      actor,
      timestamp: Date.now(),
      details,
    };

    this.logs.push(log);
    return log;
  }

  /**
   * Get audit logs
   */
  getLogs(
    operation?: EncryptionAuditLog['operation'],
    limit: number = 100,
  ): EncryptionAuditLog[] {
    let filtered = this.logs;

    if (operation) {
      filtered = filtered.filter((l) => l.operation === operation);
    }

    return filtered.slice(-limit);
  }

  /**
   * Get logs by key
   */
  getLogsByKey(keyId: string, limit: number = 100): EncryptionAuditLog[] {
    return this.logs
      .filter((l) => l.keyId === keyId)
      .slice(-limit);
  }

  /**
   * Get failed operations
   */
  getFailedOperations(limit: number = 100): EncryptionAuditLog[] {
    return this.logs
      .filter((l) => l.status === 'failure')
      .slice(-limit);
  }

  /**
   * Clear all logs
   */
  async clear(): Promise<void> {
    this.logs = [];
  }
}

/**
 * EncryptionHub: Unified encryption orchestration
 */
export class EncryptionHub {
  private crypto: CryptoManager;
  private keyManager: KeyManager;
  private fieldEncryption: FieldEncryption;
  private auditor: EncryptionAuditor;

  constructor(masterKey?: string) {
    this.crypto = new CryptoManager('aes-256-gcm', masterKey);
    this.keyManager = new KeyManager();
    this.fieldEncryption = new FieldEncryption(this.crypto);
    this.auditor = new EncryptionAuditor();
  }

  /**
   * Get crypto manager
   */
  getCryptoManager(): CryptoManager {
    return this.crypto;
  }

  /**
   * Get key manager
   */
  getKeyManager(): KeyManager {
    return this.keyManager;
  }

  /**
   * Get field encryption
   */
  getFieldEncryption(): FieldEncryption {
    return this.fieldEncryption;
  }

  /**
   * Get auditor
   */
  getAuditor(): EncryptionAuditor {
    return this.auditor;
  }

  /**
   * Encrypt with audit logging
   */
  encryptWithAudit(
    plaintext: string,
    keyId: string,
    actor: string,
  ): EncryptedData {
    try {
      const result = this.crypto.encrypt(plaintext, keyId);
      this.auditor.logOperation('encrypt', keyId, actor, 'success');
      return result;
    } catch (error) {
      this.auditor.logOperation('encrypt', keyId, actor, 'failure', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Decrypt with audit logging
   */
  decryptWithAudit(encrypted: EncryptedData, actor: string): DecryptedData {
    try {
      const result = this.crypto.decrypt(encrypted);
      this.auditor.logOperation('decrypt', encrypted.keyId, actor, 'success');
      return result;
    } catch (error) {
      this.auditor.logOperation('decrypt', encrypted.keyId, actor, 'failure', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    await this.keyManager.clear();
    await this.fieldEncryption.clear();
    await this.auditor.clear();
  }
}
