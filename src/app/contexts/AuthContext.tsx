"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, AuthSession } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credential: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'wos_google_auth';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7日間

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // セッション復元
  useEffect(() => {
    const savedSession = localStorage.getItem(AUTH_STORAGE_KEY);
    if (savedSession) {
      try {
        const session: AuthSession = JSON.parse(savedSession);
        if (session.expiresAt > Date.now()) {
          setUser(session.user);
        } else {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (credential: string) => {
    try {
      // JWT credentialをデコード
      const base64Url = credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      const payload = JSON.parse(jsonPayload);

      console.log('Google Login Payload:', {
        userId: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      });

      const newUser: User = {
        userId: payload.sub,
        googleEmail: payload.email,
        displayName: payload.name,
        photoURL: payload.picture,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };

      // マスターAPIにユーザー情報を登録/更新（エラーでもログインは継続）
      const masterApiUrl = process.env.NEXT_PUBLIC_MASTER_API_URL;
      if (masterApiUrl) {
        try {
          const params = new URLSearchParams({
            action: 'upsertUser',
            userId: newUser.userId,
            googleEmail: newUser.googleEmail,
            displayName: newUser.displayName || '',
            photoURL: newUser.photoURL || '',
          });

          console.log('Sending user data to GAS:', {
            userId: newUser.userId,
            googleEmail: newUser.googleEmail,
            displayName: newUser.displayName,
          });

          const response = await fetch(`${masterApiUrl}?${params.toString()}`, {
            method: 'GET',
          });

          const result = await response.json();
          console.log('GAS upsertUser response:', result);
        } catch (apiError) {
          // API呼び出しが失敗してもログインは継続
          console.warn('Failed to sync user to master API:', apiError);
        }
      }

      // セッションを保存
      const session: AuthSession = {
        user: newUser,
        idToken: credential,
        expiresAt: Date.now() + SESSION_DURATION,
      };

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      setUser(newUser);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
