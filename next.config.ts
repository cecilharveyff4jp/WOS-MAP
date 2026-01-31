import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  output: isProd ? 'export' : undefined,
  basePath: isProd ? '/WOS-MAP' : '',
  images: {
    unoptimized: true,
  },
  // パフォーマンス最適化
  compiler: {
    removeConsole: isProd ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Turbopack設定（Next.js 16デフォルト）
  // 空の設定でTurbopackを有効化し、デフォルトの最適化を使用
  turbopack: {},
};

export default nextConfig;

