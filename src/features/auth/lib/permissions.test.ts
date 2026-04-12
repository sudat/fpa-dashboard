import { describe, it, expect } from 'vitest';
import { canAccessAdmin, canViewAnalysis, canManageData, getUserDisplayName } from './permissions';
import type { AuthContext } from '../types';

const adminContext: AuthContext = { role: 'admin', userName: '管理者太郎' };
const viewerContext: AuthContext = { role: 'viewer', userName: '閲覧花子' };
const nullContext = null;

describe('canAccessAdmin', () => {
  it('returns true for admin', () => {
    expect(canAccessAdmin(adminContext)).toBe(true);
  });

  it('returns false for viewer', () => {
    expect(canAccessAdmin(viewerContext)).toBe(false);
  });

  it('returns false for null', () => {
    expect(canAccessAdmin(nullContext)).toBe(false);
  });
});

describe('canViewAnalysis', () => {
  it('returns true for admin', () => {
    expect(canViewAnalysis(adminContext)).toBe(true);
  });

  it('returns true for viewer', () => {
    expect(canViewAnalysis(viewerContext)).toBe(true);
  });

  it('returns true for null (always accessible)', () => {
    expect(canViewAnalysis(nullContext)).toBe(true);
  });
});

describe('canManageData', () => {
  it('returns true for admin', () => {
    expect(canManageData(adminContext)).toBe(true);
  });

  it('returns false for viewer', () => {
    expect(canManageData(viewerContext)).toBe(false);
  });

  it('returns false for null', () => {
    expect(canManageData(nullContext)).toBe(false);
  });
});

describe('getUserDisplayName', () => {
  it('returns userName for admin', () => {
    expect(getUserDisplayName(adminContext)).toBe('管理者太郎');
  });

  it('returns userName for viewer', () => {
    expect(getUserDisplayName(viewerContext)).toBe('閲覧花子');
  });

  it('returns "不明" for null', () => {
    expect(getUserDisplayName(nullContext)).toBe('不明');
  });
});
