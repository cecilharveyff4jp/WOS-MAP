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
    
    if (deleteConfirmText !== alliance.allianceName) {
      alert('同盟名が一致しません');
      return;
    }
    
    // Google認証済みで所有者の場合はパスワード不要、それ以外はパスワード必須
    const isOwner = user && user.userId === alliance.userId;
    if (!isOwner && !deletePassword) {
      alert('パスワードを入力してください');
      return;
    }

    try {
      const result = await deleteAlliance(allianceId, isOwner ? 'google-auth' : deletePassword);
      
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ color: 'white', fontSize: '18px' }}>読み込み中...</div>
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          background: 'white',
          padding: '32px',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          maxWidth: '400px',
          width: '90%',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h1 style={{ fontSize: '24px', marginBottom: '16px', color: '#1f2937' }}>
            エラー
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              width: '100%',
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
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {/* ヘッダー */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '32px',
          color: 'white'
        }}>
          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>
            {alliance.allianceName}
          </h1>
          <p style={{ opacity: 0.9 }}>サーバー: {alliance.serverNumber}</p>
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
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowDeleteModal(false)}>
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#ef4444' }}>
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
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={alliance.allianceName}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  marginBottom: '16px'
                }}
              />
              {!(user && alliance && user.userId === alliance.userId) && (
                <>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#1f2937', fontWeight: '500' }}>
                    パスワード
                  </label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="編集用パスワード"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleDelete}
                disabled={deleteConfirmText !== alliance.allianceName || (!(user && user.userId === alliance.userId) && !deletePassword)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: (deleteConfirmText === alliance.allianceName && ((user && user.userId === alliance.userId) || deletePassword)) ? '#ef4444' : '#e5e7eb',
                  color: (deleteConfirmText === alliance.allianceName && ((user && user.userId === alliance.userId) || deletePassword)) ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: (deleteConfirmText === alliance.allianceName && ((user && user.userId === alliance.userId) || deletePassword)) ? 'pointer' : 'not-allowed'
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
          zIndex: 1000
        }} onClick={() => setShowShareModal(false)}>
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>🔗 共有情報</h2>
            
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
