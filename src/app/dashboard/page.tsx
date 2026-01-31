'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { getUserAlliances } from '../lib/api';
import type { Alliance } from '../types/alliance';
import { useMediaQuery } from '../hooks/useMediaQuery';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const { isMobile, isTablet } = useMediaQuery();
  const [alliances, setAlliances] = useState<Alliance[]>([]);
  const [loadingAlliances, setLoadingAlliances] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
      return;
    }

    if (user?.userId) {
      console.log('=== Dashboard Debug ===');
      console.log('User ID:', user.userId);
      console.log('Fetching alliances...');
      
      getUserAlliances(user.userId)
        .then((data) => {
          console.log('Alliances fetched successfully:', data);
          // 有効な同盟のみをフィルタリング
          const activeAlliances = data.filter(alliance => alliance.isActive === true);
          setAlliances(activeAlliances);
        })
        .catch((error) => {
          console.error('Failed to fetch alliances:', error);
          alert('同盟情報の取得に失敗しました: ' + error.message);
        })
        .finally(() => {
          console.log('Loading complete');
          setLoadingAlliances(false);
        });
    } else {
      console.log('No user.userId, setting loading to false');
      setLoadingAlliances(false);
    }
  }, [user, isLoading, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleCreateAlliance = () => {
    router.push('/alliance/new');
  };

  const handleEditAlliance = (allianceId: string) => {
    router.push(`/alliance/${allianceId}`);
  };

  if (isLoading || !user) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <div style={{ color: 'white', fontSize: isMobile ? '16px' : '18px' }}>読み込み中...</div>
      </div>
    );
  }

  const activeAlliances = alliances.filter((a) => a.isActive);
  const canCreateMore = activeAlliances.length < 5;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: isMobile ? '12px' : '20px',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* ヘッダー */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: isMobile ? '12px' : '16px',
          padding: isMobile ? '16px' : '24px',
          marginBottom: isMobile ? '16px' : '24px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '16px' : '0',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '16px' }}>
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt={user.displayName}
                style={{
                  width: isMobile ? '48px' : '56px',
                  height: isMobile ? '48px' : '56px',
                  borderRadius: '50%',
                  border: '2px solid #667eea',
                  flexShrink: 0,
                }}
              />
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 style={{ 
                fontSize: isMobile ? '18px' : '24px', 
                fontWeight: 'bold', 
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {user.displayName}
              </h1>
              <p style={{ 
                fontSize: isMobile ? '12px' : '14px', 
                color: '#666', 
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {user.googleEmail}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: isMobile ? '10px 20px' : '12px 24px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s',
              minHeight: '44px',
              whiteSpace: 'nowrap',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#d32f2f';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#f44336';
            }}
          >
            ログアウト
          </button>
        </div>

        {/* 同盟一覧 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: isMobile ? '12px' : '16px',
          padding: isMobile ? '20px' : '32px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '16px' : '0',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'stretch' : 'center',
            marginBottom: isMobile ? '20px' : '24px',
          }}>
            <h2 style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: 'bold', margin: 0 }}>
              マイ同盟 ({activeAlliances.length}/5)
            </h2>
            {canCreateMore && (
              <button
                onClick={handleCreateAlliance}
                style={{
                  padding: isMobile ? '12px 20px' : '12px 24px',
                  backgroundColor: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  minHeight: '44px',
                  whiteSpace: 'nowrap',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#5568d3';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#667eea';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                ➕ {isMobile ? '新規作成' : '新しい同盟を作成'}
              </button>
            )}
          </div>

          {loadingAlliances ? (
            <div style={{ textAlign: 'center', padding: isMobile ? '30px' : '40px', color: '#666' }}>
              同盟情報を読み込み中...
            </div>
          ) : alliances.length === 0 ? (
            <div style={{ textAlign: 'center', padding: isMobile ? '40px 20px' : '60px' }}>
              <div style={{ fontSize: isMobile ? '48px' : '64px', marginBottom: '16px' }}>🏰</div>
              <h3 style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 'bold', marginBottom: '8px' }}>
                まだ同盟がありません
              </h3>
              <p style={{ fontSize: isMobile ? '13px' : '14px', color: '#666', marginBottom: '24px' }}>
                最初の同盟を作成しましょう
              </p>
              <button
                onClick={handleCreateAlliance}
                style={{
                  padding: isMobile ? '12px 28px' : '12px 32px',
                  backgroundColor: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                同盟を作成
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: isMobile ? '16px' : '20px',
            }}>
              {alliances.map((alliance) => {
                const isInactive = !alliance.isActive;
                return (
                  <div
                    key={alliance.allianceId}
                    style={{
                      border: '1px solid #e0e0e0',
                      borderRadius: '12px',
                      padding: isMobile ? '16px' : '20px',
                      cursor: isInactive ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: isInactive ? '#f5f5f5' : '#fafafa',
                      opacity: isInactive ? 0.6 : 1,
                      position: 'relative',
                      minHeight: isMobile ? '120px' : 'auto',
                    }}
                    onClick={() => !isInactive && handleEditAlliance(alliance.allianceId)}
                    onMouseOver={(e) => {
                      if (!isInactive && !isMobile) {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                        e.currentTarget.style.transform = 'translateY(-4px)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isInactive && !isMobile) {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {isInactive && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: isMobile ? '6px 12px' : '8px 16px',
                        borderRadius: '4px',
                        fontSize: isMobile ? '12px' : '14px',
                        fontWeight: 'bold',
                        pointerEvents: 'none',
                      }}>
                        🗑️ 削除済み
                      </div>
                    )}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '12px',
                      gap: '8px',
                    }}>
                      <h3 style={{
                        fontSize: isMobile ? '16px' : '18px',
                        fontWeight: 'bold',
                        margin: 0,
                        color: '#333',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}>
                        {alliance.allianceName}
                      </h3>
                      <span style={{
                        backgroundColor: alliance.isActive ? '#4caf50' : '#999',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: isMobile ? '11px' : '12px',
                        fontWeight: 'bold',
                        flexShrink: 0,
                      }}>
                        {alliance.isActive ? 'アクティブ' : '無効'}
                      </span>
                    </div>
                    <p style={{
                      fontSize: isMobile ? '13px' : '14px',
                      color: '#666',
                      margin: '0 0 8px 0',
                    }}>
                      🌍 サーバー: {alliance.serverNumber}
                    </p>
                    <p style={{
                      fontSize: isMobile ? '11px' : '12px',
                      color: '#999',
                      margin: 0,
                    }}>
                      作成日: {new Date(alliance.createdAt).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {!canCreateMore && (
            <div style={{
              marginTop: isMobile ? '20px' : '24px',
              padding: isMobile ? '12px' : '16px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '8px',
              color: '#856404',
              fontSize: isMobile ? '12px' : '14px',
              lineHeight: 1.5,
            }}>
              ⚠️ 同盟数の上限（5個）に達しています。新しい同盟を作成するには、既存の同盟を削除してください。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
