"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAlliance, verifyPassword, updateAlliance, deleteAlliance } from '../../lib/api';
import type { Alliance } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

export default function AllianceMapPage() {
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
    newPassword: '',
  });
  const [deletePassword, setDeletePassword] = useState('');
  const [processing, setProcessing] = useState(false);
  const [modalError, setModalError] = useState('');
  const [showPassword, setShowPassword] = useState(false); // パスワード表示切替

  useEffect(() => {
    if (!allianceId) {
      setError('同盟IDが指定されていません');
      setLoading(false);
      return;
    }

    // Google認証されている場合は自動的に認証済みにする
    if (user) {
      setIsAuthenticated(true);
    }

    loadAlliance();
  }, [allianceId, user]);

  const loadAlliance = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await getAlliance(allianceId);

      if (result.ok && result.alliance) {
        setAlliance(result.alliance);
        setEditForm({
          allianceName: result.alliance.allianceName,
          serverNumber: result.alliance.serverNumber,
          newPassword: '',
        });
      } else {
        setError(result.error || '同盟が見つかりません');
      }
    } catch (err) {
      setError('データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // パスワード認証
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setModalError('');

    try {
      const result = await verifyPassword(allianceId, password);

      if (result.ok && result.isValid) {
        setIsAuthenticated(true);
        setShowPasswordModal(false);
        setPassword('');
      } else {
        setModalError('パスワードが正しくありません');
      }
    } catch (err) {
      setModalError('認証に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  // 同盟情報の更新
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alliance) return;

    setProcessing(true);
    setModalError('');

    try {
      const updates: any = {};
      if (editForm.allianceName !== alliance.allianceName) {
        updates.allianceName = editForm.allianceName;
      }
      if (editForm.serverNumber !== alliance.serverNumber) {
        updates.serverNumber = editForm.serverNumber;
      }
      if (editForm.newPassword) {
        updates.newPassword = editForm.newPassword;
      }

      // Google認証されている場合はパスワード不要
      const authPassword = user ? '' : password;
      const result = await updateAlliance(allianceId, authPassword, updates);

      if (result.ok) {
        setShowEditModal(false);
        setEditForm({ ...editForm, newPassword: '' });
        await loadAlliance();
        alert('同盟情報を更新しました');
      } else {
        setModalError(result.error || '更新に失敗しました');
      }
    } catch (err) {
      setModalError('更新に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  // 同盟削除
  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setProcessing(true);
    setModalError('');

    try {
      console.log('削除開始:', {
        allianceId,
        password: deletePassword,
        storedPassword: alliance?.editPassword
      });
      
      const result = await deleteAlliance(allianceId, deletePassword);
      
      console.log('削除結果:', result);

      if (result.ok) {
        alert('同盟を削除しました');
        router.push('/dashboard');
      } else {
        console.error('削除エラー:', result.error);
        setModalError(result.error || '削除に失敗しました');
      }
    } catch (err) {
      console.error('削除例外:', err);
      setModalError(`削除に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setProcessing(false);
    }
  };

  // URL共有
  const mapUrl = typeof window !== 'undefined' ? `${window.location.origin}/map/${allianceId}` : '';
  const spreadsheetUrl = alliance ? `https://docs.google.com/spreadsheets/d/${alliance.spreadsheetId}/edit` : '';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label}をコピーしました`);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #007bff', borderRadius: '50%', width: '50px', height: '50px', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#666' }}>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !alliance) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '20px' }}>
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', maxWidth: '500px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>エラー</h2>
          <p style={{ color: '#666', marginBottom: '24px' }}>{error}</p>
          <button onClick={() => router.push('/dashboard')} style={{ padding: '12px 24px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* ヘッダー */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #ddd', padding: '16px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{alliance.allianceName}</h1>
            <p style={{ color: '#666', fontSize: '14px', margin: '4px 0 0 0' }}>サーバー: {alliance.serverNumber}</p>
          </div>
          <button onClick={() => router.push('/dashboard')} style={{ padding: '8px 16px', backgroundColor: 'white', color: '#333', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}>
            ダッシュボード
          </button>
        </div>
      </div>

      {/* コンテンツ */}
      <div style={{ padding: '40px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* 認証が必要 */}
          {!isAuthenticated ? (
            <div style={{ backgroundColor: 'white', padding: '60px 40px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔒</div>
              <h2 style={{ fontSize: '28px', marginBottom: '16px' }}>編集パスワードが必要です</h2>
              <p style={{ color: '#666', marginBottom: '32px' }}>同盟情報を表示・編集するには、パスワード認証が必要です</p>
              <button onClick={() => setShowPasswordModal(true)} style={{ padding: '14px 40px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer' }}>
                パスワード入力
              </button>
            </div>
          ) : (
            <>
              {/* アクションボタン */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <button onClick={() => router.push(`/map/${allianceId}`)} style={{ padding: '20px', backgroundColor: 'white', border: '2px solid #6f42c1', borderRadius: '8px', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗺️</div>
                  <div style={{ fontWeight: 'bold', color: '#6f42c1' }}>マップを開く</div>
                </button>
                <button onClick={() => setShowShareModal(true)} style={{ padding: '20px', backgroundColor: 'white', border: '2px solid #007bff', borderRadius: '8px', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔗</div>
                  <div style={{ fontWeight: 'bold', color: '#007bff' }}>共有URL</div>
                </button>
                <button onClick={() => setShowEditModal(true)} style={{ padding: '20px', backgroundColor: 'white', border: '2px solid #28a745', borderRadius: '8px', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>✏️</div>
                  <div style={{ fontWeight: 'bold', color: '#28a745' }}>情報編集</div>
                </button>
                <button onClick={() => setShowDeleteModal(true)} style={{ padding: '20px', backgroundColor: 'white', border: '2px solid #dc3545', borderRadius: '8px', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗑️</div>
                  <div style={{ fontWeight: 'bold', color: '#dc3545' }}>同盟削除</div>
                </button>
              </div>

              {/* スプレッドシート情報 */}
              <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
                <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>📊 Googleスプレッドシート</h3>
                <p style={{ color: '#666', marginBottom: '16px', fontSize: '14px' }}>マップデータはGoogleスプレッドシートに保存されています</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <code style={{ flex: 1, backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {alliance.spreadsheetId}
                  </code>
                  <a href={spreadsheetUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '10px 20px', backgroundColor: '#34a853', color: 'white', textDecoration: 'none', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                    開く
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* パスワード認証モーダル */}
      {showPasswordModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '8px', width: '90%', maxWidth: '400px' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>パスワード入力</h3>
            <form onSubmit={handlePasswordSubmit}>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="編集パスワード" style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '16px', fontSize: '16px' }} required />
              {modalError && <p style={{ color: '#dc3545', fontSize: '14px', marginBottom: '16px' }}>{modalError}</p>}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => { setShowPasswordModal(false); setPassword(''); setModalError(''); }} style={{ flex: 1, padding: '12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} disabled={processing}>
                  キャンセル
                </button>
                <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} disabled={processing}>
                  {processing ? '確認中...' : '認証'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 共有URLモーダル */}
      {showShareModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>🔗 共有情報</h3>
            
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>編集パスワード</p>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>同盟員がマップを編集する際に必要です</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input type="text" value={alliance?.editPassword || ''} readOnly style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px', backgroundColor: '#fff3cd', fontWeight: 'bold', boxSizing: 'border-box' }} />
                <button onClick={() => copyToClipboard(alliance?.editPassword || '', 'パスワード')} style={{ width: '100%', padding: '10px 20px', backgroundColor: '#ffc107', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  📋 パスワードをコピー
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>マップページURL</p>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>同盟員に共有してください（編集パスワードで編集可能）</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input type="text" value={mapUrl} readOnly style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', backgroundColor: '#f9f9f9', boxSizing: 'border-box', wordBreak: 'break-all' }} />
                <button onClick={() => copyToClipboard(mapUrl, 'URL')} style={{ width: '100%', padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  📋 URLをコピー
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>Googleスプレッドシート</p>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>直接データを確認・編集できます</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input type="text" value={spreadsheetUrl} readOnly style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', backgroundColor: '#f9f9f9', boxSizing: 'border-box', wordBreak: 'break-all' }} />
                <button onClick={() => copyToClipboard(spreadsheetUrl, 'スプレッドシートURL')} style={{ width: '100%', padding: '10px 20px', backgroundColor: '#34a853', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  📋 スプレッドシートURLをコピー
                </button>
              </div>
            </div>

            <button onClick={() => setShowShareModal(false)} style={{ width: '100%', padding: '12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* 編集モーダル */}
      {showEditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '8px', width: '90%', maxWidth: '500px' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>✏️ 同盟情報の編集</h3>
            <form onSubmit={handleEditSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>同盟名</label>
                <input type="text" value={editForm.allianceName} onChange={(e) => setEditForm({ ...editForm, allianceName: e.target.value })} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' }} required />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>サーバー番号</label>
                <input type="text" value={editForm.serverNumber} onChange={(e) => setEditForm({ ...editForm, serverNumber: e.target.value })} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' }} required />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>新しいパスワード（変更する場合のみ）</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? "text" : "password"} value={editForm.newPassword} onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })} placeholder="変更しない場合は空欄" style={{ width: '100%', padding: '12px', paddingRight: '48px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>※ 4文字以上で入力してください</p>
              </div>
              {modalError && <p style={{ color: '#dc3545', fontSize: '14px', marginBottom: '16px' }}>{modalError}</p>}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => { setShowEditModal(false); setModalError(''); }} style={{ flex: 1, padding: '12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} disabled={processing}>
                  キャンセル
                </button>
                <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} disabled={processing}>
                  {processing ? '更新中...' : '更新'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 削除モーダル */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '8px', width: '90%', maxWidth: '400px' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '16px', color: '#dc3545' }}>⚠️ 同盟の削除</h3>
            <p style={{ marginBottom: '24px', color: '#666' }}>この操作は取り消せません。本当に削除しますか？</p>
            <form onSubmit={handleDeleteSubmit}>
              <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="確認のためパスワードを入力" style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '16px', fontSize: '16px' }} required />
              {modalError && <p style={{ color: '#dc3545', fontSize: '14px', marginBottom: '16px' }}>{modalError}</p>}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setModalError(''); }} style={{ flex: 1, padding: '12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} disabled={processing}>
                  キャンセル
                </button>
                <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} disabled={processing}>
                  {processing ? '削除中...' : '削除する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
