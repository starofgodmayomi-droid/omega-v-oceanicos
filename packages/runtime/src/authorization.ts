/**
 * Advanced Authorization & Access Control System
 * Enterprise-grade RBAC, ABAC, and policy-based access control
 */

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'execute' | 'admin';
export type ResourceType =
  | 'observation'
  | 'verification'
  | 'attestation'
  | 'event'
  | 'user'
  | 'session'
  | 'notification'
  | 'report'
  | 'configuration';
export type PolicyEffect = 'allow' | 'deny';
export type RoleType = 'system' | 'custom';

export interface Permission {
  id: string;
  action: PermissionAction;
  resource: ResourceType;
  scope?: string;
}

export interface Role {
  id: string;
  name: string;
  type: RoleType;
  permissions: Permission[];
  parentRoles?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Resource {
  id: string;
  type: ResourceType;
  owner: string;
  attributes: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface PolicyStatement {
  id: string;
  effect: PolicyEffect;
  actions: PermissionAction[];
  resources: ResourceType[];
  conditions?: Record<string, any>;
  priority: number;
}

export interface Policy {
  id: string;
  name: string;
  statements: PolicyStatement[];
  createdAt: number;
  updatedAt: number;
}

export interface UserAttribute {
  userId: string;
  key: string;
  value: any;
  timestamp: number;
}

export interface AccessRequest {
  userId: string;
  action: PermissionAction;
  resource: ResourceType;
  resourceId?: string;
  context?: Record<string, any>;
}

export interface AccessDecision {
  allowed: boolean;
  reason: string;
  matchedPolicies: string[];
  evaluationTime: number;
}

export interface AccessAuditLog {
  id: string;
  userId: string;
  action: PermissionAction;
  resource: ResourceType;
  resourceId?: string;
  allowed: boolean;
  reason: string;
  timestamp: number;
}

/**
 * RoleManager: Manage roles, permissions, and role hierarchies
 */
export class RoleManager {
  private roles: Map<string, Role> = new Map();
  private permissions: Map<string, Permission> = new Map();
  private roleIndex: Map<string, Role[]> = new Map();

  createRole(name: string, type: RoleType = 'custom', parentRoles?: string[]): Role {
    const role: Role = {
      id: `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      type,
      permissions: [],
      parentRoles,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.roles.set(role.id, role);
    return role;
  }

  createPermission(action: PermissionAction, resource: ResourceType, scope?: string): Permission {
    const permission: Permission = {
      id: `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      resource,
      scope,
    };

    this.permissions.set(permission.id, permission);
    return permission;
  }

  addPermissionToRole(roleId: string, permissionId: string): boolean {
    const role = this.roles.get(roleId);
    const permission = this.permissions.get(permissionId);

    if (!role || !permission) return false;

    if (!role.permissions.find((p) => p.id === permissionId)) {
      role.permissions.push(permission);
      role.updatedAt = Date.now();
      return true;
    }

    return false;
  }

  removePermissionFromRole(roleId: string, permissionId: string): boolean {
    const role = this.roles.get(roleId);
    if (!role) return false;

    const initialLength = role.permissions.length;
    role.permissions = role.permissions.filter((p) => p.id !== permissionId);

    if (role.permissions.length < initialLength) {
      role.updatedAt = Date.now();
      return true;
    }

    return false;
  }

  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  getPermissionsForRole(roleId: string): Permission[] {
    const role = this.roles.get(roleId);
    if (!role) return [];

    const permissions = [...role.permissions];

    if (role.parentRoles) {
      for (const parentId of role.parentRoles) {
        permissions.push(...this.getPermissionsForRole(parentId));
      }
    }

    return permissions;
  }

  hasPermission(roleId: string, action: PermissionAction, resource: ResourceType): boolean {
    const permissions = this.getPermissionsForRole(roleId);
    return permissions.some((p) => p.action === action && p.resource === resource);
  }

  getRolesByName(name: string): Role[] {
    const results: Role[] = [];
    for (const role of this.roles.values()) {
      if (role.name === name) {
        results.push(role);
      }
    }
    return results;
  }

  async clear(): Promise<void> {
    this.roles.clear();
    this.permissions.clear();
    this.roleIndex.clear();
  }
}

/**
 * ResourceManager: Define and manage protected resources
 */
export class ResourceManager {
  private resources: Map<string, Resource> = new Map();
  private ownerIndex: Map<string, Resource[]> = new Map();
  private typeIndex: Map<ResourceType, Resource[]> = new Map();

  createResource(type: ResourceType, owner: string, attributes: Record<string, any>): Resource {
    const resource: Resource = {
      id: `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      owner,
      attributes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.resources.set(resource.id, resource);

    if (!this.ownerIndex.has(owner)) {
      this.ownerIndex.set(owner, []);
    }
    this.ownerIndex.get(owner)!.push(resource);

    if (!this.typeIndex.has(type)) {
      this.typeIndex.set(type, []);
    }
    this.typeIndex.get(type)!.push(resource);

    return resource;
  }

  getResource(resourceId: string): Resource | undefined {
    return this.resources.get(resourceId);
  }

  getResourcesByOwner(owner: string): Resource[] {
    return this.ownerIndex.get(owner) || [];
  }

  getResourcesByType(type: ResourceType): Resource[] {
    return this.typeIndex.get(type) || [];
  }

  updateResource(resourceId: string, attributes: Record<string, any>): boolean {
    const resource = this.resources.get(resourceId);
    if (!resource) return false;

    resource.attributes = { ...resource.attributes, ...attributes };
    resource.updatedAt = Date.now();
    return true;
  }

  deleteResource(resourceId: string): boolean {
    const resource = this.resources.get(resourceId);
    if (!resource) return false;

    this.resources.delete(resourceId);

    const ownerResources = this.ownerIndex.get(resource.owner);
    if (ownerResources) {
      this.ownerIndex.set(
        resource.owner,
        ownerResources.filter((r) => r.id !== resourceId)
      );
    }

    const typeResources = this.typeIndex.get(resource.type);
    if (typeResources) {
      this.typeIndex.set(
        resource.type,
        typeResources.filter((r) => r.id !== resourceId)
      );
    }

    return true;
  }

  async clear(): Promise<void> {
    this.resources.clear();
    this.ownerIndex.clear();
    this.typeIndex.clear();
  }
}

/**
 * AttributeManager: Manage user attributes for ABAC
 */
export class AttributeManager {
  private attributes: Map<string, UserAttribute[]> = new Map();

  setAttribute(userId: string, key: string, value: any): UserAttribute {
    const attribute: UserAttribute = {
      userId,
      key,
      value,
      timestamp: Date.now(),
    };

    if (!this.attributes.has(userId)) {
      this.attributes.set(userId, []);
    }

    const userAttrs = this.attributes.get(userId)!;
    const existingIndex = userAttrs.findIndex((a) => a.key === key);
    if (existingIndex >= 0) {
      userAttrs[existingIndex] = attribute;
    } else {
      userAttrs.push(attribute);
    }

    return attribute;
  }

  getAttribute(userId: string, key: string): UserAttribute | undefined {
    const userAttrs = this.attributes.get(userId);
    if (!userAttrs) return undefined;

    return userAttrs.find((a) => a.key === key);
  }

  getAttributes(userId: string): UserAttribute[] {
    return this.attributes.get(userId) || [];
  }

  removeAttribute(userId: string, key: string): boolean {
    const userAttrs = this.attributes.get(userId);
    if (!userAttrs) return false;

    const initialLength = userAttrs.length;
    this.attributes.set(
      userId,
      userAttrs.filter((a) => a.key !== key)
    );

    return this.attributes.get(userId)!.length < initialLength;
  }

  evaluateCondition(userId: string, condition: Record<string, any>): boolean {
    for (const [key, expected] of Object.entries(condition)) {
      const attr = this.getAttribute(userId, key);
      if (!attr) return false;

      if (typeof expected === 'object' && expected !== null) {
        if (expected.operator === 'in' && !expected.values.includes(attr.value)) return false;
        if (expected.operator === 'equals' && attr.value !== expected.value) return false;
        if (expected.operator === 'greaterThan' && !(attr.value > expected.value)) return false;
        if (expected.operator === 'lessThan' && !(attr.value < expected.value)) return false;
      } else if (attr.value !== expected) {
        return false;
      }
    }

    return true;
  }

  async clear(): Promise<void> {
    this.attributes.clear();
  }
}

/**
 * PolicyEngine: Evaluate fine-grained access policies
 */
export class PolicyEngine {
  private policies: Map<string, Policy> = new Map();
  private userPolicies: Map<string, Policy[]> = new Map();

  createPolicy(name: string, statements: PolicyStatement[]): Policy {
    const policy: Policy = {
      id: `pol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      statements: statements.sort((a, b) => b.priority - a.priority),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.policies.set(policy.id, policy);
    return policy;
  }

  attachPolicyToUser(userId: string, policyId: string): boolean {
    const policy = this.policies.get(policyId);
    if (!policy) return false;

    if (!this.userPolicies.has(userId)) {
      this.userPolicies.set(userId, []);
    }

    if (!this.userPolicies.get(userId)!.find((p) => p.id === policyId)) {
      this.userPolicies.get(userId)!.push(policy);
      return true;
    }

    return false;
  }

  detachPolicyFromUser(userId: string, policyId: string): boolean {
    const policies = this.userPolicies.get(userId);
    if (!policies) return false;

    const initialLength = policies.length;
    this.userPolicies.set(
      userId,
      policies.filter((p) => p.id !== policyId)
    );

    return this.userPolicies.get(userId)!.length < initialLength;
  }

  evaluatePolicy(
    userId: string,
    action: PermissionAction,
    resource: ResourceType,
    context?: Record<string, any>
  ): { allowed: boolean; matchedPolicies: string[] } {
    const userPolicies = this.userPolicies.get(userId) || [];
    const matchedPolicies: string[] = [];
    let finalDecision: 'allow' | 'deny' | null = null;

    for (const policy of userPolicies) {
      for (const statement of policy.statements) {
        const actionMatch = statement.actions.includes(action);
        const resourceMatch = statement.resources.includes(resource);

        if (actionMatch && resourceMatch) {
          matchedPolicies.push(policy.id);

          if (statement.conditions) {
            if (!context || !this.evaluateConditions(statement.conditions, context)) {
              continue;
            }
          }

          if (statement.effect === 'deny') {
            return { allowed: false, matchedPolicies };
          }

          if (finalDecision !== 'deny') {
            finalDecision = 'allow';
          }
        }
      }
    }

    return { allowed: finalDecision === 'allow', matchedPolicies };
  }

  private evaluateConditions(
    conditions: Record<string, any>,
    context: Record<string, any>
  ): boolean {
    for (const [key, expected] of Object.entries(conditions)) {
      const contextValue = context[key];

      if (typeof expected === 'object' && expected !== null) {
        if (expected.operator === 'in' && !expected.values.includes(contextValue)) return false;
        if (expected.operator === 'equals' && contextValue !== expected.value) return false;
        if (expected.operator === 'greaterThan' && !(contextValue > expected.value)) return false;
        if (expected.operator === 'lessThan' && !(contextValue < expected.value)) return false;
      } else if (contextValue !== expected) {
        return false;
      }
    }

    return true;
  }

  getPoliciesForUser(userId: string): Policy[] {
    return this.userPolicies.get(userId) || [];
  }

  async clear(): Promise<void> {
    this.policies.clear();
    this.userPolicies.clear();
  }
}

/**
 * AccessDecisionPoint: Central authorization decision making
 */
export class AccessDecisionPoint {
  private auditLogs: AccessAuditLog[] = [];
  private decisionCache: Map<string, AccessDecision> = new Map();

  constructor(
    private roleManager: RoleManager,
    private resourceManager: ResourceManager,
    private attributeManager: AttributeManager,
    private policyEngine: PolicyEngine
  ) {}

  decide(request: AccessRequest): AccessDecision {
    const cacheKey = `${request.userId}-${request.action}-${request.resource}-${request.resourceId || ''}`;
    const cached = this.decisionCache.get(cacheKey);
    if (cached && Date.now() - cached.evaluationTime < 5000) {
      return cached;
    }

    const startTime = Date.now();
    let decision: AccessDecision;

    const policyResult = this.policyEngine.evaluatePolicy(
      request.userId,
      request.action,
      request.resource,
      request.context
    );

    if (policyResult.allowed) {
      if (request.resourceId) {
        const resource = this.resourceManager.getResource(request.resourceId);
        if (!resource) {
          decision = {
            allowed: false,
            reason: 'Resource not found',
            matchedPolicies: policyResult.matchedPolicies,
            evaluationTime: Date.now(),
          };
        } else if (resource.owner === request.userId) {
          decision = {
            allowed: true,
            reason: 'Owner access granted',
            matchedPolicies: policyResult.matchedPolicies,
            evaluationTime: Date.now(),
          };
        } else {
          const attrs = this.attributeManager.getAttributes(request.userId);
          const hasOrgPermission = attrs.some(
            (a) => a.key === 'org' && a.value === this.getResourceOrg(resource)
          );

          decision = {
            allowed: hasOrgPermission,
            reason: hasOrgPermission
              ? 'Policy permission granted'
              : 'No permission for this resource',
            matchedPolicies: policyResult.matchedPolicies,
            evaluationTime: Date.now(),
          };
        }
      } else {
        decision = {
          allowed: true,
          reason: 'Policy permission granted',
          matchedPolicies: policyResult.matchedPolicies,
          evaluationTime: Date.now(),
        };
      }
    } else {
      decision = {
        allowed: false,
        reason: 'Policy denies access',
        matchedPolicies: policyResult.matchedPolicies,
        evaluationTime: Date.now(),
      };
    }

    this.decisionCache.set(cacheKey, decision);
    this.logDecision(request, decision);

    return decision;
  }

  private getResourceOrg(resource: Resource): string | undefined {
    return resource.attributes.org;
  }

  private logDecision(request: AccessRequest, decision: AccessDecision): void {
    const log: AccessAuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: request.userId,
      action: request.action,
      resource: request.resource,
      resourceId: request.resourceId,
      allowed: decision.allowed,
      reason: decision.reason,
      timestamp: Date.now(),
    };

    this.auditLogs.push(log);

    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-10000);
    }
  }

