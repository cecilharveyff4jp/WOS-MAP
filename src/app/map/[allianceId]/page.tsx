import React from 'react';
import MapViewerPage from './MapClient';

// 静的エクスポート用: 空の配列を返してクライアントサイドで動的に処理
export function generateStaticParams() {
  return [];
}

export default function Page() {
  return <MapViewerPage />;
}

