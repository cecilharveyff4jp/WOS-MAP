import type { Obj } from './types';
import { FALLBACK } from './types';

// GitHub Pages用のbasePath設定
export const basePath = process.env.NODE_ENV === 'production' ? '/SNW_Home' : '';

// FALLBACK定数を再エクスポート
export { FALLBACK };

// 数値変換ユーティリティ
export function num(v: unknown, fb: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}

// 数値のクランプ
export function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

// タイプ別のテーマカラー
export function theme(type: string) {
  switch ((type || "").toUpperCase()) {
    case "HQ":
      return { top: "rgba(46,107,255,0.18)", side: "rgba(46,107,255,0.10)", stroke: "#2e6bff" };
    case "BEAR_TRAP":
      return { top: "rgba(255,138,42,0.20)", side: "rgba(255,138,42,0.12)", stroke: "#ff8a2a" };
    case "STATUE":
      return { top: "rgba(33,195,138,0.20)", side: "rgba(33,195,138,0.12)", stroke: "#21c38a" };
    case "CITY":
      return { top: "rgba(181,107,255,0.18)", side: "rgba(181,107,255,0.10)", stroke: "#b56bff" };
    case "DEPOT":
      return { top: "rgba(139,69,19,0.18)", side: "rgba(139,69,19,0.10)", stroke: "#8B4513" };
    case "MOUNTAIN":
      return { top: "rgba(120,113,108,0.18)", side: "rgba(120,113,108,0.10)", stroke: "#78716c" };
    case "LAKE":
      return { top: "rgba(30,64,175,0.18)", side: "rgba(30,64,175,0.10)", stroke: "#1e40af" };
    default:
      return { top: "rgba(17,24,39,0.14)", side: "rgba(17,24,39,0.08)", stroke: "#111827" };
  }
}

// タイプ別のデフォルトサイズ
export function getDefaultSize(type: string): { w: number; h: number } {
  switch ((type || "").toUpperCase()) {
    case "HQ":
      return { w: 4, h: 4 };
    case "CITY":
      return { w: 2, h: 2 };
    case "BEAR_TRAP":
      return { w: 2, h: 2 };
    case "STATUE":
      return { w: 2, h: 2 };
    case "DEPOT":
      return { w: 2, h: 2 };
    case "FLAG":
      return { w: 1, h: 1 };
    case "MOUNTAIN":
      return { w: 1, h: 1 };
    case "LAKE":
      return { w: 1, h: 1 };
    default:
      return { w: 2, h: 2 };
  }
}

// 回転（2D）
export function rot(x: number, y: number, angle: number) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: x * c - y * s, y: x * s + y * c };
}

// オブジェクト間の重なり判定
export function checkOverlap(obj1: Obj, obj2: Obj): boolean {
  if (!obj1 || !obj2) return false;
  const x1 = obj1.x ?? 0;
  const y1 = obj1.y ?? 0;
  const w1 = obj1.w ?? 1;
  const h1 = obj1.h ?? 1;
  const x2 = obj2.x ?? 0;
  const y2 = obj2.y ?? 0;
  const w2 = obj2.w ?? 1;
  const h2 = obj2.h ?? 1;

  if (x1 + w1 <= x2) return false;
  if (x2 + w2 <= x1) return false;
  if (y1 + h1 <= y2) return false;
  if (y2 + h2 <= y1) return false;
  return true;
}

// 重なり領域の計算
export function getOverlapRect(obj1: Obj, obj2: Obj): { x: number; y: number; w: number; h: number } | null {
  if (!checkOverlap(obj1, obj2)) return null;
  
  const x1 = obj1.x ?? 0;
  const y1 = obj1.y ?? 0;
  const w1 = obj1.w ?? 1;
  const h1 = obj1.h ?? 1;
  const x2 = obj2.x ?? 0;
  const y2 = obj2.y ?? 0;
  const w2 = obj2.w ?? 1;
  const h2 = obj2.h ?? 1;

  const left = Math.max(x1, x2);
  const top = Math.max(y1, y2);
  const right = Math.min(x1 + w1, x2 + w2);
  const bottom = Math.min(y1 + h1, y2 + h2);

  return {
    x: left,
    y: top,
    w: right - left,
    h: bottom - top
  };
}
