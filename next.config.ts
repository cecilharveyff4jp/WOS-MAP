import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  // Vercelでは静的エクスポート不要（動的ルートをサポート）
  images: {
    unoptimized: true,
  },
  // パフォーマンス最適化
  compiler: {
    removeConsole: isProd ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Turbopack設定(Next.js 16デフォルト)
  turbopack: {},
};

export default nextConfig;

