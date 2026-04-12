import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleGate } from './role-gate';
import type { AuthContext } from '../types';

const adminContext: AuthContext = { role: 'admin', userName: '管理者太郎' };
const viewerContext: AuthContext = { role: 'viewer', userName: '閲覧花子' };

describe('RoleGate', () => {
  it('renders children when user has required role', () => {
    render(
      <RoleGate context={adminContext} requiredRole="admin">
        <span>管理コンテンツ</span>
      </RoleGate>,
    );
    expect(screen.getByText('管理コンテンツ')).toBeInTheDocument();
  });

  it('hides children when user lacks required role', () => {
    render(
      <RoleGate context={viewerContext} requiredRole="admin">
        <span>管理コンテンツ</span>
      </RoleGate>,
    );
    expect(screen.queryByText('管理コンテンツ')).not.toBeInTheDocument();
  });

  it('renders fallback when user lacks required role and fallback is provided', () => {
    render(
      <RoleGate context={viewerContext} requiredRole="admin" fallback={<span>権限なし</span>}>
        <span>管理コンテンツ</span>
      </RoleGate>,
    );
    expect(screen.queryByText('管理コンテンツ')).not.toBeInTheDocument();
    expect(screen.getByText('権限なし')).toBeInTheDocument();
  });

  it('renders nothing when context is null', () => {
    const { container } = render(
      <RoleGate context={null} requiredRole="admin">
        <span>管理コンテンツ</span>
      </RoleGate>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders fallback when context is null and fallback is provided', () => {
    render(
      <RoleGate context={null} requiredRole="admin" fallback={<span>未認証</span>}>
        <span>管理コンテンツ</span>
      </RoleGate>,
    );
    expect(screen.getByText('未認証')).toBeInTheDocument();
  });
});
