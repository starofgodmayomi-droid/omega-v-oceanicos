/**
 * Authentication and authorization system with JWT tokens and RBAC
 */

import crypto from 'crypto';

export type UserRole = 'admin' | 'operator' | 'viewer' | 'api-client';

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  roles: UserRole[];
  createdAt: string;
  lastLogin?: string;
  active: boolean;
}

export interface TokenPayload {
  userId: string;
  username: string;
  roles: UserRole[];
  iat: number;
  exp: number;
  jti: string;
}

export interface APIKey {
  id: string;
  name: string;
  key: string;
  userId: string;
  roles: UserRole[];
  createdAt: string;
  lastUsed?: string;
  active: boolean;
}

export interface AuthConfig {
  jwtSecret?: string;
  tokenExpiresIn?: number;
  refreshTokenExpiresIn?: number;
}

const DEFAULT_TOKEN_EXPIRY = 3600000; // 1 hour
const DEFAULT_REFRESH_EXPIRY = 86400000; // 24 hours

export class AuthManager {
  private users: Map<string, AuthUser> = new Map();
  private apiKeys: Map<string, APIKey> = new Map();
  private jwtSecret: string;
  private tokenExpiresIn: number;
  private refreshTokenExpiresIn: number;

  constructor(config: AuthConfig = {}) {
    this.jwtSecret = config.jwtSecret || this.generateSecret();
    this.tokenExpiresIn = config.tokenExpiresIn || DEFAULT_TOKEN_EXPIRY;
    this.refreshTokenExpiresIn = config.refreshTokenExpiresIn || DEFAULT_REFRESH_EXPIRY;
  }

  /**
   * Register a new user
   */
  registerUser(id: string, username: string, email?: string, roles?: UserRole[]): AuthUser {
    if (this.users.has(id)) {
      throw new Error(`User ${id} already exists`);
    }

    const user: AuthUser = {
      id,
      username,
      email,
      roles: roles || ['viewer'],
      createdAt: new Date().toISOString(),
      active: true,
    };

    this.users.set(id, user);
    return user;
  }

  /**
   * Get user by ID
   */
  getUser(id: string): AuthUser | undefined {
    return this.users.get(id);
  }

  /**
   * Update user roles
   */
  updateUserRoles(userId: string, roles: UserRole[]): AuthUser {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    user.roles = roles;
    this.users.set(userId, user);
    return user;
  }

  /**
   * Deactivate user
   */
  deactivateUser(userId: string): AuthUser {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    user.active = false;
    this.users.set(userId, user);
    return user;
  }

  /**
   * Generate JWT token
   */
  generateToken(userId: string): string {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const now = Math.floor(Date.now() / 1000);
    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
      roles: user.roles,
      iat: now,
      exp: now + Math.floor(this.tokenExpiresIn / 1000),
      jti: this.generateTokenId(),
    };

    return this.encodeToken(payload);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): TokenPayload | null {
    try {
      const payload = this.decodeToken(token);

      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        return null;
      }

      const user = this.users.get(payload.userId);
      if (!user || !user.active) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Create API key for user
   */
  createAPIKey(userId: string, name: string, roles?: UserRole[]): APIKey {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const key: APIKey = {
      id: `key_${this.generateTokenId()}`,
      name,
      key: this.generateAPIKeySecret(),
      userId,
      roles: roles || user.roles,
      createdAt: new Date().toISOString(),
      active: true,
    };

    this.apiKeys.set(key.id, key);
    return key;
  }

  /**
   * Verify API key
   */
  verifyAPIKey(keySecret: string): APIKey | null {
    for (const key of this.apiKeys.values()) {
      if (key.active && key.key === keySecret) {
        const user = this.users.get(key.userId);
        if (!user || !user.active) {
          return null;
        }
        key.lastUsed = new Date().toISOString();
        return key;
      }
    }
    return null;
  }

  /**
   * Revoke API key
   */
  revokeAPIKey(keyId: string): APIKey {
    const key = this.apiKeys.get(keyId);
    if (!key) {
      throw new Error(`API key ${keyId} not found`);
    }

    key.active = false;
    this.apiKeys.set(keyId, key);
    return key;
  }

  /**
   * Check if user has role
   */
  hasRole(userId: string, role: UserRole): boolean {
    const user = this.users.get(userId);
    return user ? user.roles.includes(role) : false;
  }

  /**
   * Check if user has any of the roles
   */
  hasAnyRole(userId: string, roles: UserRole[]): boolean {
    const user = this.users.get(userId);
    if (!user) return false;
    return roles.some((role) => user.roles.includes(role));
  }

  /**
   * Check if user has all roles
   */
  hasAllRoles(userId: string, roles: UserRole[]): boolean {
    const user = this.users.get(userId);
    if (!user) return false;
    return roles.every((role) => user.roles.includes(role));
  }

  /**
   * List all users
   */
  listUsers(): AuthUser[] {
    return Array.from(this.users.values());
  }

  /**
   * List API keys for user
   */
  listAPIKeys(userId: string): APIKey[] {
    return Array.from(this.apiKeys.values()).filter((key) => key.userId === userId);
  }

  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateTokenId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private generateAPIKeySecret(): string {
    return `sk_${crypto.randomBytes(24).toString('hex')}`;
  }

  private encodeToken(payload: TokenPayload): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');

    const signature = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private decodeToken(token: string): TokenPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    const expectedSignature = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64');

    if (signature !== expectedSignature) {
      throw new Error('Invalid token signature');
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64').toString('utf-8'));

    return payload as TokenPayload;
  }
}

/**
 * Role-based access control (RBAC) matrix
 */
export const RBAC_MATRIX: Record<UserRole, Set<string>> = {
  admin: new Set([
    'read:observations',
    'read:verifications',
    'read:attestations',
    'read:metrics',
    'read:health',
    'read:audit',
    'write:observations',
    'write:rules',
    'manage:users',
    'manage:keys',
  ]),
  operator: new Set([
    'read:observations',
    'read:verifications',
    'read:attestations',
    'read:metrics',
    'read:health',
    'read:audit',
    'write:observations',
    'write:rules',
  ]),
  viewer: new Set([
    'read:observations',
    'read:verifications',
    'read:attestations',
    'read:metrics',
    'read:health',
  ]),
  'api-client': new Set([
    'read:observations',
    'read:verifications',
    'read:attestations',
    'write:observations',
  ]),
};

/**
 * Check if user with roles has permission
 */
export function hasPermission(roles: UserRole[], permission: string): boolean {
  for (const role of roles) {
    if (RBAC_MATRIX[role]?.has(permission)) {
      return true;
    }
  }
  return false;
}
