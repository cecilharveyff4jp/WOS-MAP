'use client';

import { useState, useEffect } from 'react';

/**
 * レスポンシブデザイン用のメディアクエリカスタムフック
 * モバイルファーストのUIに対応
 */
export function useMediaQuery() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // 初回レンダリング時の判定
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      setIsDesktop(width >= 1024);
    };

    // 初回実行
    checkScreenSize();

    // リサイズイベントリスナー
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return { isMobile, isTablet, isDesktop };
}
