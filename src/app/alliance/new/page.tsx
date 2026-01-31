'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { createAlliance } from '../../lib/api';
import { useMediaQuery } from '../../hooks/useMediaQuery';

interface FormData {
  allianceName: string;
  serverNumber: string;
  editPassword: string;
}

interface FormErrors {
  allianceName?: string;
  serverNumber?: string;
  editPassword?: string;
}

export default function NewAlliancePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { isMobile, isTablet } = useMediaQuery();
  
  const [formData, setFormData] = useState<FormData>({
    allianceName: '',
    serverNumber: '',
    editPassword: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.allianceName.trim()) {
      newErrors.allianceName = '同盟名を入力してください';
    } else if (formData.allianceName.length > 50) {
      newErrors.allianceName = '同盟名は50文字以内で入力してください';
    }

    if (!formData.serverNumber.trim()) {
      newErrors.serverNumber = 'サーバー番号を入力してください';
    } else if (!/^\d+$/.test(formData.serverNumber)) {
      newErrors.serverNumber = 'サーバー番号は数字のみで入力してください';
    }

    if (!formData.editPassword.trim()) {
      newErrors.editPassword = '編集パスワードを入力してください';
    } else if (formData.editPassword.length < 4) {
      newErrors.editPassword = 'パスワードは4文字以上で設定してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm() || !user) {
      return;
    }

    setIsSubmitting(true);

    try {
      const alliance = await createAlliance({
        allianceName: formData.allianceName.trim(),
        serverNumber: formData.serverNumber.trim(),
        editPassword: formData.editPassword.trim(),
        googleId: user.googleId,
      });

      router.push(`/map/${alliance.allianceId}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('同盟の作成に失敗しました');
      }
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard');
  };

  if (isLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <div style={{ color: 'white', fontSize: isMobile ? '16px' : '18px' }}>読み込み中...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: isMobile ? '16px' : '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{ maxWidth: '600px', width: '100%' }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: isMobile ? '12px' : '16px',
          padding: isMobile ? '24px' : '40px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}>
          <div style={{ marginBottom: isMobile ? '24px' : '32px' }}>
            <h1 style={{ 
              fontSize: isMobile ? '22px' : '28px', 
              fontWeight: 'bold', 
              marginBottom: '8px',
              color: '#333',
            }}>
              🏰 新しい同盟を作成
            </h1>
            <p style={{ fontSize: isMobile ? '13px' : '14px', color: '#666', margin: 0 }}>
              同盟情報を入力してマップを作成しましょう
            </p>
          </div>

          {error && (
            <div style={{
              padding: isMobile ? '12px' : '16px',
              backgroundColor: '#ffebee',
              border: '1px solid #f44336',
              borderRadius: '8px',
              color: '#c62828',
              marginBottom: isMobile ? '20px' : '24px',
              fontSize: isMobile ? '13px' : '14px',
              lineHeight: 1.5,
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* 同盟名 */}
            <div style={{ marginBottom: isMobile ? '20px' : '24px' }}>
              <label style={{
                display: 'block',
                fontSize: isMobile ? '13px' : '14px',
                fontWeight: 'bold',
                marginBottom: '8px',
                color: '#333',
              }}>
                同盟名 <span style={{ color: '#f44336' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.allianceName}
                onChange={(e) => setFormData({ ...formData, allianceName: e.target.value })}
                placeholder="例: 勇者同盟"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: isMobile ? '10px 12px' : '12px',
                  fontSize: isMobile ? '15px' : '16px',
                  border: errors.allianceName ? '2px solid #f44336' : '1px solid #ddd',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  backgroundColor: isSubmitting ? '#f5f5f5' : 'white',
                  minHeight: '44px',
                }}
                onFocus={(e) => {
                  if (!errors.allianceName) {
                    e.target.style.borderColor = '#667eea';
                  }
                }}
                onBlur={(e) => {
                  if (!errors.allianceName) {
                    e.target.style.borderColor = '#ddd';
                  }
                }}
              />
              {errors.allianceName && (
                <p style={{ fontSize: isMobile ? '11px' : '12px', color: '#f44336', marginTop: '4px', margin: '4px 0 0 0' }}>
                  {errors.allianceName}
                </p>
              )}
            </div>

            {/* サーバー番号 */}
            <div style={{ marginBottom: isMobile ? '20px' : '24px' }}>
              <label style={{
                display: 'block',
                fontSize: isMobile ? '13px' : '14px',
                fontWeight: 'bold',
                marginBottom: '8px',
                color: '#333',
              }}>
                サーバー番号 <span style={{ color: '#f44336' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.serverNumber}
                onChange={(e) => setFormData({ ...formData, serverNumber: e.target.value })}
                placeholder="例: 123"
                disabled={isSubmitting}
                inputMode="numeric"
                pattern="[0-9]*"
                style={{
                  width: '100%',
                  padding: isMobile ? '10px 12px' : '12px',
                  fontSize: isMobile ? '15px' : '16px',
                  border: errors.serverNumber ? '2px solid #f44336' : '1px solid #ddd',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  backgroundColor: isSubmitting ? '#f5f5f5' : 'white',
                  minHeight: '44px',
                }}
                onFocus={(e) => {
                  if (!errors.serverNumber) {
                    e.target.style.borderColor = '#667eea';
                  }
                }}
                onBlur={(e) => {
                  if (!errors.serverNumber) {
                    e.target.style.borderColor = '#ddd';
                  }
                }}
              />
              {errors.serverNumber && (
                <p style={{ fontSize: isMobile ? '11px' : '12px', color: '#f44336', marginTop: '4px', margin: '4px 0 0 0' }}>
                  {errors.serverNumber}
                </p>
              )}
            </div>

            {/* 編集パスワード */}
            <div style={{ marginBottom: isMobile ? '20px' : '24px' }}>
              <label style={{
                display: 'block',
                fontSize: isMobile ? '13px' : '14px',
                fontWeight: 'bold',
                marginBottom: '8px',
                color: '#333',
              }}>
                編集パスワード <span style={{ color: '#f44336' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.editPassword}
                onChange={(e) => setFormData({ ...formData, editPassword: e.target.value })}
                placeholder="マップ編集用のパスワード（4文字以上）"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: isMobile ? '10px 12px' : '12px',
                  fontSize: isMobile ? '15px' : '16px',
                  border: errors.editPassword ? '2px solid #f44336' : '1px solid #ddd',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  backgroundColor: isSubmitting ? '#f5f5f5' : 'white',
                  minHeight: '44px',
                }}
                onFocus={(e) => {
                  if (!errors.editPassword) {
                    e.target.style.borderColor = '#667eea';
                  }
                }}
                onBlur={(e) => {
                  if (!errors.editPassword) {
                    e.target.style.borderColor = '#ddd';
                  }
                }}
              />
              {errors.editPassword && (
                <p style={{ fontSize: isMobile ? '11px' : '12px', color: '#f44336', marginTop: '4px', margin: '4px 0 0 0' }}>
                  {errors.editPassword}
                </p>
              )}
              <p style={{ fontSize: isMobile ? '11px' : '12px', color: '#999', marginTop: '8px', margin: '8px 0 0 0', lineHeight: 1.5 }}>
                ⚠️ このパスワードは他のメンバーと共有します。忘れないようにメモしてください。
              </p>
            </div>

            {/* ボタン */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: '12px',
              marginTop: isMobile ? '28px' : '32px',
            }}>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  padding: '14px',
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: 'bold',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  color: '#666',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: isSubmitting ? 0.5 : 1,
                  minHeight: '48px',
                  order: isMobile ? 2 : 1,
                }}
                onMouseOver={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  padding: '14px',
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: 'bold',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: isSubmitting ? '#ccc' : '#667eea',
                  color: 'white',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  minHeight: '48px',
                  order: isMobile ? 1 : 2,
                }}
                onMouseOver={(e) => {
                  if (!isSubmitting && !isMobile) {
                    e.currentTarget.style.backgroundColor = '#5568d3';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isSubmitting && !isMobile) {
                    e.currentTarget.style.backgroundColor = '#667eea';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {isSubmitting ? '作成中...' : '同盟を作成'}
              </button>
            </div>
          </form>

          {/* ユーザー情報表示 */}
          <div style={{
            marginTop: isMobile ? '20px' : '24px',
            padding: isMobile ? '12px' : '16px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            fontSize: isMobile ? '12px' : '14px',
            color: '#666',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  style={{
                    width: isMobile ? '20px' : '24px',
                    height: isMobile ? '20px' : '24px',
                    borderRadius: '50%',
                    flexShrink: 0,
                  }}
                />
              )}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <strong>{user.displayName}</strong> として作成
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
