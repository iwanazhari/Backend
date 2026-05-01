/**
 * RBAC + ABAC Service - Advanced Authorization
 * 
 * Features:
 * - Role-Based Access Control (RBAC)
 * - Permission-Based Access Control
 * - Attribute-Based Access Control (ABAC)
 * - Policy-based authorization
 * - Zero Trust principles
 * 
 * Architecture:
 * User → Roles → Permissions → Resources
 * User → Attributes → Policies → Resources
 */

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  createdAt: Date;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  actions: string[]; // ['create', 'read', 'update', 'delete']
  conditions?: Condition[];
}

export interface Condition {
  attribute: string;
  operator: 'equals' | 'notEquals' | 'in' | 'notIn' | 'greaterThan' | 'lessThan' | 'contains';
  value: any;
}

export interface UserAttributes {
  id: string;
  roles: string[];
  department?: string;
  manager?: string;
  location?: string;
  clearanceLevel?: number;
  [key: string]: any;
}

export interface Resource {
  id: string;
  type: string;
  ownerId?: string;
  attributes: {
    department?: string;
    classification?: string;
    location?: string;
    sensitivity?: number;
    [key: string]: any;
  };
}

export interface Policy {
  id: string;
  name: string;
  description?: string;
  effect: 'allow' | 'deny';
  principal: {
    roles?: string[];
    attributes?: Record<string, any>;
  };
  resource: {
    type: string;
    attributes?: Record<string, any>;
  };
  actions: string[];
  conditions?: Condition[];
}

export interface AuthorizationRequest {
  user: UserAttributes;
  action: string;
  resource: Resource;
  context?: Record<string, any>;
}

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  matchedPolicy?: Policy;
}

class RBACABACService {
  private roles: Map<string, Role>;
  private permissions: Map<string, Permission>;
  private policies: Map<string, Policy>;

  constructor() {
    this.roles = new Map();
    this.permissions = new Map();
    this.policies = new Map();
  }

  // ==================== RBAC METHODS ====================

  /**
   * Create role dengan permissions
   */
  createRole(name: string, permissions: Permission[]): Role {
    const role: Role = {
      id: `role-${Date.now()}`,
      name,
      permissions,
      createdAt: new Date(),
    };
    this.roles.set(role.id, role);
    return role;
  }

  /**
   * Create permission
   */
  createPermission(
    name: string,
    resource: string,
    actions: string[],
    conditions?: Condition[]
  ): Permission {
    const permission: Permission = {
      id: `perm-${Date.now()}`,
      name,
      resource,
      actions,
      conditions,
    };
    this.permissions.set(permission.id, permission);
    return permission;
  }

  /**
   * Check if user has role
   */
  hasRole(user: UserAttributes, roleName: string): boolean {
    return user.roles.includes(roleName);
  }

