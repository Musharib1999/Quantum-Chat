export type UserRole = 'learner' | 'enterprise' | 'admin' | 'demo';

/**
 * Canonicalizes any persisted user role into one of the 4 active system roles.
 * Legacy roles ('user', 'student', 'builder') seamlessly map to 'learner'.
 */
export function normalizeRole(role?: string | null): UserRole {
  switch ((role || '').trim().toLowerCase()) {
    case 'admin':
      return 'admin';
    case 'enterprise':
      return 'enterprise';
    case 'demo':
      return 'demo';
    case 'learner':
    case 'user':
    case 'student':
    case 'builder':
    default:
      return 'learner';
  }
}

export function getRoleLabel(role?: string | null): string {
  switch (normalizeRole(role)) {
    case 'admin':
      return 'Administrator';
    case 'enterprise':
      return 'Enterprise Partner';
    case 'demo':
      return 'Demo Trial Account';
    case 'learner':
    default:
      return 'Learner';
  }
}
