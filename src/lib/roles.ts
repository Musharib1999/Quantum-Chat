export type UserRole = 'learner' | 'enterprise' | 'admin' | 'demo_ide' | 'demo_enterprise';

/**
 * Canonicalizes any persisted user role into one of the 5 active system roles.
 * Legacy roles ('user', 'student', 'builder') map to 'learner'.
 * Legacy 'demo' maps to 'demo_ide'.
 */
export function normalizeRole(role?: string | null): UserRole {
  switch ((role || '').trim().toLowerCase()) {
    case 'admin':
      return 'admin';
    case 'enterprise':
      return 'enterprise';
    case 'demo_enterprise':
      return 'demo_enterprise';
    case 'demo_ide':
    case 'demo':
      return 'demo_ide';
    case 'learner':
    case 'user':
    case 'student':
    case 'builder':
    default:
      return 'learner';
  }
}

export function isDemoRole(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === 'demo_ide' || r === 'demo_enterprise';
}

export function canAccessEnterprise(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === 'enterprise' || r === 'admin' || r === 'demo_enterprise';
}

export function canAccessIde(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === 'learner' || r === 'enterprise' || r === 'admin' || r === 'demo_ide';
}

export function getDefaultRouteForRole(role?: string | null): string {
  switch (normalizeRole(role)) {
    case 'admin':
      return '/admin/dashboard';
    case 'enterprise':
    case 'demo_enterprise':
      return '/enterprise';
    case 'demo_ide':
    case 'learner':
    default:
      return '/ide';
  }
}

export function getRoleLabel(role?: string | null): string {
  switch (normalizeRole(role)) {
    case 'admin':
      return 'Administrator';
    case 'enterprise':
      return 'Enterprise Partner';
    case 'demo_ide':
      return 'IDE Demo (View-Only)';
    case 'demo_enterprise':
      return 'Enterprise Demo (View-Only)';
    case 'learner':
    default:
      return 'Learner';
  }
}