  /**
   * Check if user has permission (RBAC)
   */
  hasPermission(user: UserAttributes, permissionName: string): boolean {
    for (const roleName of user.roles) {
      const role = this.roles.get(roleName);
      if (role) {
        for (const perm of role.permissions) {
          if (perm.name === permissionName) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Check if user can perform action on resource (RBAC)
   */
  can(user: UserAttributes, action: string, resource: string): boolean {
    for (const roleName of user.roles) {
      const role = this.roles.get(roleName);
      if (role) {
        for (const perm of role.permissions) {
          if (perm.resource === resource && perm.actions.includes(action)) {
            // Check conditions if any
            if (perm.conditions && perm.conditions.length > 0) {
              return this.evaluateConditions(perm.conditions, user);
            }
            return true;
          }
        }
      }
    }
    return false;
  }

  // ==================== ABAC METHODS ====================

  /**
   * Create policy
   */
  createPolicy(policy: Policy): Policy {
    this.policies.set(policy.id, policy);
    return policy;
  }

  /**
   * Authorize request menggunakan ABAC
   */
  authorize(request: AuthorizationRequest): AuthorizationResult {
    let matchedPolicy: Policy | undefined;
    let decision: 'allow' | 'deny' | 'notApplicable' = 'notApplicable';

    // Evaluate all policies
    for (const policy of this.policies.values()) {
      const match = this.evaluatePolicy(policy, request);
      
      if (match) {
        matchedPolicy = policy;
        
        if (policy.effect === 'deny') {
          // Deny overrides allow
          return {
            allowed: false,
            reason: `Denied by policy: ${policy.name}`,
            matchedPolicy: policy,
          };
        }
        
        decision = 'allow';
      }
    }

    if (decision === 'allow' && matchedPolicy) {
      return {
        allowed: true,
        reason: `Allowed by policy: ${matchedPolicy.name}`,
        matchedPolicy,
      };
    }

    return {
      allowed: false,
      reason: 'No matching policy found',
    };
  }

  /**
   * Evaluate policy terhadap request
   */
  private evaluatePolicy(policy: Policy, request: AuthorizationRequest): boolean {
    // Check principal (roles/attributes)
    if (policy.principal.roles && policy.principal.roles.length > 0) {
      const hasRole = policy.principal.roles.some(role =>
        request.user.roles.includes(role)
      );
      if (!hasRole) return false;
    }

    // Check principal attributes
    if (policy.principal.attributes) {
      for (const [attr, value] of Object.entries(policy.principal.attributes)) {
        if (request.user[attr] !== value) {
          return false;
        }
      }
    }

    // Check resource type
    if (policy.resource.type !== request.resource.type) {
      return false;
    }

    // Check resource attributes
    if (policy.resource.attributes) {
      for (const [attr, value] of Object.entries(policy.resource.attributes)) {
        if (request.resource.attributes[attr] !== value) {
          return false;
        }
      }
    }

    // Check action
    if (!policy.actions.includes(request.action)) {
      return false;
    }

    // Check conditions
    if (policy.conditions && policy.conditions.length > 0) {
      return this.evaluateConditions(policy.conditions, request.user, request.resource, request.context);
    }

    return true;
  }

  /**
   * Evaluate conditions
   */
  private evaluateConditions(
    conditions: Condition[],
    user?: UserAttributes,
    resource?: Resource,
    context?: Record<string, any>
  ): boolean {
    const allData = { ...user, ...resource?.attributes, ...context };

    for (const condition of conditions) {
      const value = allData[condition.attribute];
      
      switch (condition.operator) {
        case 'equals':
          if (value !== condition.value) return false;
          break;
        case 'notEquals':
          if (value === condition.value) return false;
          break;
        case 'in':
          if (!Array.isArray(condition.value) || !condition.value.includes(value)) return false;
          break;
        case 'notIn':
          if (Array.isArray(condition.value) && condition.value.includes(value)) return false;
          break;
        case 'greaterThan':
          if (typeof value !== 'number' || value <= condition.value) return false;
          break;
        case 'lessThan':
          if (typeof value !== 'number' || value >= condition.value) return false;
          break;
        case 'contains':
          if (!Array.isArray(value) || !value.includes(condition.value)) return false;
          break;
      }
    }

    return true;
  }

  // ==================== COMBINED RBAC + ABAC ====================

  /**
   * Check authorization dengan RBAC + ABAC
   */
  checkAccess(request: AuthorizationRequest): AuthorizationResult {
    // First check RBAC
    const rbacAllowed = this.can(request.user, request.action, request.resource.type);
    
    if (rbacAllowed) {
      // Then check ABAC policies
      const abacResult = this.authorize(request);
      return abacResult;
    }

    return {
      allowed: false,
      reason: 'User does not have required role/permission',
    };
  }

  // ==================== PREDEFINED ROLES ====================

  /**
   * Setup predefined enterprise roles
   */
  setupEnterpriseRoles(): void {
    // Create permissions
    const readUsers = this.createPermission('read:users', 'users', ['read']);
    const writeUsers = this.createPermission('write:users', 'users', ['create', 'update']);
    const deleteUsers = this.createPermission('delete:users', 'users', ['delete']);
    
    const readDocuments = this.createPermission('read:documents', 'documents', ['read']);
    const writeDocuments = this.createPermission('write:documents', 'documents', ['create', 'update']);
    const deleteDocuments = this.createPermission('delete:documents', 'documents', ['delete']);

    // Admin role - full access
    this.createRole('ADMIN', [
      readUsers, writeUsers, deleteUsers,
      readDocuments, writeDocuments, deleteDocuments,
    ]);

    // Manager role - read/write but no delete
    this.createRole('MANAGER', [
      readUsers, writeUsers,
      readDocuments, writeDocuments,
    ]);

    // User role - read only
    this.createRole('USER', [
      readDocuments,
    ]);

    // Setup ABAC policies
    this.createPolicy({
      id: 'policy-1',
      name: 'Allow managers to access their department documents',
      effect: 'allow',
      principal: {
        roles: ['MANAGER'],
        attributes: {
          department: 'engineering',
        },
      },
      resource: {
        type: 'documents',
        attributes: {
          department: 'engineering',
        },
      },
      actions: ['read', 'write'],
    });

    this.createPolicy({
      id: 'policy-2',
      name: 'Deny access to highly sensitive documents for regular users',
      effect: 'deny',
      principal: {
        roles: ['USER'],
      },
      resource: {
        type: 'documents',
        attributes: {
          sensitivity: 5,
        },
      },
      actions: ['read', 'write', 'delete'],
    });

    this.createPolicy({
      id: 'policy-3',
      name: 'Allow users to access their own resources',
      effect: 'allow',
      principal: {
        attributes: {},
      },
      resource: {
        type: 'documents',
        attributes: {},
      },
      actions: ['read', 'write'],
      conditions: [
        {
          attribute: 'ownerId',
          operator: 'equals',
          value: 'user.id', // Will be evaluated at runtime
        },
      ],
    });
  }
}

export default RBACABACService;
