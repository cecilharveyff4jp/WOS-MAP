"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import GoogleLoginButton from './components/auth/GoogleLoginButton';
import { useAuth } from './contexts/AuthContext';
import { useMediaQuery } from './hooks/useMediaQuery';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { isMobile, isTablet } = useMediaQuery();

  // 既にログイン済みならダッシュボードにリダイレクト
  React.useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '16px' : '20px',
      }}
    >
      <div style={{ maxWidth: '800px', width: '100%' }}>
        {/* メインカード */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: isMobile ? '12px' : '16px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            padding: isMobile ? '32px 20px' : '48px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: isMobile ? '48px' : '64px', marginBottom: '16px' }}>🗺️</div>
          <h1
            style={{
              fontSize: isMobile ? '24px' : isTablet ? '32px' : '36px',
              fontWeight: 'bold',
              marginBottom: '12px',
              color: '#333',
              lineHeight: 1.2,
            }}
          >
            WOS Map Manager
          </h1>
          <p
            style={{
              fontSize: isMobile ? '14px' : '18px',
              color: '#666',
              marginBottom: isMobile ? '32px' : '40px',
              lineHeight: 1.6,
            }}
          >
            Whiteout Survivalの同盟マップを<br style={{ display: isMobile ? 'block' : 'none' }} />
            簡単に管理・共有
          </p>

          {/* ログインボタン */}
          <div style={{ marginBottom: isMobile ? '32px' : '40px' }}>
            <GoogleLoginButton />
          </div>

          {/* 機能一覧 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: isMobile ? '20px' : '24px',
              marginTop: isMobile ? '32px' : '40px',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: isMobile ? '28px' : '32px', marginBottom: '8px' }}>🔗</div>
              <h3 style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                簡単共有
              </h3>
              <p style={{ fontSize: isMobile ? '12px' : '14px', color: '#666' }}>
                URLで簡単に共有可能
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: isMobile ? '28px' : '32px', marginBottom: '8px' }}>🔐</div>
              <h3 style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                Googleログイン
              </h3>
              <p style={{ fontSize: isMobile ? '12px' : '14px', color: '#666' }}>
                安全で簡単な認証
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: isMobile ? '28px' : '32px', marginBottom: '8px' }}>🏢</div>
              <h3 style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                複数同盟管理
              </h3>
              <p style={{ fontSize: isMobile ? '12px' : '14px', color: '#666' }}>
                1アカウントで最大5同盟
              </p>
            </div>
          </div>
        </div>

        {/* 使い方セクション */}
        <div
          style={{
            marginTop: isMobile ? '16px' : '32px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: isMobile ? '12px' : '16px',
            padding: isMobile ? '24px 20px' : '32px',
          }}
        >
          <h2
            style={{
              fontSize: isMobile ? '20px' : '24px',
              fontWeight: 'bold',
              marginBottom: isMobile ? '20px' : '24px',
              textAlign: 'center',
            }}
          >
            使い方
          </h2>

          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start' }}>
              <div
                style={{
                  backgroundColor: '#667eea',
                  color: 'white',
                  width: isMobile ? '28px' : '32px',
                  height: isMobile ? '28px' : '32px',
                  minWidth: isMobile ? '28px' : '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: isMobile ? '14px' : '16px',
                  marginRight: '12px',
                  flexShrink: 0,
                }}
              >
                1
              </div>
              <div>
                <h3 style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: 'bold', marginBottom: '4px' }}>
                  Googleログイン
                </h3>
                <p style={{ fontSize: isMobile ? '12px' : '14px', color: '#666', margin: 0 }}>
                  Googleアカウントでログイン
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start' }}>
              <div
                style={{
                  backgroundColor: '#667eea',
                  color: 'white',
                  width: isMobile ? '28px' : '32px',
                  height: isMobile ? '28px' : '32px',
                  minWidth: isMobile ? '28px' : '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: isMobile ? '14px' : '16px',
                  marginRight: '12px',
                  flexShrink: 0,
                }}
              >
                2
              </div>
              <div>
                <h3 style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: 'bold', marginBottom: '4px' }}>
                  同盟を作成
                </h3>
                <p style={{ fontSize: isMobile ? '12px' : '14px', color: '#666', margin: 0 }}>
                  ダッシュボードから新しい同盟を作成（最大5個）
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start' }}>
              <div
                style={{
                  backgroundColor: '#667eea',
                  color: 'white',
                  width: isMobile ? '28px' : '32px',
                  height: isMobile ? '28px' : '32px',
                  minWidth: isMobile ? '28px' : '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: isMobile ? '14px' : '16px',
                  marginRight: '12px',
                  flexShrink: 0,
                }}
              >
                3
              </div>
              <div>
                <h3 style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: 'bold', marginBottom: '4px' }}>
                  マップを編集
                </h3>
                <p style={{ fontSize: isMobile ? '12px' : '14px', color: '#666', margin: 0 }}>
                  パスワードを入力してマップを編集・管理
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div style={{ marginTop: isMobile ? '24px' : '32px', textAlign: 'center' }}>
          <p style={{ fontSize: isMobile ? '12px' : '14px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px' }}>
            © 2026 WOS Map Manager | Powered by Next.js & Google Sheets
          </p>
          <p style={{ fontSize: isMobile ? '11px' : '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
            #2926 SNW/セシル
          </p>
        </div>
      </div>
    </div>
  );
}
