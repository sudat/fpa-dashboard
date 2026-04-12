import type { AuthContext } from '../types';

/** Check if user can access admin features (管理画面). */
export function canAccessAdmin(context: AuthContext | null): boolean {
  return context?.role === 'admin';
}

/** Check if user can view analysis screens. Always true for now. */
export function canViewAnalysis(_context: AuthContext | null): boolean {
  return true;
}

/** Check if user can manage data (upload/import). Admin only. */
export function canManageData(context: AuthContext | null): boolean {
  return context?.role === 'admin';
}

/** Get the user's display name. Returns "不明" for null context. */
export function getUserDisplayName(context: AuthContext | null): string {
  return context?.userName ?? '不明';
}
