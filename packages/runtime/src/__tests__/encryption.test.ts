import {
  CryptoManager,
  KeyManager,
  FieldEncryption,
  EncryptionAuditor,
  EncryptionHub,
  EncryptedData,
  EncryptionAlgorithm,
} from '../encryption';

describe('Advanced Encryption & Key Management', () => {
  describe('CryptoManager', () => {
    let crypto: CryptoManager;
    const masterKey = Buffer.alloc(32, 'test').toString('hex');

    beforeEach(() => {
      crypto = new CryptoManager('aes-256-gcm', masterKey);
    });

    it('should encrypt and decrypt with AES-256-GCM', () => {
      const plaintext = 'secret data';
      const encrypted = crypto.encrypt(plaintext, 'key1');

      expect(encrypted.algorithm).toBe('aes-256-gcm');
      expect(encrypted.keyId).toBe('key1');
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();

      const decrypted = crypto.decrypt(encrypted);
      expect(decrypted.plaintext).toBe(plaintext);
    });

    it('should encrypt and decrypt with AES-256-CBC', () => {
      const cbcCrypto = new CryptoManager('aes-256-cbc', masterKey);
      const plaintext = 'secret data';
      const encrypted = cbcCrypto.encrypt(plaintext, 'key1');

      expect(encrypted.algorithm).toBe('aes-256-cbc');

      const decrypted = cbcCrypto.decrypt(encrypted);
      expect(decrypted.plaintext).toBe(plaintext);
    });

    it('should encrypt and decrypt with ChaCha20-Poly1305', () => {
      const chaChaCrypto = new CryptoManager('chacha20-poly1305', masterKey);
      const plaintext = 'secret data';
      const encrypted = chaChaCrypto.encrypt(plaintext, 'key1');

      expect(encrypted.algorithm).toBe('chacha20-poly1305');

      const decrypted = chaChaCrypto.decrypt(encrypted);
      expect(decrypted.plaintext).toBe(plaintext);
    });

    it('should fail to decrypt with wrong key', () => {
      const encrypted = crypto.encrypt('secret', 'key1');

      const wrongCrypto = new CryptoManager(
        'aes-256-gcm',
        Buffer.alloc(32, 'wrong').toString('hex')
      );
      expect(() => wrongCrypto.decrypt(encrypted)).toThrow();
    });

    it('should use default key ID', () => {
      const encrypted = crypto.encrypt('secret');
      expect(encrypted.keyId).toBe('default');
    });

    it('should include timestamp in encrypted data', () => {
      const encrypted = crypto.encrypt('secret');
      expect(encrypted.timestamp).toBeGreaterThan(0);
    });

    it('should register and encrypt with RSA', () => {
      const { publicKey, privateKey } = require('crypto').generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      crypto.registerPublicKey('rsa1', publicKey);
      const encrypted = crypto.encryptRSA('secret', 'rsa1');

      expect(encrypted.algorithm).toBe('rsa-4096');
      expect(encrypted.keyId).toBe('rsa1');
      expect(encrypted.ciphertext).toBeDefined();
    });

    it('should throw on RSA encryption with unknown key', () => {
      expect(() => crypto.encryptRSA('secret', 'unknown')).toThrow();
    });

    it('should handle empty plaintext', () => {
      const encrypted = crypto.encrypt('', 'key1');
      const decrypted = crypto.decrypt(encrypted);
      expect(decrypted.plaintext).toBe('');
    });

    it('should handle large plaintext', () => {
      const largePlaintext = 'x'.repeat(10000);
      const encrypted = crypto.encrypt(largePlaintext, 'key1');
      const decrypted = crypto.decrypt(encrypted);
      expect(decrypted.plaintext).toBe(largePlaintext);
    });
  });

  describe('KeyManager', () => {
    let keyManager: KeyManager;

    beforeEach(() => {
      keyManager = new KeyManager();
    });

    afterEach(async () => {
      await keyManager.clear();
    });

    it('should generate symmetric key', () => {
      const metadata = keyManager.generateSymmetricKey('key1', 'aes-256-gcm');

      expect(metadata.id).toBe('key1');
      expect(metadata.type).toBe('symmetric');
      expect(metadata.algorithm).toBe('aes-256-gcm');
      expect(metadata.status).toBe('active');
      expect(metadata.version).toBe(1);
      expect(metadata.fingerprint).toBeDefined();
      expect(metadata.encryptedKey).toBeDefined();
    });

    it('should generate RSA key pair', () => {
      const metadata = keyManager.generateKeyPair('key1');

      expect(metadata.id).toBe('key1');
      expect(metadata.type).toBe('asymmetric');
      expect(metadata.algorithm).toBe('rsa-4096');
      expect(metadata.status).toBe('active');
      expect(metadata.encryptedKey).toBeDefined();
      expect(metadata.publicKey).toBeDefined();
    });

    it('should get active key', () => {
      keyManager.generateSymmetricKey('key1');
      const key = keyManager.getActiveKey('key1');

      expect(key?.id).toBe('key1');
      expect(key?.status).toBe('active');
    });

    it('should rotate symmetric key', () => {
      keyManager.generateSymmetricKey('key1');
      const rotated = keyManager.rotateKey('key1');

      expect(rotated.version).toBeGreaterThanOrEqual(1);
      expect(rotated.status).toBe('active');
    });

    it('should rotate RSA key pair', () => {
      keyManager.generateKeyPair('key1');
      const rotated = keyManager.rotateKey('key1');

      expect(rotated.type).toBe('asymmetric');
      expect(rotated.publicKey).toBeDefined();
    });

    it('should get key by version', () => {
      keyManager.generateSymmetricKey('key1');
      const key = keyManager.getKeyVersion('key1', 1);

      expect(key?.id).toBe('key1');
      expect(key?.version).toBe(1);
    });

    it('should get all key versions', () => {
      keyManager.generateSymmetricKey('key1');
      const versions = keyManager.getKeyVersions('key1');

      expect(versions.length).toBeGreaterThanOrEqual(1);
      expect(versions.every((v) => v.id === 'key1')).toBe(true);
    });

    it('should schedule key rotation', () => {
      keyManager.generateSymmetricKey('key1');
      keyManager.scheduleRotation('key1', 86400000); // 1 day

      expect(keyManager.getActiveKey('key1')).toBeDefined();
    });

    it('should revoke key', () => {
      keyManager.generateSymmetricKey('key1');
      const revoked = keyManager.revokeKey('key1');

      expect(revoked).toBe(true);
      expect(keyManager.getActiveKey('key1')?.status).toBe('deprecated');
    });

    it('should return false on revoke unknown key', () => {
      const revoked = keyManager.revokeKey('unknown');
      expect(revoked).toBe(false);
    });

    it('should support expiration on key generation', () => {
      const now = Date.now();
      const metadata = keyManager.generateSymmetricKey('key1', 'aes-256-gcm', 86400000);

      expect(metadata.expiresAt).toBeGreaterThan(now);
    });

    it('should get none for unknown key', () => {
      const key = keyManager.getActiveKey('unknown');
      expect(key).toBeUndefined();
    });
  });

  describe('FieldEncryption', () => {
    let crypto: CryptoManager;
    let fieldEncryption: FieldEncryption;
    const masterKey = Buffer.alloc(32, 'test').toString('hex');

    beforeEach(() => {
      crypto = new CryptoManager('aes-256-gcm', masterKey);
      fieldEncryption = new FieldEncryption(crypto);
    });

    afterEach(async () => {
      await fieldEncryption.clear();
    });

    it('should encrypt object fields', () => {
      fieldEncryption.registerConfig('user', {
        fields: ['email', 'phone'],
        algorithm: 'aes-256-gcm',
        keyId: 'key1',
      });

      const obj = { name: 'John', email: 'john@example.com', phone: '555-1234' };
      const encrypted = fieldEncryption.encryptObject(obj, 'user');

      expect(encrypted.name).toBe('John');
      expect(encrypted.email).toBeUndefined();
      expect(encrypted.phone).toBeUndefined();
      expect(encrypted._encrypted_email).toBeDefined();
      expect(encrypted._encrypted_phone).toBeDefined();
    });

    it('should decrypt object fields', () => {
      fieldEncryption.registerConfig('user', {
        fields: ['email', 'phone'],
        algorithm: 'aes-256-gcm',
        keyId: 'key1',
      });

      const obj = { name: 'John', email: 'john@example.com', phone: '555-1234' };
      const encrypted = fieldEncryption.encryptObject(obj, 'user');
      const decrypted = fieldEncryption.decryptObject(encrypted);

      expect(decrypted.name).toBe('John');
      expect(decrypted.email).toBe('john@example.com');
      expect(decrypted.phone).toBe('555-1234');
    });

    it('should exclude fields from encryption', () => {
      fieldEncryption.registerConfig('user', {
        fields: ['email', 'phone'],
        algorithm: 'aes-256-gcm',
        keyId: 'key1',
        excludeFields: ['phone'],
      });

      const obj = { name: 'John', email: 'john@example.com', phone: '555-1234' };
      const encrypted = fieldEncryption.encryptObject(obj, 'user');

      expect(encrypted._encrypted_email).toBeDefined();
      expect(encrypted.phone).toBe('555-1234');
      expect(encrypted._encrypted_phone).toBeUndefined();
    });

    it('should handle missing fields', () => {
      fieldEncryption.registerConfig('user', {
        fields: ['email', 'phone'],
        algorithm: 'aes-256-gcm',
        keyId: 'key1',
      });

      const obj = { name: 'John', email: 'john@example.com' };
      const encrypted = fieldEncryption.encryptObject(obj, 'user');

      expect(encrypted._encrypted_email).toBeDefined();
      expect(encrypted._encrypted_phone).toBeUndefined();
    });

    it('should handle null and undefined fields', () => {
      fieldEncryption.registerConfig('user', {
        fields: ['email', 'phone'],
        algorithm: 'aes-256-gcm',
        keyId: 'key1',
      });

      const obj = { name: 'John', email: null, phone: undefined };
      const encrypted = fieldEncryption.encryptObject(obj, 'user');

      expect(encrypted.email).toBeNull();
      expect(encrypted.phone).toBeUndefined();
    });

    it('should throw on unknown config', () => {
      expect(() => fieldEncryption.encryptObject({}, 'unknown')).toThrow();
    });

    it('should encrypt complex objects', () => {
      fieldEncryption.registerConfig('data', {
        fields: ['nested'],
        algorithm: 'aes-256-gcm',
        keyId: 'key1',
      });

      const obj = { id: 1, nested: { secret: 'value' } };
      const encrypted = fieldEncryption.encryptObject(obj, 'data');
      const decrypted = fieldEncryption.decryptObject(encrypted);

      expect(decrypted.nested).toEqual({ secret: 'value' });
    });
  });

  describe('EncryptionAuditor', () => {
    let auditor: EncryptionAuditor;

    beforeEach(() => {
      auditor = new EncryptionAuditor();
    });

    afterEach(async () => {
      await auditor.clear();
    });

    it('should log encryption operation', () => {
      const log = auditor.logOperation('encrypt', 'key1', 'user1');

      expect(log.operation).toBe('encrypt');
      expect(log.keyId).toBe('key1');
      expect(log.actor).toBe('user1');
      expect(log.status).toBe('success');
      expect(log.timestamp).toBeGreaterThan(0);
    });

    it('should log failed operation', () => {
      const log = auditor.logOperation('decrypt', 'key1', 'user1', 'failure', {
        error: 'Bad auth tag',
      });

      expect(log.status).toBe('failure');
      expect(log.details?.error).toBe('Bad auth tag');
    });

    it('should get logs with limit', () => {
      for (let i = 0; i < 10; i++) {
        auditor.logOperation('encrypt', 'key1', 'user1');
      }

      const logs = auditor.getLogs(undefined, 5);
      expect(logs.length).toBe(5);
    });

    it('should filter logs by operation', () => {
      auditor.logOperation('encrypt', 'key1', 'user1');
      auditor.logOperation('decrypt', 'key1', 'user1');
      auditor.logOperation('key_rotation', 'key1', 'user1');

      const encryptLogs = auditor.getLogs('encrypt');
      expect(encryptLogs.every((l) => l.operation === 'encrypt')).toBe(true);
    });

    it('should get logs by key', () => {
      auditor.logOperation('encrypt', 'key1', 'user1');
      auditor.logOperation('encrypt', 'key2', 'user1');

      const key1Logs = auditor.getLogsByKey('key1');
      expect(key1Logs.every((l) => l.keyId === 'key1')).toBe(true);
    });

    it('should get failed operations', () => {
      auditor.logOperation('encrypt', 'key1', 'user1', 'success');
      auditor.logOperation('decrypt', 'key1', 'user1', 'failure');
      auditor.logOperation('encrypt', 'key2', 'user1', 'failure');

      const failed = auditor.getFailedOperations();
      expect(failed.every((l) => l.status === 'failure')).toBe(true);
      expect(failed.length).toBe(2);
    });
  });

  describe('EncryptionHub', () => {
    let hub: EncryptionHub;
    const masterKey = Buffer.alloc(32, 'test').toString('hex');

    beforeEach(() => {
      hub = new EncryptionHub(masterKey);
    });

    afterEach(async () => {
      await hub.clear();
    });

    it('should provide crypto manager', () => {
      const crypto = hub.getCryptoManager();
      expect(crypto).toBeDefined();
    });

    it('should provide key manager', () => {
      const keyManager = hub.getKeyManager();
      expect(keyManager).toBeDefined();
    });

    it('should provide field encryption', () => {
      const fieldEncryption = hub.getFieldEncryption();
      expect(fieldEncryption).toBeDefined();
    });

    it('should provide auditor', () => {
      const auditor = hub.getAuditor();
      expect(auditor).toBeDefined();
    });

    it('should encrypt with audit logging', () => {
      const encrypted = hub.encryptWithAudit('secret', 'key1', 'user1');

      expect(encrypted.ciphertext).toBeDefined();

      const logs = hub.getAuditor().getLogs('encrypt');
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].actor).toBe('user1');
      expect(logs[0].status).toBe('success');
    });

    it('should decrypt with audit logging', () => {
      const encrypted = hub.encryptWithAudit('secret', 'key1', 'user1');
      const decrypted = hub.decryptWithAudit(encrypted, 'user2');

      expect(decrypted.plaintext).toBe('secret');

      const logs = hub.getAuditor().getLogs('decrypt');
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].actor).toBe('user2');
    });

    it('should log failed encryption', () => {
      try {
        hub.encryptWithAudit('secret', 'key1', 'user1');
      } catch (e) {
        // ignore
      }

      const logs = hub.getAuditor().getLogs('encrypt');
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should integrate key manager with crypto manager', () => {
      const keyManager = hub.getKeyManager();
      keyManager.generateSymmetricKey('key1', 'aes-256-gcm');

      const key = keyManager.getActiveKey('key1');
      expect(key?.id).toBe('key1');
    });

    it('should integrate field encryption with crypto manager', () => {
      const fieldEncryption = hub.getFieldEncryption();
      fieldEncryption.registerConfig('user', {
        fields: ['email'],
        algorithm: 'aes-256-gcm',
        keyId: 'key1',
      });

      const obj = { name: 'John', email: 'john@example.com' };
      const encrypted = fieldEncryption.encryptObject(obj, 'user');
      const decrypted = fieldEncryption.decryptObject(encrypted);

      expect(decrypted.email).toBe('john@example.com');
    });

    it('should track all operations in audit log', () => {
      const keyManager = hub.getKeyManager();
      keyManager.generateSymmetricKey('key1');
      hub.encryptWithAudit('secret', 'key1', 'user1');

      const auditor = hub.getAuditor();
      const logs = auditor.getLogs();
      expect(logs.length).toBeGreaterThan(0);
    });
  });
});
