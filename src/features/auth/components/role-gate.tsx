import type { AuthContext, UserRole } from '../types';

interface RoleGateProps {
  context: AuthContext | null;
  requiredRole: UserRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGate({ context, requiredRole, children, fallback }: RoleGateProps) {
  if (context?.role === requiredRole) {
    return <>{children}</>;
  }
  return fallback != null ? <>{fallback}</> : null;
}
