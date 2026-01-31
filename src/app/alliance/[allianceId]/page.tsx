import React from 'react';
import AllianceClient from './AllianceClient';

// 静的エクスポート用: 空の配列を返してクライアントサイドで動的に処理
export function generateStaticParams() {
  return [];
}

// 動的パラメータを許可（クライアントサイドで処理）
export const dynamicParams = true;

export default function AlliancePage() {
  return <AllianceClient />;
}
