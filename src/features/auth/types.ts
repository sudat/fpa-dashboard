export type UserRole = 'admin' | 'viewer';

export interface AuthContext {
  role: UserRole;
  userName: string;
  email?: string;
}
