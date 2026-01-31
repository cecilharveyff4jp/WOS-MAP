"use client";

import React from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  onError?: () => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
}

export default function GoogleLoginButton({
  onSuccess,
  onError,
  text = 'signin_with',
}: GoogleLoginButtonProps) {
  const { login } = useAuth();
  const router = useRouter();

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      try {
        await login(credentialResponse.credential);
        onSuccess?.();
        router.push('/dashboard');
      } catch (error) {
        console.error('Login error:', error);
        onError?.();
      }
    }
  };

  const handleError = () => {
    console.error('Google Login Failed');
    onError?.();
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        text={text}
        size="large"
        theme="outline"
        shape="rectangular"
      />
    </div>
  );
}