  getAuditLogs(userId?: string, limit: number = 100): AccessAuditLog[] {
    let filtered = userId ? this.auditLogs.filter((log) => log.userId === userId) : this.auditLogs;
    return filtered.slice(-limit);
  }

  clearCache(): void {
    this.decisionCache.clear();
  }

  async clear(): Promise<void> {
    this.auditLogs = [];
    this.decisionCache.clear();
  }
}

/**
 * AuthorizationHub: Unified orchestration
 */
export class AuthorizationHub {
  private roleManager: RoleManager;
  private resourceManager: ResourceManager;
  private attributeManager: AttributeManager;
  private policyEngine: PolicyEngine;
  private accessDecisionPoint: AccessDecisionPoint;

  constructor() {
    this.roleManager = new RoleManager();
    this.resourceManager = new ResourceManager();
    this.attributeManager = new AttributeManager();
    this.policyEngine = new PolicyEngine();
    this.accessDecisionPoint = new AccessDecisionPoint(
      this.roleManager,
      this.resourceManager,
      this.attributeManager,
      this.policyEngine
    );
  }

  getRoleManager(): RoleManager {
    return this.roleManager;
  }

  getResourceManager(): ResourceManager {
    return this.resourceManager;
  }

  getAttributeManager(): AttributeManager {
    return this.attributeManager;
  }

  getPolicyEngine(): PolicyEngine {
    return this.policyEngine;
  }

  getAccessDecisionPoint(): AccessDecisionPoint {
    return this.accessDecisionPoint;
  }

  authorize(request: AccessRequest): AccessDecision {
    return this.accessDecisionPoint.decide(request);
  }

  canAccess(
    userId: string,
    action: PermissionAction,
    resource: ResourceType,
    resourceId?: string
  ): boolean {
    const decision = this.authorize({
      userId,
      action,
      resource,
      resourceId,
    });

    return decision.allowed;
  }

  async clear(): Promise<void> {
    await this.roleManager.clear();
    await this.resourceManager.clear();
    await this.attributeManager.clear();
    await this.policyEngine.clear();
    await this.accessDecisionPoint.clear();
  }
}
