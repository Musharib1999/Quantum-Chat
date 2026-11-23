import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { resolveSessionFromToken } from '@/lib/auth';
import { canAccessIde, getDefaultRouteForRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * Server-Side RBAC Gate for Quantum IDE (/ide).
 * Verifies the HttpOnly `user_session` cookie against MongoDB before rendering any UI.
 * Blocks `demo_enterprise` from wandering into `/ide`.
 */
export default async function IdeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('user_session')?.value;
  const identity = await resolveSessionFromToken(token);

  if (!identity) {
    redirect('/login?redirect=/ide');
  }

  if (!canAccessIde(identity.role)) {
    redirect(getDefaultRouteForRole(identity.role));
  }

  return <>{children}</>;
}
