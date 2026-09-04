/**
 * Express middleware for encryption and key management
 * Provides endpoints for cryptographic operations, key management, and field encryption
 */

import { Request, Response, NextFunction } from 'express';
import {
  CryptoManager,
  KeyManager,
  FieldEncryption,
  EncryptionAuditor,
  EncryptionHub,
  EncryptionAlgorithm,
  FieldEncryptionConfig,
} from '@omega-v/runtime';

export interface EncryptionMiddlewareOptions {
  hub: EncryptionHub;
}

declare global {
  namespace Express {
    interface Request {
      encryption?: {
        crypto: CryptoManager;
        keyManager: KeyManager;
        fieldEncryption: FieldEncryption;
        auditor: EncryptionAuditor;
      };
    }
  }
}

/**
 * Attach encryption to request
 */
export function attachEncryptionMiddleware(options: EncryptionMiddlewareOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.encryption = {
      crypto: options.hub.getCryptoManager(),
      keyManager: options.hub.getKeyManager(),
      fieldEncryption: options.hub.getFieldEncryption(),
      auditor: options.hub.getAuditor(),
    };
    next();
  };
}

/**
 * Encrypt data endpoint
 */
export function encryptEndpoint(hub: EncryptionHub) {
  return (req: Request, res: Response) => {
    const { plaintext, keyId, algorithm } = req.body;
    const actor = (req as any).user?.id || 'anonymous';

    if (!plaintext) {
      return res.status(400).json({
        error: 'Missing required field: plaintext',
      });
    }

    try {
      const encrypted = hub.encryptWithAudit(plaintext, keyId || 'default', actor);

      res.status(201).json({
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        tag: encrypted.tag,
        algorithm: encrypted.algorithm,
        keyId: encrypted.keyId,
        message: 'Data encrypted successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Encryption failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Decrypt data endpoint
 */
export function decryptEndpoint(hub: EncryptionHub) {
  return (req: Request, res: Response) => {
    const { ciphertext, iv, tag, algorithm, keyId } = req.body;
    const actor = (req as any).user?.id || 'anonymous';

    if (!ciphertext || !iv || !algorithm || !keyId) {
      return res.status(400).json({
        error: 'Missing required fields: ciphertext, iv, algorithm, keyId',
      });
    }

    try {
      const decrypted = hub.decryptWithAudit(
        {
          ciphertext,
          iv,
          tag: tag || '',
          algorithm: algorithm as EncryptionAlgorithm,
          keyId,
          timestamp: Date.now(),
        },
        actor,
      );

      res.json({
        plaintext: decrypted.plaintext,
        keyId: decrypted.keyId,
        algorithm: decrypted.algorithm,
        message: 'Data decrypted successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Decryption failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Generate symmetric key endpoint
 */
export function generateSymmetricKeyEndpoint(hub: EncryptionHub) {
  return (req: Request, res: Response) => {
    const { keyId, algorithm, expiresIn } = req.body;
    const actor = (req as any).user?.id || 'anonymous';

    if (!keyId) {
      return res.status(400).json({
        error: 'Missing required field: keyId',
      });
    }

    try {
      const keyManager = hub.getKeyManager();
      const metadata = keyManager.generateSymmetricKey(
        keyId,
        (algorithm as EncryptionAlgorithm) || 'aes-256-gcm',
        expiresIn,
      );

      const auditor = hub.getAuditor();
      auditor.logOperation('key_generation', keyId, actor, 'success', {
        keyType: 'symmetric',
        algorithm: metadata.algorithm,
      });

      res.status(201).json({
        id: metadata.id,
        type: metadata.type,
        algorithm: metadata.algorithm,
        status: metadata.status,
        version: metadata.version,
        fingerprint: metadata.fingerprint,
        createdAt: new Date(metadata.createdAt).toISOString(),
        message: 'Symmetric key generated successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Key generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Generate RSA key pair endpoint
 */
export function generateKeyPairEndpoint(hub: EncryptionHub) {
  return (req: Request, res: Response) => {
    const { keyId, expiresIn } = req.body;
    const actor = (req as any).user?.id || 'anonymous';

    if (!keyId) {
      return res.status(400).json({
        error: 'Missing required field: keyId',
      });
    }

    try {
      const keyManager = hub.getKeyManager();
      const metadata = keyManager.generateKeyPair(keyId, expiresIn);

      const auditor = hub.getAuditor();
      auditor.logOperation('key_generation', keyId, actor, 'success', {
        keyType: 'asymmetric',
        algorithm: metadata.algorithm,
      });

      res.status(201).json({
        id: metadata.id,
        type: metadata.type,
        algorithm: metadata.algorithm,
        status: metadata.status,
        version: metadata.version,
        fingerprint: metadata.fingerprint,
        publicKey: metadata.publicKey,
        createdAt: new Date(metadata.createdAt).toISOString(),
        message: 'RSA key pair generated successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Key pair generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Rotate key endpoint
 */
export function rotateKeyEndpoint(hub: EncryptionHub) {
  return (req: Request, res: Response) => {
    const { keyId, algorithm } = req.body;
    const actor = (req as any).user?.id || 'anonymous';

    if (!keyId) {
      return res.status(400).json({
        error: 'Missing required field: keyId',
      });
    }

    try {
      const keyManager = hub.getKeyManager();
      const newKey = keyManager.rotateKey(keyId, algorithm as EncryptionAlgorithm);

      const auditor = hub.getAuditor();
      auditor.logOperation('key_rotation', keyId, actor, 'success', {
        oldVersion: newKey.version - 1,
        newVersion: newKey.version,
      });

      res.json({
        id: newKey.id,
        type: newKey.type,
        algorithm: newKey.algorithm,
        status: newKey.status,
        version: newKey.version,
        fingerprint: newKey.fingerprint,
        createdAt: new Date(newKey.createdAt).toISOString(),
        message: 'Key rotated successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Key rotation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Get key endpoint
 */
export function getKeyEndpoint(hub: EncryptionHub) {
  return (req: Request, res: Response) => {
    const { keyId } = req.params;

    try {
      const keyManager = hub.getKeyManager();
      const key = keyManager.getActiveKey(keyId);

      if (!key) {
        return res.status(404).json({
          error: 'Key not found',
          keyId,
        });
      }

      res.json({
        id: key.id,
        type: key.type,
        algorithm: key.algorithm,
        status: key.status,
        version: key.version,
        fingerprint: key.fingerprint,
        createdAt: new Date(key.createdAt).toISOString(),
        expiresAt: key.expiresAt ? new Date(key.expiresAt).toISOString() : null,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve key',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Revoke key endpoint
 */
export function revokeKeyEndpoint(hub: EncryptionHub) {
  return (req: Request, res: Response) => {
    const { keyId } = req.params;
    const actor = (req as any).user?.id || 'anonymous';

    try {
      const keyManager = hub.getKeyManager();
      const revoked = keyManager.revokeKey(keyId);

      if (!revoked) {
        return res.status(404).json({
          error: 'Key not found',
          keyId,
        });
      }

      const auditor = hub.getAuditor();
      auditor.logOperation('key_rotation', keyId, actor, 'success', {
        action: 'revoke',
      });

      res.json({
        keyId,
        message: 'Key revoked successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Key revocation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Register field encryption config endpoint
 */
export function registerFieldConfigEndpoint(hub: EncryptionHub) {
  return (req: Request, res: Response) => {
    const { name, fields, algorithm, keyId, excludeFields } = req.body;

    if (!name || !fields || !algorithm || !keyId) {
      return res.status(400).json({
        error: 'Missing required fields: name, fields, algorithm, keyId',
      });
    }

    try {
      const fieldEncryption = hub.getFieldEncryption();
      const config: FieldEncryptionConfig = {
        fields,
        algorithm: algorithm as EncryptionAlgorithm,
        keyId,
        excludeFields,
      };

      fieldEncryption.registerConfig(name, config);

      res.status(201).json({
        name,
        fields,
        algorithm,
        keyId,
        excludeFields,
        message: 'Field encryption config registered successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Configuration registration failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Encrypt object fields endpoint
 */
export function encryptObjectEndpoint(hub: EncryptionHub) {
  return (req: Request, res: Response) => {
    const { configName, data } = req.body;

    if (!configName || !data) {
      return res.status(400).json({
        error: 'Missing required fields: configName, data',
      });
    }

    try {
      const fieldEncryption = hub.getFieldEncryption();
      const encrypted = fieldEncryption.encryptObject(data, configName);

      res.json({
        encrypted,
        message: 'Object fields encrypted successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Field encryption failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Decrypt object fields endpoint
 */
export function decryptObjectEndpoint(hub: EncryptionHub) {
  return (req: Request, res: Response) => {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({
        error: 'Missing required field: data',
      });
    }

    try {
      const fieldEncryption = hub.getFieldEncryption();
      const decrypted = fieldEncryption.decryptObject(data);

      res.json({
        decrypted,
        message: 'Object fields decrypted successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Field decryption failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Get encryption audit logs endpoint
 */
export function getAuditLogsEndpoint(hub: EncryptionHub) {
  return (req: Request, res: Response) => {
    const { keyId, operation, limit = '100' } = req.query;

    try {
      const auditor = hub.getAuditor();
      let logs = auditor.getLogs(operation as any, parseInt(limit as string));

      if (keyId) {
        logs = auditor.getLogsByKey(keyId as string, parseInt(limit as string));
      }

      res.json({
        count: logs.length,
        logs: logs.map((l) => ({
          id: l.id,
          operation: l.operation,
          keyId: l.keyId,
          status: l.status,
          actor: l.actor,
          timestamp: new Date(l.timestamp).toISOString(),
        })),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve audit logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Initialize encryption middleware stack
 */
export function initializeEncryptionMiddleware(
  options: EncryptionMiddlewareOptions,
  enableEndpoints?: boolean,
) {
  const endpoints = [];

  if (enableEndpoints !== false) {
    endpoints.push((req: Request, res: Response, next: NextFunction) => {
      // Encryption endpoints
      if (req.method === 'POST' && req.path === '/api/encryption/encrypt') {
        return encryptEndpoint(options.hub)(req, res);
      }
      if (req.method === 'POST' && req.path === '/api/encryption/decrypt') {
        return decryptEndpoint(options.hub)(req, res);
      }

      // Key management endpoints
      if (req.method === 'POST' && req.path === '/api/keys/symmetric') {
        return generateSymmetricKeyEndpoint(options.hub)(req, res);
      }
      if (req.method === 'POST' && req.path === '/api/keys/keypair') {
        return generateKeyPairEndpoint(options.hub)(req, res);
      }
      if (req.method === 'POST' && req.path.match(/^\/api\/keys\/[^\/]+\/rotate$/)) {
        const keyId = req.path.split('/')[3];
        req.params.keyId = keyId;
        return rotateKeyEndpoint(options.hub)(req, res);
      }
      if (req.method === 'GET' && req.path.match(/^\/api\/keys\/[^\/]+$/)) {
        const keyId = req.path.split('/')[3];
        req.params.keyId = keyId;
        return getKeyEndpoint(options.hub)(req, res);
      }
      if (req.method === 'DELETE' && req.path.match(/^\/api\/keys\/[^\/]+$/)) {
        const keyId = req.path.split('/')[3];
        req.params.keyId = keyId;
        return revokeKeyEndpoint(options.hub)(req, res);
      }

      // Field encryption endpoints
      if (req.method === 'POST' && req.path === '/api/encryption/field-config') {
        return registerFieldConfigEndpoint(options.hub)(req, res);
      }
      if (req.method === 'POST' && req.path === '/api/encryption/encrypt-fields') {
        return encryptObjectEndpoint(options.hub)(req, res);
      }
      if (req.method === 'POST' && req.path === '/api/encryption/decrypt-fields') {
        return decryptObjectEndpoint(options.hub)(req, res);
      }

      // Audit logs endpoint
      if (req.method === 'GET' && req.path === '/api/encryption/audit-logs') {
        return getAuditLogsEndpoint(options.hub)(req, res);
      }

      next();
    });
  }

  return [attachEncryptionMiddleware(options), ...endpoints];
}
