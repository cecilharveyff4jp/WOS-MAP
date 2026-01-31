"use client";

import React, { useState } from 'react';
import type { CreateAllianceRequest } from '../../types';

interface AllianceFormProps {
  onSubmit: (data: CreateAllianceRequest) => Promise<void>;
  isSubmitting?: boolean;
}

export default function AllianceForm({ onSubmit, isSubmitting = false }: AllianceFormProps) {
  const [formData, setFormData] = useState<CreateAllianceRequest>({
    allianceName: '',
    serverNumber: '',
    userId: '',
    editPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.allianceName.trim()) {
      newErrors.allianceName = '同盟名を入力してください';
    }

    if (!formData.serverNumber.trim()) {
      newErrors.serverNumber = 'サーバー番号を入力してください';
    }

    if (!formData.userId.trim()) {
      newErrors.userId = 'ユーザーIDが必要です';
    }

    if (!formData.editPassword) {
      newErrors.editPassword = 'パスワードを入力してください';
    } else if (formData.editPassword.length < 4) {
      newErrors.editPassword = 'パスワードは4文字以上で入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    await onSubmit(formData);
  };

  const handleChange = (field: keyof CreateAllianceRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // エラーをクリア
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <label
          htmlFor="allianceName"
          style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}
        >
          同盟名 <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          id="allianceName"
          type="text"
          value={formData.allianceName}
          onChange={(e) => handleChange('allianceName', e.target.value)}
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '12px',
            border: errors.allianceName ? '2px solid #dc3545' : '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box',
          }}
          placeholder="例: SNW同盟"
        />
        {errors.allianceName && (
          <div style={{ color: '#dc3545', fontSize: '13px', marginTop: '4px' }}>
            {errors.allianceName}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label
          htmlFor="serverNumber"
          style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}
        >
          サーバー番号 <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          id="serverNumber"
          type="text"
          value={formData.serverNumber}
          onChange={(e) => handleChange('serverNumber', e.target.value)}
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '12px',
            border: errors.serverNumber ? '2px solid #dc3545' : '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box',
          }}
          placeholder="例: 123"
        />
        {errors.serverNumber && (
          <div style={{ color: '#dc3545', fontSize: '13px', marginTop: '4px' }}>
            {errors.serverNumber}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label
          htmlFor="userId"
          style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}
        >
          ユーザーID <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          id="userId"
          type="text"
          value={formData.userId}
          onChange={(e) => handleChange('userId', e.target.value)}
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '12px',
            border: errors.userId ? '2px solid #dc3545' : '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box',
          }}
          placeholder="自動入力されます"
        />
        {errors.userId && (
          <div style={{ color: '#dc3545', fontSize: '13px', marginTop: '4px' }}>
            {errors.userId}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label
          htmlFor="editPassword"
          style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}
        >
          編集用パスワード <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          id="editPassword"
          type="text"
          value={formData.editPassword}
          onChange={(e) => handleChange('editPassword', e.target.value)}
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '12px',
            border: errors.editPassword ? '2px solid #dc3545' : '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box',
          }}
          placeholder="4文字以上（半角英数字推奨）"
        />
        {errors.editPassword && (
          <div style={{ color: '#dc3545', fontSize: '13px', marginTop: '4px' }}>
            {errors.editPassword}
          </div>
        )}
        <div style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
          ⚠️ このパスワードはマップ編集時に必要になります。必ずメモしておいてください。
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          width: '100%',
          padding: '14px',
          border: 'none',
          borderRadius: '4px',
          backgroundColor: isSubmitting ? '#ccc' : '#007bff',
          color: 'white',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
        }}
      >
        {isSubmitting ? '登録中...' : '同盟を登録する'}
      </button>
    </form>
  );
}
