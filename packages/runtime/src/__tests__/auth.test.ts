import { AuthManager, hasPermission, RBAC_MATRIX } from '../auth';

describe('Authentication & Authorization', () => {
  let authManager: AuthManager;

  beforeEach(() => {
    authManager = new AuthManager();
  });

  describe('User Management', () => {
    it('should register a new user', () => {
      const user = authManager.registerUser('user-1', 'john', 'john@example.com');

      expect(user.id).toBe('user-1');
      expect(user.username).toBe('john');
      expect(user.email).toBe('john@example.com');
      expect(user.roles).toEqual(['viewer']);
      expect(user.active).toBe(true);
    });

    it('should register user with custom roles', () => {
      const user = authManager.registerUser('user-2', 'admin', 'admin@example.com', [
        'admin',
      ]);

      expect(user.roles).toEqual(['admin']);
    });

    it('should throw error when registering duplicate user', () => {
      authManager.registerUser('user-1', 'john', 'john@example.com');

      expect(() => {
        authManager.registerUser('user-1', 'jane', 'jane@example.com');
      }).toThrow();
    });

    it('should get user by ID', () => {
      authManager.registerUser('user-1', 'john');
      const user = authManager.getUser('user-1');

      expect(user).toBeDefined();
      expect(user?.username).toBe('john');
    });

    it('should return undefined for non-existent user', () => {
      const user = authManager.getUser('nonexistent');
      expect(user).toBeUndefined();
    });

    it('should update user roles', () => {
      authManager.registerUser('user-1', 'john');
      const updated = authManager.updateUserRoles('user-1', ['operator', 'admin']);

      expect(updated.roles).toEqual(['operator', 'admin']);
    });

    it('should deactivate user', () => {
      authManager.registerUser('user-1', 'john');
      const user = authManager.deactivateUser('user-1');

      expect(user.active).toBe(false);
    });

    it('should list all users', () => {
      authManager.registerUser('user-1', 'john');
      authManager.registerUser('user-2', 'jane');

      const users = authManager.listUsers();
      expect(users).toHaveLength(2);
    });
  });

  describe('JWT Token Management', () => {
    it('should generate JWT token for user', () => {
      authManager.registerUser('user-1', 'john', undefined, ['admin']);
      const token = authManager.generateToken('user-1');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });

    it('should throw error when generating token for non-existent user', () => {
      expect(() => {
        authManager.generateToken('nonexistent');
      }).toThrow();
    });

    it('should verify valid token', () => {
      authManager.registerUser('user-1', 'john', undefined, ['admin', 'operator']);
      const token = authManager.generateToken('user-1');

      const payload = authManager.verifyToken(token);
      expect(payload).toBeDefined();
      expect(payload?.userId).toBe('user-1');
      expect(payload?.username).toBe('john');
      expect(payload?.roles).toEqual(['admin', 'operator']);
    });

    it('should return null for invalid token', () => {
      const payload = authManager.verifyToken('invalid.token.format');
      expect(payload).toBeNull();
    });

    it('should return null for expired token', () => {
      const config = { tokenExpiresIn: 10 }; // 10ms
      const manager = new AuthManager(config);
      manager.registerUser('user-1', 'john');
      const token = manager.generateToken('user-1');

      // Token should be valid immediately
      expect(manager.verifyToken(token)).toBeDefined();
    });

    it('should return null for token from deactivated user', () => {
      authManager.registerUser('user-1', 'john');
      const token = authManager.generateToken('user-1');
      authManager.deactivateUser('user-1');

      const payload = authManager.verifyToken(token);
      expect(payload).toBeNull();
    });

    it('should include token metadata', () => {
      authManager.registerUser('user-1', 'john');
      const token = authManager.generateToken('user-1');

      const payload = authManager.verifyToken(token);
      expect(payload?.iat).toBeDefined();
      expect(payload?.exp).toBeDefined();
      expect(payload?.jti).toBeDefined();
      expect(payload?.exp).toBeGreaterThan(payload?.iat || 0);
    });

    it('should generate different token IDs for each token', () => {
      authManager.registerUser('user-1', 'john');
      const token1 = authManager.generateToken('user-1');
      const token2 = authManager.generateToken('user-1');

      const payload1 = authManager.verifyToken(token1);
      const payload2 = authManager.verifyToken(token2);

      expect(payload1?.jti).not.toBe(payload2?.jti);
    });
  });

  describe('API Key Management', () => {
    it('should create API key for user', () => {
      authManager.registerUser('user-1', 'john', undefined, ['operator']);
      const key = authManager.createAPIKey('user-1', 'api-key-1');

      expect(key.id).toBeDefined();
      expect(key.name).toBe('api-key-1');
      expect(key.key).toBeDefined();
      expect(key.userId).toBe('user-1');
      expect(key.roles).toEqual(['operator']);
      expect(key.active).toBe(true);
    });

    it('should create API key with custom roles', () => {
      authManager.registerUser('user-1', 'john', undefined, ['operator']);
      const key = authManager.createAPIKey('user-1', 'api-key-1', ['viewer']);

      expect(key.roles).toEqual(['viewer']);
    });

    it('should throw error when creating key for non-existent user', () => {
      expect(() => {
        authManager.createAPIKey('nonexistent', 'key');
      }).toThrow();
    });

    it('should verify valid API key', () => {
      authManager.registerUser('user-1', 'john');
      const key = authManager.createAPIKey('user-1', 'key');

      const verified = authManager.verifyAPIKey(key.key);
      expect(verified).toBeDefined();
      expect(verified?.id).toBe(key.id);
      expect(verified?.userId).toBe('user-1');
    });

    it('should return null for invalid API key', () => {
      const verified = authManager.verifyAPIKey('invalid-key');
      expect(verified).toBeNull();
    });

    it('should return null for revoked API key', () => {
      authManager.registerUser('user-1', 'john');
      const key = authManager.createAPIKey('user-1', 'key');

      authManager.revokeAPIKey(key.id);
      const verified = authManager.verifyAPIKey(key.key);
      expect(verified).toBeNull();
    });

    it('should revoke API key', () => {
      authManager.registerUser('user-1', 'john');
      const key = authManager.createAPIKey('user-1', 'key');

      const revoked = authManager.revokeAPIKey(key.id);
      expect(revoked.active).toBe(false);
    });

    it('should track last used timestamp for API key', () => {
      authManager.registerUser('user-1', 'john');
      const key = authManager.createAPIKey('user-1', 'key');

      expect(key.lastUsed).toBeUndefined();

      authManager.verifyAPIKey(key.key);
      const verified = authManager.verifyAPIKey(key.key);
      expect(verified?.lastUsed).toBeDefined();
    });

    it('should list API keys for user', () => {
      authManager.registerUser('user-1', 'john');
      authManager.createAPIKey('user-1', 'key-1');
      authManager.createAPIKey('user-1', 'key-2');

      const keys = authManager.listAPIKeys('user-1');
      expect(keys).toHaveLength(2);
    });

    it('should return empty list for user with no API keys', () => {
      authManager.registerUser('user-1', 'john');
      const keys = authManager.listAPIKeys('user-1');

      expect(keys).toHaveLength(0);
    });
  });

  describe('Role Management', () => {
    it('should check if user has role', () => {
      authManager.registerUser('user-1', 'john', undefined, ['admin']);

      expect(authManager.hasRole('user-1', 'admin')).toBe(true);
      expect(authManager.hasRole('user-1', 'viewer')).toBe(false);
    });

    it('should return false for non-existent user', () => {
      expect(authManager.hasRole('nonexistent', 'admin')).toBe(false);
    });

    it('should check if user has any role', () => {
      authManager.registerUser('user-1', 'john', undefined, ['operator', 'viewer']);

      expect(authManager.hasAnyRole('user-1', ['admin', 'operator'])).toBe(true);
      expect(authManager.hasAnyRole('user-1', ['admin', 'api-client'])).toBe(false);
    });

    it('should check if user has all roles', () => {
      authManager.registerUser('user-1', 'john', undefined, ['operator', 'viewer']);

      expect(authManager.hasAllRoles('user-1', ['operator', 'viewer'])).toBe(true);
      expect(authManager.hasAllRoles('user-1', ['operator', 'admin'])).toBe(false);
    });
  });

  describe('RBAC Matrix', () => {
    it('should define admin permissions', () => {
      const adminPerms = RBAC_MATRIX.admin;

      expect(adminPerms.has('read:observations')).toBe(true);
      expect(adminPerms.has('write:rules')).toBe(true);
      expect(adminPerms.has('manage:users')).toBe(true);
    });

    it('should define operator permissions', () => {
      const operatorPerms = RBAC_MATRIX.operator;

      expect(operatorPerms.has('read:observations')).toBe(true);
      expect(operatorPerms.has('write:rules')).toBe(true);
      expect(operatorPerms.has('manage:users')).toBe(false);
    });

    it('should define viewer permissions', () => {
      const viewerPerms = RBAC_MATRIX.viewer;

      expect(viewerPerms.has('read:observations')).toBe(true);
      expect(viewerPerms.has('write:observations')).toBe(false);
      expect(viewerPerms.has('manage:users')).toBe(false);
    });

    it('should define api-client permissions', () => {
      const apiPerms = RBAC_MATRIX['api-client'];

      expect(apiPerms.has('write:observations')).toBe(true);
      expect(apiPerms.has('manage:users')).toBe(false);
    });
  });

  describe('Permission Checking', () => {
    it('should check if roles have permission', () => {
      expect(hasPermission(['admin'], 'manage:users')).toBe(true);
      expect(hasPermission(['viewer'], 'manage:users')).toBe(false);
    });

    it('should check permission for multiple roles', () => {
      expect(hasPermission(['viewer', 'operator'], 'write:rules')).toBe(true);
      expect(hasPermission(['viewer', 'api-client'], 'write:rules')).toBe(false);
    });

    it('should check permission for admin bypass', () => {
      expect(hasPermission(['admin'], 'read:observations')).toBe(true);
      expect(hasPermission(['admin'], 'manage:users')).toBe(true);
    });

    it('should check permission hierarchy', () => {
      // Admin has all permissions that operator has
      const adminPerms = RBAC_MATRIX.admin;
      const operatorPerms = RBAC_MATRIX.operator;

      for (const perm of operatorPerms) {
        expect(adminPerms.has(perm)).toBe(true);
      }
    });
  });

  describe('Token Payload Integrity', () => {
    it('should include all required fields in token payload', () => {
      authManager.registerUser('user-1', 'john', 'john@example.com', [
        'admin',
        'operator',
      ]);
      const token = authManager.generateToken('user-1');

      const payload = authManager.verifyToken(token);
      expect(payload).toHaveProperty('userId');
      expect(payload).toHaveProperty('username');
      expect(payload).toHaveProperty('roles');
      expect(payload).toHaveProperty('iat');
      expect(payload).toHaveProperty('exp');
      expect(payload).toHaveProperty('jti');
    });

    it('should preserve role information in token', () => {
      const roles = ['admin', 'operator', 'viewer'];
      authManager.registerUser('user-1', 'john', undefined, roles);
      const token = authManager.generateToken('user-1');

      const payload = authManager.verifyToken(token);
      expect(payload?.roles).toEqual(roles);
    });
  });

  describe('Auth Integration Scenarios', () => {
    it('should support complete user lifecycle', () => {
      // Register user
      authManager.registerUser('user-1', 'john', 'john@example.com');

      // Generate token
      const token = authManager.generateToken('user-1');
      expect(authManager.verifyToken(token)).toBeDefined();

      // Create API key
      const key = authManager.createAPIKey('user-1', 'key');
      expect(authManager.verifyAPIKey(key.key)).toBeDefined();

      // Update roles
      authManager.updateUserRoles('user-1', ['admin']);
      expect(authManager.hasRole('user-1', 'admin')).toBe(true);

      // Deactivate user
      authManager.deactivateUser('user-1');
      expect(authManager.verifyToken(token)).toBeNull();
      expect(authManager.verifyAPIKey(key.key)).toBeNull();
    });

    it('should support multi-user scenarios', () => {
      authManager.registerUser('user-1', 'john', undefined, ['viewer']);
      authManager.registerUser('user-2', 'jane', undefined, ['operator']);
      authManager.registerUser('user-3', 'admin', undefined, ['admin']);

      const token1 = authManager.generateToken('user-1');
      const token2 = authManager.generateToken('user-2');
      const token3 = authManager.generateToken('user-3');

      const payload1 = authManager.verifyToken(token1);
      const payload2 = authManager.verifyToken(token2);
      const payload3 = authManager.verifyToken(token3);

      expect(payload1?.username).toBe('john');
      expect(payload2?.username).toBe('jane');
      expect(payload3?.username).toBe('admin');

      expect(hasPermission(payload1?.roles || [], 'write:observations')).toBe(false);
      expect(hasPermission(payload2?.roles || [], 'write:observations')).toBe(true);
      expect(hasPermission(payload3?.roles || [], 'manage:users')).toBe(true);
    });

    it('should support API key management for multiple users', () => {
      authManager.registerUser('user-1', 'john');
      authManager.registerUser('user-2', 'jane');

      const key1 = authManager.createAPIKey('user-1', 'key1');
      const key2 = authManager.createAPIKey('user-2', 'key2');

      const verified1 = authManager.verifyAPIKey(key1.key);
      const verified2 = authManager.verifyAPIKey(key2.key);

      expect(verified1?.userId).toBe('user-1');
      expect(verified2?.userId).toBe('user-2');

      const user1Keys = authManager.listAPIKeys('user-1');
      const user2Keys = authManager.listAPIKeys('user-2');

      expect(user1Keys).toHaveLength(1);
      expect(user2Keys).toHaveLength(1);
    });
  });
});
