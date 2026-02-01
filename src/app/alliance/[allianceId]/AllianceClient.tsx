"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAlliance, verifyPassword, updateAlliance, deleteAlliance } from '../../lib/api';
import type { Alliance } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

export default function AllianceClient() {
  const params = useParams();
  const router = useRouter();
  const allianceId = params.allianceId as string;
  const { user } = useAuth(); // Google認証状態を取得

  const [alliance, setAlliance] = useState<Alliance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // モーダル状態
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // フォーム状態
  const [password, setPassword] = useState('');
  const [editForm, setEditForm] = useState({
    allianceName: '',
    serverNumber: '',
    currentPassword: '',  // 更新時の認証用
    newPassword: '',      // 新しいパスワード(オプション)
  });
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');

  // 同盟情報の取得
  useEffect(() => {
    const fetchAlliance = async () => {
      try {
        const response = await getAlliance(allianceId);
        if (!response.ok || !response.alliance) {
          setError(response.error || '同盟が見つかりません');
          setLoading(false);
          return;
        }
        setAlliance(response.alliance);
        setEditForm({
          allianceName: response.alliance.allianceName,
          serverNumber: response.alliance.serverNumber,
          currentPassword: '',
          newPassword: '',
        });

        // Google認証済みで、かつユーザーIDが一致する場合は自動的に認証状態にする
        if (user && user.userId === response.alliance.userId) {
          console.log('Auto-authenticated: User owns this alliance');
          setIsAuthenticated(true);
        }
      } catch (err) {
        setError('同盟情報の取得に失敗しました');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (allianceId) {
      fetchAlliance();
    }
  }, [allianceId, user]);

  // パスワード認証
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await verifyPassword(allianceId, password);
      
      if (result.ok) {
        setIsAuthenticated(true);
        setShowPasswordModal(false);
        setPassword('');
      } else {
        alert(result.error || 'パスワードが正しくありません');
      }
    } catch (err) {
      alert('認証に失敗しました');
      console.error(err);
    }
  };

  // 同盟情報の更新
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!alliance) return;
    
    // Google認証済みで所有者の場合はパスワード不要、それ以外はパスワード必須
    const isOwner = user && user.userId === alliance.userId;
    if (!isOwner && !editForm.currentPassword) {
      alert('現在のパスワードを入力してください');
      return;
    }

    try {
      const result = await updateAlliance(
        allianceId,
        isOwner ? '' : editForm.currentPassword,  // 所有者の場合は空文字列
        {
          allianceName: String(editForm.allianceName || '').trim(),
          serverNumber: String(editForm.serverNumber || '').trim(),
          newPassword: String(editForm.newPassword || '').trim() || undefined,
        }
      );

      if (result.ok) {
        // 更新成功後、allianceを再取得
        const updatedResponse = await getAlliance(allianceId);
        if (updatedResponse.ok && updatedResponse.alliance) {
          setAlliance(updatedResponse.alliance);
        }
        setShowEditModal(false);
        setEditForm({
          ...editForm,
          currentPassword: '',
          newPassword: '',
        });
        alert('同盟情報を更新しました');
      } else {
        alert(result.error || '更新に失敗しました');
      }
    } catch (err) {
      alert('更新に失敗しました');
      console.error(err);
    }
  };

  // 同盟の削除
  const handleDelete = async () => {
    if (!alliance) return;
    
    if (deleteConfirmText.trim() !== String(alliance.allianceName).trim()) {
      alert('同盟名が一致しません');
      return;
    }
    
    if (!deletePassword.trim()) {
      alert('パスワードを入力してください');
      return;
    }

    try {
      const result = await deleteAlliance(allianceId, deletePassword.trim());
      
      if (result.ok) {
        alert('同盟を削除しました');
        router.push('/dashboard');
      } else {
        alert(result.error || '削除に失敗しました');
      }
    } catch (err) {
      alert('削除に失敗しました');
      console.error(err);
    }
  };

  // マップページへ遷移
  const goToMap = () => {
    router.push(`/map/${allianceId}`);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #7dd3fc 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* 背景エフェクト */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 30% 40%, rgba(147, 197, 253, 0.3) 0%, transparent 60%), radial-gradient(circle at 70% 60%, rgba(186, 230, 253, 0.2) 0%, transparent 50%)',
          animation: 'glacierPulse 3s ease-in-out infinite',
        }} />
        
        {/* ローディングコンテナ */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
        }}>
          {/* 氷河アニメーション - 回転する雪の結晶 */}
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'glacierSpin 3s linear infinite',
            filter: 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.6))',
          }}>
            ❄️
          </div>
          
          {/* ローディングテキスト */}
          <div style={{
            color: '#0c4a6e',
            fontSize: '20px',
            fontWeight: 'bold',
            marginBottom: '16px',
            textShadow: '0 2px 8px rgba(255, 255, 255, 0.8)',
            animation: 'glacierFade 2s ease-in-out infinite',
          }}>
            読み込み中
          </div>
          
          {/* ローディングバー */}
          <div style={{
            width: '200px',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '2px',
            overflow: 'hidden',
            margin: '0 auto',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
          }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 50%, #93c5fd 100%)',
              animation: 'glacierSlide 1.5s ease-in-out infinite',
              borderRadius: '2px',
              boxShadow: '0 0 10px rgba(59, 130, 246, 0.8)',
            }} />
          </div>
        </div>
        
        {/* CSS アニメーション */}
        <style jsx>{`
          @keyframes glacierSpin {
            0% {
              transform: rotate(0deg) scale(1);
            }
            50% {
              transform: rotate(180deg) scale(1.1);
            }
            100% {
              transform: rotate(360deg) scale(1);
            }
          }
          
          @keyframes glacierFade {
            0%, 100% {
              opacity: 0.7;
            }
            50% {
              opacity: 1;
            }
          }
          
          @keyframes glacierSlide {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(300%);
            }
          }
          
          @keyframes glacierPulse {
            0%, 100% {
              opacity: 0.6;
            }
            50% {
              opacity: 1;
            }
          }
        `}</style>
      </div>
    );
  }

  if (error || !alliance) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #7dd3fc 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* 背景エフェクト */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 30% 40%, rgba(147, 197, 253, 0.2) 0%, transparent 60%)',
        }} />
        
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 249, 255, 0.95) 100%)',
          padding: '32px',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(59, 130, 246, 0.2), 0 0 20px rgba(147, 197, 253, 0.3)',
          border: '2px solid rgba(147, 197, 253, 0.4)',
          maxWidth: '400px',
          width: '90%',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '16px',
            filter: 'drop-shadow(0 4px 8px rgba(239, 68, 68, 0.3))',
          }}>❌</div>
          <h1 style={{ 
            fontSize: '24px', 
            marginBottom: '16px', 
            color: '#0c4a6e',
            fontWeight: 'bold',
          }}>
            エラー
          </h1>
          <p style={{ 
            color: '#0369a1', 
            marginBottom: '24px',
            lineHeight: '1.6',
          }}>{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.5)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
            }}
          >
            ❄️ ダッシュボードに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #7dd3fc 100%)',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* 背景の氷河エフェクト */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 30%, rgba(147, 197, 253, 0.2) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(186, 230, 253, 0.15) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />
      
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 249, 255, 0.95) 100%)',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(59, 130, 246, 0.2), 0 0 20px rgba(147, 197, 253, 0.3)',
        border: '2px solid rgba(147, 197, 253, 0.4)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* ヘッダー */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2c5364 50%, #3a6073 100%)',
          padding: '32px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* 氷河エフェクト */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 30% 40%, rgba(100, 200, 255, 0.15) 0%, transparent 60%)',
            pointerEvents: 'none',
          }} />
          <h1 style={{ 
            fontSize: '28px', 
            marginBottom: '8px',
            position: 'relative',
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          }}>
            🏰 {alliance.allianceName}
          </h1>
          <p style={{ 
            opacity: 0.9,
            position: 'relative',
            textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)',
          }}>サーバー: {alliance.serverNumber}</p>
        </div>

        {/* コンテンツ */}
        <div style={{ padding: '32px' }}>
          {/* アクションボタン */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '32px'
          }}>
            <button
              onClick={goToMap}
              style={{
                padding: '16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>🗺️</span>
              <span>マップを見る</span>
            </button>

            {isAuthenticated && (
              <>
                <button
                  onClick={() => setShowEditModal(true)}
                  style={{
                    padding: '16px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span>✏️</span>
                  <span>編集</span>
                </button>

                <button
                  onClick={() => setShowDeleteModal(true)}
                  style={{
                    padding: '16px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span>🗑️</span>
                  <span>削除</span>
                </button>
              </>
            )}

            {!isAuthenticated && (
              <button
                onClick={() => setShowPasswordModal(true)}
                style={{
                  padding: '16px',
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span>🔒</span>
                <span>管理者認証</span>
              </button>
            )}

            <button
              onClick={() => setShowShareModal(true)}
              style={{
                padding: '16px',
                background: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>🔗</span>
              <span>共有</span>
            </button>
          </div>

          {/* 同盟情報 */}
          <div style={{
            background: '#f9fafb',
            padding: '24px',
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            <h2 style={{ fontSize: '18px', marginBottom: '16px', color: '#1f2937' }}>
              同盟情報
            </h2>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <span style={{ color: '#6b7280', fontSize: '14px' }}>同盟ID:</span>
                <div style={{ color: '#1f2937', fontSize: '16px', marginTop: '4px', fontFamily: 'monospace' }}>
                  {alliance.allianceId}
                </div>
              </div>
              <div>
                <span style={{ color: '#6b7280', fontSize: '14px' }}>作成日時:</span>
                <div style={{ color: '#1f2937', fontSize: '16px', marginTop: '4px' }}>
                  {new Date(alliance.createdAt).toLocaleString('ja-JP')}
                </div>
              </div>
            </div>
          </div>

          {/* 戻るボタン */}
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              width: '100%',
              padding: '12px',
              background: '#e5e7eb',
              color: '#1f2937',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ← ダッシュボードに戻る
          </button>
        </div>
      </div>

      {/* パスワード認証モーダル */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowPasswordModal(false)}>
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>管理者認証</h2>
            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="編集用パスワード"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  marginBottom: '16px'
                }}
                required
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  認証
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPassword('');
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#e5e7eb',
                    color: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 編集モーダル */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowEditModal(false)}>
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '24px', marginBottom: '24px' }}>同盟情報の編集</h2>
            <form onSubmit={handleUpdate}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#1f2937', fontWeight: '500' }}>
                  同盟名
                </label>
                <input
                  type="text"
                  value={editForm.allianceName}
                  onChange={(e) => setEditForm({ ...editForm, allianceName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#1f2937', fontWeight: '500' }}>
                  サーバー番号
                </label>
                <input
                  type="text"
                  value={editForm.serverNumber}
                  onChange={(e) => setEditForm({ ...editForm, serverNumber: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                  required
                />
              </div>

              {!(user && alliance && user.userId === alliance.userId) && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#1f2937', fontWeight: '500' }}>
                    現在のパスワード(必須)
                  </label>
                  <input
                    type="password"
                    value={editForm.currentPassword}
                    onChange={(e) => setEditForm({ ...editForm, currentPassword: e.target.value })}
                    placeholder="更新には必須です"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                    required
                  />
                </div>
              )}

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#1f2937', fontWeight: '500' }}>
                  新しいパスワード (変更する場合のみ)
                </label>
                <input
                  type="password"
                  value={editForm.newPassword}
                  onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                  placeholder="変更しない場合は空欄"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  更新
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#e5e7eb',
                    color: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 32, 39, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowDeleteModal(false)}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 240, 240, 0.98) 100%)',
            padding: '32px',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(239, 68, 68, 0.3)',
            border: '2px solid rgba(239, 68, 68, 0.3)',
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ 
              fontSize: '24px', 
              marginBottom: '16px', 
              background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              ⚠️ 同盟の削除
            </h2>
            <p style={{ marginBottom: '24px', color: '#6b7280' }}>
              この操作は取り消せません。同盟名とパスワードを入力して削除を確認してください。
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#1f2937', fontWeight: '500' }}>
                同盟名を入力: <span style={{ color: '#ef4444' }}>{alliance.allianceName}</span>
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => {
                  const value = e.target.value;
                  setDeleteConfirmText(value);
                  console.log('入力された同盟名:', value);
                  console.log('実際の同盟名:', alliance.allianceName);
                  console.log('一致:', value.trim() === String(alliance.allianceName).trim());
                }}
                placeholder={String(alliance.allianceName)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  marginBottom: '16px',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.6)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'}
              />
              <label style={{ display: 'block', marginBottom: '8px', color: '#1f2937', fontWeight: '500' }}>
                パスワード
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => {
                  const value = e.target.value;
                  setDeletePassword(value);
                  console.log('パスワード入力:', value ? '***' : '(空)');
                  console.log('パスワード長さ:', value.length);
                }}
                placeholder="編集用パスワード"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.6)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'}
              />
              {/* デバッグ情報 */}
              <div style={{ marginTop: '12px', padding: '8px', background: '#f3f4f6', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}>
                <div>入力された同盟名: "{deleteConfirmText}" (trim: "{deleteConfirmText.trim()}")</div>
                <div>実際の同盟名: "{alliance.allianceName}" (trim: "{String(alliance.allianceName).trim()}")</div>
                <div>同盟名一致: {deleteConfirmText.trim() === String(alliance.allianceName).trim() ? '✓' : '✗'}</div>
                <div>パスワード入力: {deletePassword.trim() ? '✓' : '✗'} ({deletePassword.length}文字)</div>
                <div style={{ color: (deleteConfirmText.trim() === String(alliance.allianceName).trim() && deletePassword.trim()) ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                  ボタン状態: {(deleteConfirmText.trim() === String(alliance.allianceName).trim() && deletePassword.trim()) ? '有効' : '無効'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleDelete}
                disabled={
                  deleteConfirmText.trim() !== String(alliance.allianceName).trim() || !deletePassword.trim()
                }
                style={{
                  flex: 1,
                  padding: '12px',
                  background: (deleteConfirmText.trim() === String(alliance.allianceName).trim() && deletePassword.trim()) 
                    ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' 
                    : '#e5e7eb',
                  color: (deleteConfirmText.trim() === String(alliance.allianceName).trim() && deletePassword.trim()) ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: (deleteConfirmText.trim() === String(alliance.allianceName).trim() && deletePassword.trim()) ? 'pointer' : 'not-allowed',
                  boxShadow: (deleteConfirmText.trim() === String(alliance.allianceName).trim() && deletePassword.trim()) 
                    ? '0 4px 12px rgba(239, 68, 68, 0.4)' 
                    : 'none',
                  transition: 'all 0.2s',
                }}
              >
                削除する
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                  setDeletePassword('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'rgba(229, 231, 235, 0.9)',
                  color: '#1f2937',
                  border: '2px solid rgba(150, 220, 255, 0.3)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 共有モーダル */}
      {showShareModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }} onClick={() => setShowShareModal(false)}>
          <div style={{
            background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #7dd3fc 100%)',
            padding: '32px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(59, 130, 246, 0.5), 0 0 40px rgba(96, 165, 250, 0.4)',
            border: '1px solid rgba(147, 197, 253, 0.5)'
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#0c4a6e' }}>❄️ 共有情報</h2>
            
            {/* 閲覧用リンク */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
                📖 閲覧用リンク
              </h3>
              <p style={{ marginBottom: '12px', color: '#6b7280', fontSize: '14px' }}>
                マップを見るだけの場合はこのリンクを共有
              </p>
              <div style={{
                background: '#f9fafb',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '12px',
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                fontSize: '13px',
                border: '1px solid #e5e7eb'
              }}>
                {typeof window !== 'undefined' ? `${window.location.origin}/map/${allianceId}` : ''}
              </div>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    navigator.clipboard.writeText(`${window.location.origin}/map/${allianceId}`);
                    alert('閲覧用リンクをコピーしました！');
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                📋 閲覧用リンクをコピー
              </button>
            </div>

            {/* 編集用パスワード */}
            {alliance && alliance.editPassword && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
                  🔑 編集用パスワード
                </h3>
                <p style={{ marginBottom: '12px', color: '#6b7280', fontSize: '14px' }}>
                  マップを編集する人にはこのパスワードも伝えてください
                </p>
                <div style={{
                  background: '#fef3c7',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  fontFamily: 'monospace',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  border: '2px solid #fbbf24',
                  color: '#92400e'
                }}>
                  {alliance.editPassword}
                </div>
                <button
                  onClick={() => {
                    if (alliance.editPassword) {
                      navigator.clipboard.writeText(alliance.editPassword);
                      alert('編集用パスワードをコピーしました！');
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  📋 パスワードをコピー
                </button>
              </div>
            )}

            {/* スプレッドシート直接リンク */}
            {alliance && alliance.spreadsheetId && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
                  📊 スプレッドシート
                </h3>
                <p style={{ marginBottom: '12px', color: '#6b7280', fontSize: '14px' }}>
                  データを直接確認・編集するスプレッドシート
                </p>
                <div style={{
                  background: '#f9fafb',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  wordBreak: 'break-all',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  border: '1px solid #e5e7eb'
                }}>
                  {`https://docs.google.com/spreadsheets/d/${alliance.spreadsheetId}/edit`}
                </div>
                <button
                  onClick={() => {
                    const url = `https://docs.google.com/spreadsheets/d/${alliance.spreadsheetId}/edit`;
                    navigator.clipboard.writeText(url);
                    alert('スプレッドシートのリンクをコピーしました！');
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginBottom: '8px'
                  }}
                >
                  📋 スプレッドシートをコピー
                </button>
                <button
                  onClick={() => {
                    window.open(`https://docs.google.com/spreadsheets/d/${alliance.spreadsheetId}/edit`, '_blank');
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  🔗 スプレッドシートを開く
                </button>
              </div>
            )}

            <button
              onClick={() => setShowShareModal(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#e5e7eb',
                color: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
