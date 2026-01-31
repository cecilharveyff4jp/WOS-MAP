// ============================================
// 認証ユーティリティ
// ============================================
// ローカルストレージを使用した簡易認証システム

import type { AuthSession } from '../types';

const AUTH_STORAGE_KEY = 'wos_map_auth';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24時間

// 認証セッションを保存
export function saveAuthSession(allianceId: string, hasEditPermission: boolean): void {
  const session: AuthSession = {
    allianceId,
    hasEditPermission,
    expiresAt: Date.now() + SESSION_DURATION,
  };
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }
}

// 認証セッションを取得
export function getAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const sessionStr = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!sessionStr) {
    return null;
  }
  
  try {
    const session: AuthSession = JSON.parse(sessionStr);
    
    // セッションの有効期限をチェック
    if (session.expiresAt < Date.now()) {
      clearAuthSession();
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Error parsing auth session:', error);
    clearAuthSession();
    return null;
  }
}

// 認証セッションをクリア
export function clearAuthSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

// 編集権限があるかチェック
export function hasEditPermission(allianceId: string): boolean {
  const session = getAuthSession();
  return session !== null && 
         session.allianceId === allianceId && 
         session.hasEditPermission;
}

// セッションを更新（有効期限を延長）
export function refreshSession(): void {
  const session = getAuthSession();
  if (session) {
    saveAuthSession(session.allianceId, session.hasEditPermission);
  }
}
