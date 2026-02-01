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
        background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '16px' : '20px',
        overflow: 'hidden',
      }}
    >
      {/* 雪の結晶背景エフェクト */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 50%, rgba(100, 200, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(150, 220, 255, 0.08) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />
      
      <div style={{ maxWidth: '800px', width: '100%', position: 'relative', zIndex: 1 }}>
        {/* メインカード */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 248, 255, 0.95) 100%)',
            borderRadius: isMobile ? '12px' : '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4), 0 0 40px rgba(100, 200, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
            padding: isMobile ? '32px 20px' : '48px',
            textAlign: 'center',
            border: '1px solid rgba(150, 220, 255, 0.3)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ fontSize: isMobile ? '48px' : '64px', marginBottom: '16px', filter: 'drop-shadow(0 4px 8px rgba(100, 200, 255, 0.3))' }}>❄️</div>
          <h1
            style={{
              fontSize: isMobile ? '24px' : isTablet ? '32px' : '36px',
              fontWeight: 'bold',
              marginBottom: '12px',
              background: 'linear-gradient(135deg, #1e3a5f 0%, #2c5364 50%, #3a6073 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1.2,
              textShadow: '0 2px 10px rgba(100, 200, 255, 0.2)',
            }}
          >
            WOS Map Manager
          </h1>
          <p
            style={{
              fontSize: isMobile ? '14px' : '18px',
              color: '#2c5364',
              marginBottom: isMobile ? '32px' : '40px',
              lineHeight: 1.6,
              fontWeight: 500,
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
            <div style={{ 
              textAlign: 'center',
              padding: isMobile ? '16px' : '20px',
              background: 'linear-gradient(135deg, rgba(100, 200, 255, 0.1) 0%, rgba(150, 220, 255, 0.05) 100%)',
              borderRadius: '12px',
              border: '1px solid rgba(100, 200, 255, 0.2)',
            }}>
              <div style={{ fontSize: isMobile ? '28px' : '32px', marginBottom: '8px', filter: 'drop-shadow(0 2px 4px rgba(100, 200, 255, 0.3))' }}>🔗</div>
              <h3 style={{ 
                fontSize: isMobile ? '14px' : '16px', 
                fontWeight: 'bold', 
                marginBottom: '8px',
                color: '#1e3a5f',
              }}>
                簡単共有
              </h3>
              <p style={{ fontSize: isMobile ? '12px' : '14px', color: '#2c5364' }}>
                URLで簡単に共有可能
              </p>
            </div>

            <div style={{ 
              textAlign: 'center',
              padding: isMobile ? '16px' : '20px',
              background: 'linear-gradient(135deg, rgba(100, 200, 255, 0.1) 0%, rgba(150, 220, 255, 0.05) 100%)',
              borderRadius: '12px',
              border: '1px solid rgba(100, 200, 255, 0.2)',
            }}>
              <div style={{ fontSize: isMobile ? '28px' : '32px', marginBottom: '8px', filter: 'drop-shadow(0 2px 4px rgba(100, 200, 255, 0.3))' }}>🔐</div>
              <h3 style={{ 
                fontSize: isMobile ? '14px' : '16px', 
                fontWeight: 'bold', 
                marginBottom: '8px',
                color: '#1e3a5f',
              }}>
                Googleログイン
              </h3>
              <p style={{ fontSize: isMobile ? '12px' : '14px', color: '#2c5364' }}>
                安全で簡単な認証
              </p>
            </div>

            <div style={{ 
              textAlign: 'center',
              padding: isMobile ? '16px' : '20px',
              background: 'linear-gradient(135deg, rgba(100, 200, 255, 0.1) 0%, rgba(150, 220, 255, 0.05) 100%)',
              borderRadius: '12px',
              border: '1px solid rgba(100, 200, 255, 0.2)',
            }}>
              <div style={{ fontSize: isMobile ? '28px' : '32px', marginBottom: '8px', filter: 'drop-shadow(0 2px 4px rgba(100, 200, 255, 0.3))' }}>🏔️</div>
              <h3 style={{ 
                fontSize: isMobile ? '14px' : '16px', 
                fontWeight: 'bold', 
                marginBottom: '8px',
                color: '#1e3a5f',
              }}>
                複数同盟管理
              </h3>
              <p style={{ fontSize: isMobile ? '12px' : '14px', color: '#2c5364' }}>
                1アカウントで最大5同盟
              </p>
            </div>
          </div>
        </div>

        {/* 使い方セクション */}
        <div
          style={{
            marginTop: isMobile ? '16px' : '32px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 248, 255, 0.95) 100%)',
            borderRadius: isMobile ? '12px' : '20px',
            padding: isMobile ? '24px 20px' : '32px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2), 0 0 20px rgba(100, 200, 255, 0.15)',
            border: '1px solid rgba(150, 220, 255, 0.3)',
          }}
        >
          <h2
            style={{
              fontSize: isMobile ? '20px' : '24px',
              fontWeight: 'bold',
              marginBottom: isMobile ? '20px' : '24px',
              textAlign: 'center',
              background: 'linear-gradient(135deg, #1e3a5f 0%, #2c5364 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            使い方
          </h2>

          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, #4a90e2 0%, #63b3ed 100%)',
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
                  boxShadow: '0 4px 12px rgba(74, 144, 226, 0.4)',
                }}
              >
                1
              </div>
              <div>
                <h3 style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: 'bold', marginBottom: '4px', color: '#1e3a5f' }}>
                  Googleログイン
                </h3>
                <p style={{ fontSize: isMobile ? '12px' : '14px', color: '#2c5364', margin: 0 }}>
                  Googleアカウントでログイン
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, #4a90e2 0%, #63b3ed 100%)',
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
                  boxShadow: '0 4px 12px rgba(74, 144, 226, 0.4)',
                }}
              >
                2
              </div>
              <div>
                <h3 style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: 'bold', marginBottom: '4px', color: '#1e3a5f' }}>
                  同盟を作成
                </h3>
                <p style={{ fontSize: isMobile ? '12px' : '14px', color: '#2c5364', margin: 0 }}>
                  ダッシュボードから新しい同盟を作成（最大5個）
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, #4a90e2 0%, #63b3ed 100%)',
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
                  boxShadow: '0 4px 12px rgba(74, 144, 226, 0.4)',
                }}
              >
                3
              </div>
              <div>
                <h3 style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: 'bold', marginBottom: '4px', color: '#1e3a5f' }}>
                  マップを編集
                </h3>
                <p style={{ fontSize: isMobile ? '12px' : '14px', color: '#2c5364', margin: 0 }}>
                  パスワードを入力してマップを編集・管理
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div style={{ marginTop: isMobile ? '24px' : '32px', textAlign: 'center' }}>
          <p style={{ fontSize: isMobile ? '12px' : '14px', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '8px', textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
            © 2026 WOS Map Manager | Powered by Next.js & Google Sheets
          </p>
          <p style={{ fontSize: isMobile ? '11px' : '12px', color: 'rgba(200, 230, 255, 0.8)', textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}>
            #2926 SNW/セシル
          </p>
        </div>
      </div>
    </div>
  );
}
