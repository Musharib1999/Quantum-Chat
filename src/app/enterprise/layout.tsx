import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { resolveSessionFromToken } from '@/lib/auth';
import { canAccessEnterprise, getDefaultRouteForRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * Server-Side RBAC Gate for Enterprise Optimization Studio (/enterprise).
 * Verifies the HttpOnly `user_session` cookie against MongoDB before rendering any UI.
 * Only `enterprise`, `admin`, and `demo_enterprise` roles are permitted.
 */
export default async function EnterpriseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('user_session')?.value;
  const identity = await resolveSessionFromToken(token);

  if (!identity) {
    redirect('/login?redirect=/enterprise');
  }

  if (!canAccessEnterprise(identity.role)) {
    redirect(getDefaultRouteForRole(identity.role));
  }

  return <>{children}</>;
}
