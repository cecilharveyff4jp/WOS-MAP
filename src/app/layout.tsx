"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';
import { useEffect } from 'react';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// GitHub Pages用のbasePath設定
const basePath = process.env.NODE_ENV === 'production' ? '/SNW_Home' : '';
const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // タイトルを動的に設定
  useEffect(() => {
    document.title = "WOS Map Manager";
    
    // デバッグ情報をコンソールに出力
    // console.log('=== Google OAuth Debug Info ===');
    // console.log('Client ID:', googleClientId);
    // console.log('Current Origin:', window.location.origin);
    // console.log('Full URL:', window.location.href);
    // console.log('================================');
  }, []);

  return (
    <html lang="ja">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=2" />
        <meta name="description" content="WOS Map Manager - Multi-tenant map management system" />
        <link rel="icon" href={`${basePath}/favicon.ico`} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <GoogleOAuthProvider clientId={googleClientId}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
