"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from 'next/navigation';
import { getAlliance } from '../../lib/api';
import type { Alliance, MapConfig } from '../../types';
import { useMediaQuery } from '../../hooks/useMediaQuery';

type Meta = { cols?: number; rows?: number; cellSize?: number; mapName?: string };
type Obj = {
  id?: string;
  type?: string;
  label?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  icon?: string;
  isFavorite?: boolean;
  birthday?: string;
  note?: string;
};

const FALLBACK = { cols: 60, rows: 40, cellSize: 24 };

function num(v: unknown, fb: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

// タイプ別のデフォルトサイズとカラーテーマ
const TYPE_CONFIG: Record<string, { w: number; h: number; top: string; side: string; stroke: string }> = {
  HQ: { w: 4, h: 4, top: "rgba(46,107,255,0.18)", side: "rgba(46,107,255,0.10)", stroke: "#2e6bff" },
  CITY: { w: 2, h: 2, top: "rgba(181,107,255,0.18)", side: "rgba(181,107,255,0.10)", stroke: "#b56bff" },
  BEAR_TRAP: { w: 2, h: 2, top: "rgba(255,138,42,0.20)", side: "rgba(255,138,42,0.12)", stroke: "#ff8a2a" },
  STATUE: { w: 2, h: 2, top: "rgba(33,195,138,0.20)", side: "rgba(33,195,138,0.12)", stroke: "#21c38a" },
  DEPOT: { w: 2, h: 2, top: "rgba(139,69,19,0.18)", side: "rgba(139,69,19,0.10)", stroke: "#8B4513" },
  FLAG: { w: 1, h: 1, top: "rgba(239,68,68,0.20)", side: "rgba(239,68,68,0.12)", stroke: "#ef4444" },
  MOUNTAIN: { w: 1, h: 1, top: "rgba(120,113,108,0.18)", side: "rgba(120,113,108,0.10)", stroke: "#78716c" },
  LAKE: { w: 1, h: 1, top: "rgba(30,64,175,0.18)", side: "rgba(30,64,175,0.10)", stroke: "#1e40af" },
};

function theme(type: string) {
  const config = TYPE_CONFIG[(type || "").toUpperCase()];
  if (config) {
    return { top: config.top, side: config.side, stroke: config.stroke };
  }
  return { top: "rgba(17,24,39,0.14)", side: "rgba(17,24,39,0.08)", stroke: "#111827" };
}

function getDefaultSize(type: string): { w: number; h: number } {
  const config = TYPE_CONFIG[(type || "").toUpperCase()];
  return config ? { w: config.w, h: config.h } : { w: 2, h: 2 };
}

// 回転（2D）
function rot(x: number, y: number, angle: number) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: x * c - y * s, y: x * s + y * c };
}

export default function MapViewerPage() {
  const params = useParams();
  const allianceId = params.allianceId as string;
  const { isMobile: isMobileDevice, isTablet } = useMediaQuery();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const fireLevelImagesRef = useRef<{ [key: string]: HTMLImageElement }>({});

  // 同盟情報
  const [alliance, setAlliance] = useState<Alliance | null>(null);
  const [loading, setLoading] = useState(true);

  const [meta, setMeta] = useState<Meta>({});
  const [objects, setObjects] = useState<Obj[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // マップ切替機能
  const [currentMapId, setCurrentMapId] = useState<string>('object');
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [showMapManagement, setShowMapManagement] = useState(false);
  const [editingMapConfig, setEditingMapConfig] = useState<MapConfig | null>(null);

  // リンク集
  const [links, setLinks] = useState<Array<{ name: string; url: string; order: number; display: boolean }>>([]);
  const [editingLink, setEditingLink] = useState<{ name: string; url: string; order: number; display: boolean; index: number } | null>(null);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [hasUnsavedLinksChanges, setHasUnsavedLinksChanges] = useState(false);
  const [highlightedLinkIndex, setHighlightedLinkIndex] = useState<number | null>(null);
  const [hoveredLinkIndex, setHoveredLinkIndex] = useState<number | null>(null);

  // 編集モード
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [editingObject, setEditingObject] = useState<Obj | null>(null);
  const [originalEditingId, setOriginalEditingId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPositionSizeExpanded, setIsPositionSizeExpanded] = useState(false);
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null);
  const [lastCreatedType, setLastCreatedType] = useState<string>("OTHER");
  const [isSaving, setIsSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const dragStartRef = useRef<{ objId: string; mx: number; my: number; objX: number; objY: number } | null>(null);
  
  // ダブルクリック検知用
  const lastClickRef = useRef<{ time: number; gridX: number; gridY: number } | null>(null);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 集計
  const [showFireLevelStats, setShowFireLevelStats] = useState(false);

  // カメラ：パン(tx,ty)は「画面座標系」での移動量（ピクセル）、scaleは倍率
  const [cam, setCam] = useState({ tx: 0, ty: 0, scale: 1 });

  // ジェスチャ状態（ピンチ）
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<null | {
    startScale: number;
    startTx: number;
    startTy: number;
    startMid: { x: number; y: number };
    startDist: number;
  }>(null);

  // UI状態
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [tickerHidden, setTickerHidden] = useState(true);  // 初期設定: テロップをオフ
  const [showMapManager, setShowMapManager] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  
  // マイオブジェクト機能
  const [myObjectId, setMyObjectId] = useState<string | null>(null);
  const [showMyObjectSelector, setShowMyObjectSelector] = useState(false);
  const [myObjectSearchText, setMyObjectSearchText] = useState<string>('');
  const [myObjectSortBy, setMyObjectSortBy] = useState<'name' | 'fire' | 'birthday'>('name');
  
  // モバイル検出はuseMediaQueryフックを使用
  const isMobile = isMobileDevice;

  const [mapConfigs, setMapConfigs] = useState<MapConfig[]>([
    { id: 'object', name: 'メインマップ', sheetName: 'object', isVisible: true, isBase: true, order: 0 }
  ]);

  const cfg = useMemo(
    () => ({
      cols: num(meta.cols, FALLBACK.cols),
      rows: num(meta.rows, FALLBACK.rows),
      cell: num(meta.cellSize, FALLBACK.cellSize),
      name: String(meta.mapName || alliance?.allianceName || "WOS Map"),
    }),
    [meta, alliance]
  );

  // 現在のマップ設定を取得
  const currentMap = useMemo(() => {
    return mapConfigs.find(m => m.id === currentMapId);
  }, [mapConfigs, currentMapId]);

  // テロップテキスト生成（誕生日情報を含む）
  const tickerText = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    
    const getBirthdayMembers = (month: number) => {
      return objects
        .filter(obj => {
          if (!obj.birthday) return false;
          const match = obj.birthday.match(/(\d+)月/);
          if (!match) return false;
          const birthMonth = parseInt(match[1], 10);
          return birthMonth === month;
        })
        .map(obj => ({
          name: obj.label || '名前なし',
          date: obj.birthday!,
          day: parseInt(obj.birthday!.match(/(\d+)日/)?.[1] || '0', 10)
        }))
        .sort((a, b) => a.day - b.day);
    };
    
    const currentMonthMembers = getBirthdayMembers(currentMonth);
    const nextMonthMembers = getBirthdayMembers(nextMonth);
    
    const parts: string[] = [];
    parts.push(`🎮 ${cfg.name} へようこそ！`);
    parts.push(isEditMode ? "📝 編集モード" : "👀 閲覧モード");
    
    if (currentMonthMembers.length > 0) {
      const memberList = currentMonthMembers.map(m => `${m.date} ${m.name}さん`).join('　');
      parts.push(`今月お誕生日を迎えるメンバーは・・・${memberList}です。　　お誕生日おめでとうございます！🎂`);
    }
    if (nextMonthMembers.length > 0) {
      const memberList = nextMonthMembers.map(m => `${m.date} ${m.name}さん`).join('　');
      parts.push(`来月お誕生日を迎えるメンバーは・・・${memberList}です。`);
    }
    
    return parts.join(' | ');
  }, [objects, cfg.name, isEditMode]);

  // 見た目（実機寄せ）
  const LOOK = useMemo(
    () => ({
      angle: -Math.PI / 4, // 45°
      padding: 40,

      // 影（右下）
      shadowColor: "rgba(0,0,0,0.28)",
      shadowBlur: 10,
      shadowX: 10,
      shadowY: 12,

      // グリッド
      grid: "rgba(0,0,0,0.06)",
      gridMajor: "rgba(0,0,0,0.10)",
      majorEvery: 5,

      // 立体の高さ（px換算：cellに応じて）
      liftMin: 8,
      liftRatio: 0.35,

      // 選択表現
      glowColor: "rgba(80,160,255,0.55)",
      ringColor: "rgba(80,160,255,0.90)",
    }),
    []
  );

  // 同盟情報の読み込み
  useEffect(() => {
    async function loadAlliance() {
      if (!allianceId) return;
      
      setLoading(true);
      try {
        const result = await getAlliance(allianceId);
        if (result.ok && result.alliance) {
          setAlliance(result.alliance);
        } else {
          setErr(result.error || '同盟が見つかりません');
        }
      } catch (e) {
        setErr('同盟情報の読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    }

    loadAlliance();
  }, [allianceId]);

  // allianceが読み込まれたらマップ設定とマップデータを読み込む
  useEffect(() => {
    if (alliance) {
      loadMapConfigs();
      loadMap();
      // ページロード時は常に参照モードで開始（自動認証なし）
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alliance]);

  // 溶鉱炉レベル画像のプリロード
  useEffect(() => {
    const imagesToLoad = ['FC1', 'FC2', 'FC3', 'FC4', 'FC5', 'FC6', 'FC7', 'FC8', 'FC9', 'FC10'];
    imagesToLoad.forEach(name => {
      const img = new Image();
      img.src = `/fire-levels/${name}.webp`;
      fireLevelImagesRef.current[name] = img;
    });
  }, []);

  // LocalStorageからテロップ表示状態を読み込む
  useEffect(() => {
    const saved = localStorage.getItem('tickerHidden');
    if (saved !== null) {
      setTickerHidden(saved === 'true');
    }
  }, []);

  // tickerHiddenが変わったらLocalStorageに保存
  useEffect(() => {
    localStorage.setItem('tickerHidden', String(tickerHidden));
  }, [tickerHidden]);

  // LocalStorageからマイオブジェクトIDを読み込む
  useEffect(() => {
    const saved = localStorage.getItem('snw-my-object-id');
    if (saved) {
      setMyObjectId(saved);
    }
  }, []);

  // myObjectIdが変わったらLocalStorageに保存
  useEffect(() => {
    if (myObjectId) {
      localStorage.setItem('snw-my-object-id', myObjectId);
    } else {
      localStorage.removeItem('snw-my-object-id');
    }
  }, [myObjectId]);

  // ハンバーガーメニューの外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showHeaderMenu && headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        // メニューボタン自体のクリックは除外
        const target = e.target as HTMLElement;
        if (!target.closest('button[title="メニュー"]')) {
          setShowHeaderMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHeaderMenu]);

  // マップデータの読み込み
  async function loadMap(mapId?: string) {
    const targetMapId = mapId || currentMapId;
    if (!alliance) return;
    
    setLoading(true);
    
    try {
      setErr(null);
      const MASTER_API_URL = process.env.NEXT_PUBLIC_MASTER_API_URL;
      if (!MASTER_API_URL) {
        throw new Error("マスターAPIのURLが設定されていません");
      }

      const params = new URLSearchParams({
        action: 'getMap',
        mapId: targetMapId,
        allianceId: alliance.allianceId,
      });

      const res = await fetch(`${MASTER_API_URL}?${params}`);
      const json = await res.json();
      
      if (!json.ok) {
        // マップが見つからない場合、ベースマップにフォールバック
        if (json.error === 'Map not found' && targetMapId !== 'object') {
          // console.warn(`マップ ${targetMapId} が見つかりません。ベースマップにフォールバックします。`);
          setCurrentMapId('object');
          return loadMap('object');
        }
        throw new Error(json.error || "マップデータの取得に失敗しました");
      }

      // データ取得成功時に現在のマップIDを更新
      if (targetMapId !== currentMapId) {
        setCurrentMapId(targetMapId);
      }
      
      setMeta(json.meta || {});
      setObjects(Array.isArray(json.objects) ? json.objects : []);
      
      // リンクデータを取得
      await loadLinks();
      
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setErr(message);
      // console.error("マップ読み込みエラー:", e);
    } finally {
      setLoading(false);
    }
  }
  
  // リンク集を読み込む
  async function loadLinks() {
    try {
      const MASTER_API_URL = process.env.NEXT_PUBLIC_MASTER_API_URL;
      if (!MASTER_API_URL) {
        // console.warn('マスターAPIのURLが設定されていません');
        return;
      }

      const params = new URLSearchParams({
        action: 'getLinks',
        allianceId: alliance?.allianceId || '',
      });

      const res = await fetch(`${MASTER_API_URL}?${params}`);
      const json = await res.json();
      
      if (json.ok && Array.isArray(json.links)) {
        setLinks(json.links);
      }
    } catch (e) {
      // console.error('リンクデータの読み込みに失敗しました:', e);
      // リンクの取得に失敗してもマップは表示する
    }
  }
  
  // リンク集を保存
  async function saveLinks() {
    try {
      const MASTER_API_URL = process.env.NEXT_PUBLIC_MASTER_API_URL;
      if (!MASTER_API_URL) {
        alert('マスターAPIのURLが設定されていません');
        return false;
      }

      const params = new URLSearchParams({
        action: 'saveLinks',
        allianceId: alliance?.allianceId || '',
      });

      const res = await fetch(`${MASTER_API_URL}?${params}`, {
        method: 'POST',
        body: JSON.stringify({ links }),
      });

      const json = await res.json();
      if (json.ok) {
        setHasUnsavedLinksChanges(false);
        return true;
      } else {
        alert(`保存に失敗しました: ${json.error}`);
        return false;
      }
    } catch (e) {
      // console.error('リンク保存エラー:', e);
      alert('リンクの保存に失敗しました');
      return false;
    }
  }

  useEffect(() => {
    if (alliance) {
      loadMap();
      loadMapConfigs(); // マップ設定も読み込む
    }
  }, [alliance]);

  // マップを切り替える
  async function switchMap(mapId: string) {
    if (mapId === currentMapId) return;
    
    // loadMap内でsetCurrentMapId()が呼ばれるため、ここでは呼ばない
    await loadMap(mapId);
    setShowMapSelector(false);
    setShowHeaderMenu(false);
  }

  // 表示可能なマップのリストを取得
  const visibleMaps = useMemo(() => {
    return mapConfigs
      .filter(m => m.isVisible)
      .sort((a, b) => a.order - b.order);
  }, [mapConfigs]);

  // マップ設定を読み込む
  async function loadMapConfigs() {
    if (!alliance) return;
    
    try {
      const MASTER_API_URL = process.env.NEXT_PUBLIC_MASTER_API_URL;
      if (!MASTER_API_URL) {
        // console.warn('マスターAPIのURLが設定されていません');
        return;
      }

      const params = new URLSearchParams({
        action: 'getMaps',
        allianceId: alliance.allianceId,
      });

      const res = await fetch(`${MASTER_API_URL}?${params}`);
      const json = await res.json();
      
      if (json.ok && json.maps) {
        setMapConfigs(json.maps);
      }
    } catch (e) {
      // console.error('マップ設定の読み込みに失敗しました:', e);
      // エラーが発生してもデフォルト設定を使用
    }
  }

  // ヒットテスト：マップ座標でクリック判定
  const hitTest = (mx: number, my: number): Obj | null => {
    // 逆順で調べて手前のものを優先
    for (let i = objects.length - 1; i >= 0; i--) {
      const o = objects[i];
      const x = num(o.x, 0) * cfg.cell;
      const y = num(o.y, 0) * cfg.cell;
      const w = Math.max(1, num(o.w, 1)) * cfg.cell;
      const h = Math.max(1, num(o.h, 1)) * cfg.cell;
      if (mx >= x && mx <= x + w && my >= y && my <= y + h) return o;
    }
    return null;
  };

  // タイプ別の初期ラベルを取得
  const getDefaultLabel = (type: string): string => {
    switch (type) {
      case "FLAG": return "🚩";
      case "MOUNTAIN": return "🏔️";
      case "LAKE": return "🌊";
      case "HQ": return "新規本部";
      case "BEAR_TRAP": return "新規熊罠";
      case "STATUE": return "新規同盟建造物";
      case "CITY": return "新規都市";
      case "DEPOT": return "新規同盟資材";
      default: return "新規施設";
    }
  };

  // タイプ別のデフォルトサイズを取得
  const getDefaultSize = (type: string) => {
    switch (type) {
      case "HQ": return { w: 3, h: 3 };
      case "CITY": return { w: 2, h: 2 };
      case "BEAR_TRAP": return { w: 1, h: 1 };
      case "STATUE": return { w: 2, h: 2 };
      case "DEPOT": return { w: 2, h: 2 };
      default: return { w: 1, h: 1 };
    }
  };

  // パスワード検証
  const handlePasswordSubmit = async () => {
    if (!alliance || !password) return;
    
    // 同盟の編集パスワードと照合
    if (password === alliance.editPassword) {
      // 認証成功：パスワードをlocalStorageに保存
      localStorage.setItem(`map-edit-password-${alliance.allianceId}`, password);
      setIsEditMode(true);
      setShowPasswordModal(false);
      setPassword('');
    } else {
      alert('パスワードが正しくありません');
    }
  };

  // 編集モード終了
  const exitEditMode = () => {
    // パスワードキャッシュは削除せず保持（次回の編集時に自動認証に使用）
    setIsEditMode(false);
    setSelectedId(null);
    setEditingObject(null);
    setPendingPosition(null);
  };

  // 変換（スクリーン→マップ座標）: タップ選択の当たり判定で使う
  const screenToMap = (sx: number, sy: number, viewW: number, viewH: number) => {
    const mapW = cfg.cols * cfg.cell;
    const mapH = cfg.rows * cfg.cell;
    const cx = mapW / 2;
    const cy = mapH / 2;

    // 画面中心へ
    let x = sx - viewW / 2;
    let y = sy - viewH / 2;

    // パンを戻す
    x -= cam.tx;
    y -= cam.ty;

    // スケールを戻す
    x /= cam.scale;
    y /= cam.scale;

    // 回転を戻す（逆回転）
    const p = rot(x, y, -LOOK.angle);

    // マップ中心を戻す
    return { mx: p.x + cx, my: p.y + cy };
  };

  // 描画要求（rafで間引き）
  const requestDraw = () => {
    if (rafRef.current != null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      draw();
    });
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // fit to CSS size
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const viewW = rect.width;
    const viewH = rect.height;

    const cell = cfg.cell;
    const mapW = cfg.cols * cell;
    const mapH = cfg.rows * cell;
    const cx = mapW / 2;
    const cy = mapH / 2;

    // 背景（うっすら寒色）
    ctx.clearRect(0, 0, viewW, viewH);
    const bg = ctx.createLinearGradient(0, 0, 0, viewH);
    bg.addColorStop(0, "#ffffff");
    bg.addColorStop(1, "#f2f5fb");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, viewW, viewH);

    // ===== カメラ変換（中心→パン→ズーム→回転→マップ中心へ）=====
    ctx.save();
    ctx.translate(viewW / 2, viewH / 2);
    ctx.translate(cam.tx, cam.ty);
    ctx.scale(cam.scale, cam.scale);
    ctx.rotate(LOOK.angle);
    ctx.translate(-cx, -cy);

    // グリッド（余白含めて拡張表示）
    // 回転とズームを考慮して、画面全体をカバーする広い範囲を確保
    const gridMargin = Math.max(viewW, viewH) / cam.scale;
    const gridStartX = Math.floor(-gridMargin / cell);
    const gridEndX = Math.ceil((mapW + gridMargin) / cell);
    const gridStartY = Math.floor(-gridMargin / cell);
    const gridEndY = Math.ceil((mapH + gridMargin) / cell);

    // 縦線
    for (let x = gridStartX; x <= gridEndX; x++) {
      const major = x % LOOK.majorEvery === 0;
      ctx.strokeStyle = major ? LOOK.gridMajor : LOOK.grid;
      ctx.lineWidth = major ? 1.2 : 1;
      ctx.beginPath();
      ctx.moveTo(x * cell, gridStartY * cell);
      ctx.lineTo(x * cell, gridEndY * cell);
      ctx.stroke();
    }
    // 横線
    for (let y = gridStartY; y <= gridEndY; y++) {
      const major = y % LOOK.majorEvery === 0;
      ctx.strokeStyle = major ? LOOK.gridMajor : LOOK.grid;
      ctx.lineWidth = major ? 1.2 : 1;
      ctx.beginPath();
      ctx.moveTo(gridStartX * cell, y * cell);
      ctx.lineTo(gridEndX * cell, y * cell);
      ctx.stroke();
    }

    // 立体の“持ち上げ”ベクトル（スクリーンで右下影↘なので、上面は左上↖にズラす）
    const liftPx = Math.max(LOOK.liftMin, cell * LOOK.liftRatio);

    // スクリーン方向の「上面オフセット」（↖）
    const liftScreen = { x: -liftPx * 0.8, y: -liftPx * 1.0 };
    // マップ（回転前）座標に変換：R(-angle)で戻す
    const liftMap = rot(liftScreen.x, liftScreen.y, -LOOK.angle);

    // 描画順：奥→手前（y→x）で自然に重なる
    const sorted = [...objects].sort((a, b) => {
      const ay = num(a.y, 0), by = num(b.y, 0);
      const ax = num(a.x, 0), bx = num(b.x, 0);
      return (ay - by) || (ax - bx);
    });

    for (const o of sorted) {
      const id = String(o.id || "");
      const gx = num(o.x, 0) * cell;
      const gy = num(o.y, 0) * cell;
      const gw = Math.max(1, num(o.w, 1)) * cell;
      const gh = Math.max(1, num(o.h, 1)) * cell;

      const th = theme(String(o.type || ""));
      const isSelected = selectedId && id && selectedId === id;
      const isDraggingThis = isDragging && dragStartRef.current?.objId === id;

      // オブジェクト重複チェック
      const hasOverlap = objects.some((other) => {
        if (other.id === o.id) return false;
        const ox = num(other.x, 0);
        const oy = num(other.y, 0);
        const ow = Math.max(1, num(other.w, 1));
        const oh = Math.max(1, num(other.h, 1));
        const sx = num(o.x, 0);
        const sy = num(o.y, 0);
        const sw = Math.max(1, num(o.w, 1));
        const sh = Math.max(1, num(o.h, 1));
        return !(sx + sw <= ox || ox + ow <= sx || sy + sh <= oy || oy + oh <= sy);
      });

      // 立体：下面（フットプリント）4点
      const b1 = { x: gx, y: gy };
      const b2 = { x: gx + gw, y: gy };
      const b3 = { x: gx + gw, y: gy + gh };
      const b4 = { x: gx, y: gy + gh };

      // サブマップでは都市とその他のみ背景を透明に
      const type = (o.type || "").toUpperCase();
      const isSubMap = currentMapId !== 'object'; // object が基本マップ
      if (isSubMap && (type === "CITY" || !type || type === "" || type === "OTHER")) {
        ctx.fillStyle = "rgba(0,0,0,0)"; // 完全透明（都市とその他のみ）
      } else {
        ctx.fillStyle = hasOverlap ? "rgba(239,68,68,0.25)" : th.top;
      }
      ctx.beginPath();
      ctx.moveTo(b1.x, b1.y);
      ctx.lineTo(b2.x, b2.y);
      ctx.lineTo(b3.x, b3.y);
      ctx.lineTo(b4.x, b4.y);
      ctx.closePath();
      ctx.fill();

      // オブジェクトの枠線
      ctx.strokeStyle = hasOverlap ? "#dc2626" : (th.stroke || "rgba(0,0,0,0.2)");
      ctx.lineWidth = hasOverlap ? 3 : (isDraggingThis ? 3 : 2);
      ctx.beginPath();
      ctx.moveTo(b1.x, b1.y);
      ctx.lineTo(b2.x, b2.y);
      ctx.lineTo(b3.x, b3.y);
      ctx.lineTo(b4.x, b4.y);
      ctx.closePath();
      ctx.stroke();

      // お気に入りエフェクト（柔らかいぼかしで表現）- オブジェクト輪郭の直後に描画
      if (o.isFavorite) {
        ctx.save();
        
        // 外側：大きなピンクのぼかし
        ctx.shadowColor = "rgba(255, 182, 193, 0.8)"; // ライトピンク
        ctx.shadowBlur = 30;
        ctx.strokeStyle = "rgba(255, 182, 193, 0.6)";
        ctx.lineWidth = 6;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(b1.x - 3, b1.y - 3);
        ctx.lineTo(b2.x + 3, b2.y - 3);
        ctx.lineTo(b3.x + 3, b3.y + 3);
        ctx.lineTo(b4.x - 3, b4.y + 3);
        ctx.closePath();
        ctx.stroke();
        
        // 中間：ピーチのぼかし
        ctx.shadowColor = "rgba(255, 218, 185, 0.9)"; // ピーチ
        ctx.shadowBlur = 20;
        ctx.strokeStyle = "rgba(255, 218, 185, 0.7)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(b1.x - 2, b1.y - 2);
        ctx.lineTo(b2.x + 2, b2.y - 2);
        ctx.lineTo(b3.x + 2, b3.y + 2);
        ctx.lineTo(b4.x - 2, b4.y + 2);
        ctx.closePath();
        ctx.stroke();
        
        // 内側：明るいコーラルピンク
        ctx.shadowColor = "rgba(255, 127, 80, 1)"; // コーラル
        ctx.shadowBlur = 12;
        ctx.strokeStyle = "rgba(255, 160, 122, 0.9)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(b1.x - 1, b1.y - 1);
        ctx.lineTo(b2.x + 1, b2.y - 1);
        ctx.lineTo(b3.x + 1, b3.y + 1);
        ctx.lineTo(b4.x - 1, b4.y + 1);
        ctx.closePath();
        ctx.stroke();
        
        ctx.restore();
      }
      
      // 未保存変更のマーカー（オレンジの点線枠）- 編集モード時のみ（将来実装）
      // const isModified = isEditMode && modifiedObjectIds.has(id);
      // if (isModified) { ... }

      // マイオブジェクトエフェクト（紫のふわふわ光る輝き）
      const isMyObject = !isEditMode && myObjectId && id === myObjectId;
      if (isMyObject) {
        ctx.save();
        
        // 外側：パルスする金色の輝き
        const time = Date.now() / 1000;
        const pulse = Math.sin(time * 2) * 0.3 + 0.7; // 0.4～1.0で脈動
        
        ctx.shadowColor = `rgba(251, 191, 36, ${pulse})`;
        ctx.shadowBlur = 20;
        ctx.strokeStyle = `rgba(251, 191, 36, ${pulse * 0.8})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(b1.x - 3, b1.y - 3);
        ctx.lineTo(b2.x + 3, b2.y - 3);
        ctx.lineTo(b3.x + 3, b3.y + 3);
        ctx.lineTo(b4.x - 3, b4.y + 3);
        ctx.closePath();
        ctx.stroke();
        
        // 内側：明るい金色
        ctx.shadowColor = "rgba(252, 211, 77, 1)";
        ctx.shadowBlur = 12;
        ctx.strokeStyle = "rgba(252, 211, 77, 0.9)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(b1.x - 1.5, b1.y - 1.5);
        ctx.lineTo(b2.x + 1.5, b2.y - 1.5);
        ctx.lineTo(b3.x + 1.5, b3.y + 1.5);
        ctx.lineTo(b4.x - 1.5, b4.y + 1.5);
        ctx.closePath();
        ctx.stroke();
        
        ctx.restore();
      }
      
      // 選択リング表示
      if (isSelected) {
        ctx.save();
        ctx.shadowColor = hasOverlap ? "rgba(220,38,38,0.6)" : LOOK.glowColor;
        ctx.shadowBlur = 18;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        ctx.strokeStyle = hasOverlap ? "#dc2626" : LOOK.ringColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(b1.x, b1.y);
        ctx.lineTo(b2.x, b2.y);
        ctx.lineTo(b3.x, b3.y);
        ctx.lineTo(b4.x, b4.y);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      // 文字：水平のまま（回転を打ち消す）
      const label = `${o.icon ? o.icon + " " : ""}${o.label ?? ""}`.trim();
      if (label) {
        const center = { x: gx + gw / 2, y: gy + gh / 2 };

        ctx.save();
        ctx.translate(center.x, center.y);

        // ★ここで回転を戻す（文字は水平）
        ctx.rotate(-LOOK.angle);

        ctx.font = "12px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // 文字の下地（読みやすく）
        const padX = 8;
        const w = ctx.measureText(label).width;
        const boxW = w + padX * 2;
        const boxH = 18;

        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.strokeStyle = "rgba(0,0,0,0.10)";
        ctx.lineWidth = 1;

        const x0 = -boxW / 2;
        const y0 = -boxH / 2;
        const r = 8;

        ctx.beginPath();
        ctx.moveTo(x0 + r, y0);
        ctx.arcTo(x0 + boxW, y0, x0 + boxW, y0 + boxH, r);
        ctx.arcTo(x0 + boxW, y0 + boxH, x0, y0 + boxH, r);
        ctx.arcTo(x0, y0 + boxH, x0, y0, r);
        ctx.arcTo(x0, y0, x0 + boxW, y0, r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#111";
        ctx.fillText(label, 0, 0);
        
        // 溶鉱炉レベル表示（CITYタイプの名前の上に小さく表示）
        if (o.type === "CITY" && o.Fire) {
          const fireValue = String(o.Fire).trim();
          
          // FC1～FC10の画像表示
          if (fireValue.match(/^FC([1-9]|10)$/i)) {
            const imageName = fireValue.toUpperCase();
            const img = fireLevelImagesRef.current[imageName];
            
            if (img && img.complete) {
              const imgWidth = 22 / cam.scale; // 小さく表示
              const imgHeight = 22 / cam.scale;
              const imgY = -28 / cam.scale; // ラベルの上
              
              ctx.save();
              ctx.globalAlpha = 0.9;
              ctx.drawImage(img, -imgWidth / 2, imgY, imgWidth, imgHeight);
              ctx.restore();
            }
          }
          // 数字1～30の場合は水色の丸に白字で表示
          else if (fireValue.match(/^([1-9]|[12][0-9]|30)$/)) {
            const level = parseInt(fireValue, 10);
            ctx.save();
            
            // FCアイコンより少し小さいサイズの円を描画
            const circleSize = 18 / cam.scale;
            const circleY = -28 / cam.scale; // ラベルの上（FCと同じ位置）
            
            // 白い縁取りの円を描画
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(0, circleY + circleSize / 2, circleSize / 2 + 1.5 / cam.scale, 0, Math.PI * 2);
            ctx.fill();
            
            // ロイヤルブルーの円を描画
            ctx.fillStyle = "#4169E1"; // ロイヤルブルー
            ctx.beginPath();
            ctx.arc(0, circleY + circleSize / 2, circleSize / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // 白い数字を描画
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            
            // 数字の桁数に応じてフォントサイズを調整
            const fontSize = level >= 10 ? 9 / cam.scale : 11 / cam.scale;
            ctx.font = `bold ${fontSize}px system-ui`;
            ctx.fillText(String(level), 0, circleY + circleSize / 2);
            
            ctx.restore();
          }
        }

        ctx.restore();
      }
    }

    ctx.restore();

    // 吹き出しを一番上のレイヤーに描画（選択されたオブジェクトにbirthdayまたはnoteがある場合）
    // 編集モード時は吹き出しを表示しない
    if (!isEditMode && selectedId) {
      const selectedObj = objects.find(o => String(o.id) === selectedId);
      const isBearTrap = selectedObj && selectedObj.type === "BEAR_TRAP";
      const hasBirthday = selectedObj && selectedObj.birthday && selectedObj.birthday.trim();
      const hasNote = selectedObj && selectedObj.note && selectedObj.note.trim();
      
      // 熊罠は吹き出し表示せず、アニメーションを優先
      if ((hasBirthday || hasNote) && !isBearTrap) {
        ctx.save();
        ctx.translate(viewW / 2, viewH / 2);
        ctx.translate(cam.tx, cam.ty);
        ctx.scale(cam.scale, cam.scale);
        ctx.rotate(LOOK.angle);
        ctx.translate(-cx, -cy);

        const gx = num(selectedObj.x, 0) * cell;
        const gy = num(selectedObj.y, 0) * cell;
        const gw = Math.max(1, num(selectedObj.w, 1)) * cell;
        const gh = Math.max(1, num(selectedObj.h, 1)) * cell;
        const center = { x: gx + gw / 2, y: gy + gh / 2 };

        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.rotate(-LOOK.angle);

        // 半透明設定（90%）
        ctx.globalAlpha = 0.9;

        // 吹き出しの内容を作成（誕生日 + note）
        let bubbleContent = '';
        if (hasBirthday) {
          bubbleContent = `🎂 ${selectedObj.birthday}`;
        }
        if (hasNote) {
          if (bubbleContent) bubbleContent += '\n';
          bubbleContent += selectedObj.note;
        }

        // 吹き出しのサイズ計算
        ctx.font = "13px system-ui";
        const maxWidth = isMobile ? 200 : 280;
        const lines: string[] = [];
        const words = bubbleContent.split('\n');
        
        for (const word of words) {
          if (!word) {
            lines.push('');
            continue;
          }
          const wordWidth = ctx.measureText(word).width;
          if (wordWidth <= maxWidth) {
            lines.push(word);
          } else {
            let currentLine = '';
            for (let i = 0; i < word.length; i++) {
              const testLine = currentLine + word[i];
              if (ctx.measureText(testLine).width > maxWidth) {
                lines.push(currentLine);
                currentLine = word[i];
              } else {
                currentLine = testLine;
              }
            }
            if (currentLine) lines.push(currentLine);
          }
        }

        const lineHeight = 20;
        const padding = 12;
        const bubbleWidth = Math.min(maxWidth, Math.max(...lines.map(l => ctx.measureText(l).width))) + padding * 2;
        const bubbleHeight = lines.length * lineHeight + padding * 2;
        const labelBoxH = 18;
        const bubbleY = -labelBoxH / 2 - bubbleHeight - 10 / cam.scale;  // 吹き出し全体を名前に近づける

        const gradient = ctx.createLinearGradient(
          -bubbleWidth / 2, bubbleY,
          bubbleWidth / 2, bubbleY + bubbleHeight
        );
        gradient.addColorStop(0, '#fef3c7');
        gradient.addColorStop(1, '#fde68a');

        const r = 6;  // 角丸を小さく
        const x0 = -bubbleWidth / 2;
        const y0 = bubbleY;

        ctx.fillStyle = gradient;
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1 / cam.scale;  // 線を細く

        ctx.beginPath();
        ctx.moveTo(x0 + r, y0);
        ctx.arcTo(x0 + bubbleWidth, y0, x0 + bubbleWidth, y0 + bubbleHeight, r);
        ctx.arcTo(x0 + bubbleWidth, y0 + bubbleHeight, x0, y0 + bubbleHeight, r);
        ctx.arcTo(x0, y0 + bubbleHeight, x0, y0, r);
        ctx.arcTo(x0, y0, x0 + bubbleWidth, y0, r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        const arrowSize = 8 / cam.scale;
        const arrowOffset = 1 / cam.scale;  // 三角形を吹き出しに詰める
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(-arrowSize, y0 + bubbleHeight + arrowOffset);
        ctx.lineTo(0, y0 + bubbleHeight + arrowSize + arrowOffset);
        ctx.lineTo(arrowSize, y0 + bubbleHeight + arrowOffset);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.moveTo(-arrowSize + 1 / cam.scale, y0 + bubbleHeight + arrowOffset);
        ctx.lineTo(0, y0 + bubbleHeight + arrowSize - 1 / cam.scale + arrowOffset);
        ctx.lineTo(arrowSize - 1 / cam.scale, y0 + bubbleHeight + arrowOffset);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#78350f';
        ctx.font = "13px system-ui";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";

        const textX = x0 + padding;
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], textX, y0 + padding + i * lineHeight);
        }

        ctx.restore();
        ctx.restore();
      }
    }

    // +マーク描画（編集モード時のpendingPosition）
    // ※カメラ変換が適用されている状態で描画
    if (isEditMode && pendingPosition) {
      // オブジェクトと同じ座標計算方法を使用
      const gx = pendingPosition.x * cfg.cell;
      const gy = pendingPosition.y * cfg.cell;
      // 1x1セルの中心に+マークを配置
      const centerX = gx + cfg.cell / 2;
      const centerY = gy + cfg.cell / 2;
      
      ctx.save();
      // +マークの中心に移動
      ctx.translate(centerX, centerY);
      // 回転を打ち消して、画面上で水平垂直の+として表示
      ctx.rotate(-LOOK.angle);
      
      // 白い縁取り（視認性向上）
      ctx.shadowColor = "rgba(239, 68, 68, 0.6)";
      ctx.shadowBlur = 8;
      ctx.strokeStyle = "white";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(12, 0);
      ctx.moveTo(0, -12);
      ctx.lineTo(0, 12);
      ctx.stroke();
      
      // 赤い+マーク本体
      ctx.shadowColor = "rgba(239, 68, 68, 0.6)";
      ctx.shadowBlur = 8;
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(12, 0);
      ctx.moveTo(0, -12);
      ctx.lineTo(0, 12);
      ctx.stroke();
      
      ctx.restore();
    }

    ctx.restore();

    // HUD（選択オブジェクト情報を含む）
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.font = "12px system-ui";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    
    let hudText = `${cfg.name} | zoom:${cam.scale.toFixed(2)}`;
    if (selectedId) {
      const selectedObj = objects.find(o => String(o.id) === selectedId);
      if (selectedObj) {
        hudText += ` | 選択: ${selectedObj.label || selectedObj.id || '(名前なし)'}`;
      }
    }
    ctx.fillText(hudText, viewW - 10, 10);
  };

  // 初期表示：最初は少し引き気味にして“ゲームっぽく”
  useEffect(() => {
    // 1回だけ、map全体が入りやすいように軽くズームアウト
    setCam((c) => (c.scale === 1 ? { ...c, scale: 0.9 } : c));

  }, []);

  // データ・カメラ変更で描画
  useEffect(() => {
    requestDraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects, cfg.cols, cfg.rows, cfg.cell, cam, selectedId, pendingPosition, isEditMode]);

  // ====== 入力：パン＆ズーム（タッチ/マウス） ======
  const onPointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { mx, my } = screenToMap(sx, sy, rect.width, rect.height);

    // 編集モード時：オブジェクトドラッグ開始
    if (isEditMode && pointersRef.current.size === 0) {
      const hit = hitTest(mx, my);
      if (hit && hit.id) {
        dragStartRef.current = {
          objId: String(hit.id),
          mx,
          my,
          objX: num(hit.x, 0),
          objY: num(hit.y, 0),
        };
        setIsDragging(true);
        setSelectedId(String(hit.id));
        canvas.setPointerCapture(e.pointerId);
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        return;
      }
    }

    canvas.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // 2本指になったらピンチ開始
    if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()];
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchRef.current = {
        startScale: cam.scale,
        startTx: cam.tx,
        startTy: cam.ty,
        startMid: mid,
        startDist: dist,
      };
    } else {
      pinchRef.current = null;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointersRef.current.get(e.pointerId);
    if (!prev) return;

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // 編集モード：オブジェクトドラッグ中
    if (isDragging && dragStartRef.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const { mx, my } = screenToMap(sx, sy, rect.width, rect.height);

      const deltaX = mx - dragStartRef.current.mx;
      const deltaY = my - dragStartRef.current.my;

      const newX = dragStartRef.current.objX + deltaX / cfg.cell;
      const newY = dragStartRef.current.objY + deltaY / cfg.cell;

      // グリッドマスに合わせて整数座標に丸める
      const snappedX = Math.round(newX);
      const snappedY = Math.round(newY);

      // オブジェクトの位置を更新
      setObjects((prev) =>
        prev.map((o) =>
          o.id === dragStartRef.current?.objId
            ? { ...o, x: snappedX, y: snappedY }
            : o
        )
      );
      return;
    }

    // ピンチ中
    if (pointersRef.current.size === 2 && pinchRef.current) {
      const pts = [...pointersRef.current.values()];
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);

      const ratio = dist / Math.max(1, pinchRef.current.startDist);
      const newScale = clamp(pinchRef.current.startScale * ratio, 0.35, 2.5);

      // “ピンチ中心が画面上でズレない”ように、パンを調整
      const dx = mid.x - pinchRef.current.startMid.x;
      const dy = mid.y - pinchRef.current.startMid.y;

      setCam({
        scale: newScale,
        tx: pinchRef.current.startTx + dx,
        ty: pinchRef.current.startTy + dy,
      });
      return;
    }

    // 1本指＝パン
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;

    // ちょい動いたらパン扱い
    setCam((c) => ({ ...c, tx: c.tx + dx, ty: c.ty + dy }));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    // グリッドスナップ（編集モード時のみ）
    if (isDragging && dragStartRef.current && isEditMode) {
      setObjects((prev) =>
        prev.map((o) => {
          if (o.id === dragStartRef.current?.objId) {
            return {
              ...o,
              x: Math.round(num(o.x, 0)),
              y: Math.round(num(o.y, 0)),
            };
          }
          return o;
        })
      );
    }

    pointersRef.current.delete(e.pointerId);
    pinchRef.current = null;
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    pinchRef.current = null;
    setIsDragging(false);
    dragStartRef.current = null;
  };

  // タップ選択（短いクリック/タップ）- ダブルクリック検知機能付き
  const onClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const { mx, my } = screenToMap(sx, sy, rect.width, rect.height);
    const gridX = Math.floor(mx / cfg.cell);
    const gridY = Math.floor(my / cfg.cell);
    
    const now = Date.now();
    const lastClick = lastClickRef.current;
    
    // ダブルクリック判定（300ms以内 & 同じグリッド位置）
    const isDoubleClick = lastClick && 
      (now - lastClick.time) < 300 && 
      lastClick.gridX === gridX && 
      lastClick.gridY === gridY;
    
    if (isDoubleClick) {
      // タイマーをクリア
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      lastClickRef.current = null;
      
      // ダブルクリック処理を実行（編集モード時のみ）
      if (isEditMode) {
        const hit = hitTest(mx, my);
        
        if (hit && hit.id) {
          // 既存オブジェクトをダブルクリック → 編集
          setEditingObject(hit);
          setOriginalEditingId(String(hit.id));
          setPendingPosition(null);
        } else {
          // 空白エリアをダブルクリック → 新規追加
          setPendingPosition({ x: gridX, y: gridY });
          const newId = `obj_${Date.now()}`;
          const newType = lastCreatedType;
          const defaultSize = getDefaultSize(newType);
          const newObj: Obj = {
            id: newId,
            type: newType,
            label: getDefaultLabel(newType),
            x: gridX,
            y: gridY,
            w: defaultSize.w,
            h: defaultSize.h,
          };
          setEditingObject(newObj);
          setOriginalEditingId(newId);
        }
      }
      return;
    }
    
    // 今回のクリックを記録
    lastClickRef.current = { time: now, gridX, gridY };
    
    // ダブルクリック検出のため、シングルクリック処理を遅延
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    
    const hit = hitTest(mx, my);
    
    // Ctrl+クリック（Win）またはCmd+クリック（Mac）で新規オブジェクト追加（編集モード時）
    if (isEditMode && (e.ctrlKey || e.metaKey)) {
      const newId = `obj_${Date.now()}`;
      const newType = lastCreatedType;
      const defaultSize = getDefaultSize(newType);
      const newObj: Obj = {
        id: newId,
        type: newType,
        label: getDefaultLabel(newType),
        x: gridX,
        y: gridY,
        w: defaultSize.w,
        h: defaultSize.h,
      };
      setObjects((prev) => [...prev, newObj]);
      setSelectedId(newId);
      setEditingObject(newObj);
      setOriginalEditingId(newId);
      setPendingPosition(null);
      return;
    }
    
    // 編集モードでの空白エリアクリックは遅延処理（ダブルクリック優先）
    if (isEditMode && !hit) {
      clickTimerRef.current = setTimeout(() => {
        setPendingPosition({ x: gridX, y: gridY });
        setSelectedId(null);
        clickTimerRef.current = null;
      }, 250); // 250ms遅延
      return;
    }
    
    // 参照モードまたはオブジェクトがヒットした場合は即座に選択
    if (hit) {
      setSelectedId(hit.id ? String(hit.id) : null);
    } else {
      setSelectedId(null);
    }
  };

  // ダブルクリックで編集（編集モード時のみ）- onClick内のダブルクリック検知に統合済み
  const onDoubleClick = (e: React.MouseEvent) => {
    // onClickで処理されるため、ここでは何もしない
    e.preventDefault();
    e.stopPropagation();
  };

  // wheelイベントのpassive問題を回避するため、useEffectでネイティブリスナーを追加
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY;
      const factor = delta > 0 ? 1.08 : 0.92;
      const newScale = clamp(cam.scale * factor, 0.35, 2.5);
      setCam((c) => ({ ...c, scale: newScale }));
      requestDraw();
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [cam.scale]);

  // GASへ保存
  const saveToGAS = async () => {
    if (!allianceId) return;
    
    setIsSaving(true);
    try {
      const base = process.env.NEXT_PUBLIC_GAS_URL;
      if (!base) {
        alert("GASのURLが設定されていません");
        setIsSaving(false);
        return;
      }

      const res = await fetch(`${base}?action=saveMap&allianceId=${allianceId}`, {
        method: "POST",
        body: JSON.stringify({
          mapId: currentMapId,
          actor: 'anonymous',
          objects,
          updatedAt: new Date().toISOString(),
        }),
      });

      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error || "保存に失敗しました");
      }

      alert("✅ 保存完了しました!");
      await loadMap(); // 再読込
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      alert(`❌ 保存エラー: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // マップコピー処理
  const handleCopyMap = async (targetMapId: string) => {
    if (!alliance || !isEditMode) return;
    
    const targetMap = mapConfigs.find(m => m.id === targetMapId);
    if (!targetMap) return;
    
    if (!confirm(`ベースマップ（objects）を "${targetMap.name}" にコピーしますか？\n\n※ コピー先の既存データは上書きされます`)) {
      return;
    }
    
    try {
      const base = process.env.NEXT_PUBLIC_GAS_URL;
      if (!base) {
        alert("GASのURLが設定されていません");
        return;
      }

      const params = new URLSearchParams({
        action: 'copyMap',
        allianceId: alliance.id,
      });

      const res = await fetch(`${base}?action=copyMap&allianceId=${alliance.id}`, {
        method: "POST",
        body: JSON.stringify({
          targetMapId: targetMapId,
        }),
      });

      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error || "コピーに失敗しました");
      }

      alert(`✅ コピー完了: ${json.copied}個のオブジェクトをコピーしました`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      alert(`❌ コピーエラー: ${message}`);
    }
  };

  // マップ表示/非表示の切替
  const toggleMapVisibility = async (mapId: string) => {
    if (!alliance || !isEditMode) return;
    
    const map = mapConfigs.find(m => m.id === mapId);
    if (!map || map.isBase) return;
    
    const newVisibility = !map.isVisible;
    
    try {
      const base = process.env.NEXT_PUBLIC_GAS_URL;
      if (!base) {
        alert("GASのURLが設定されていません");
        return;
      }

      const params = new URLSearchParams({
        action: 'updateMapConfig',
        allianceId: alliance.id,
      });

      const res = await fetch(`${base}?action=updateMapConfig&allianceId=${alliance.id}`, {
        method: "POST",
        body: JSON.stringify({
          mapId: mapId,
          isVisible: newVisibility,
        }),
      });

      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error || "更新に失敗しました");
      }

      // ローカル状態を更新
      setMapConfigs(prev => 
        prev.map(m => m.id === mapId ? { ...m, isVisible: newVisibility } : m)
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      alert(`❌ 更新エラー: ${message}`);
    }
  };

  // マップの並び替え
  const moveMap = async (mapId: string, direction: 'up' | 'down') => {
    if (!alliance || !isEditMode) return;
    
    const index = mapConfigs.findIndex(m => m.id === mapId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= mapConfigs.length) return;
    
    // 配列を並び替え
    const newConfigs = [...mapConfigs];
    [newConfigs[index], newConfigs[newIndex]] = [newConfigs[newIndex], newConfigs[index]];
    
    // order値を更新
    const updates = newConfigs.map((m, i) => ({ ...m, order: i + 1 }));
    
    try {
      const base = process.env.NEXT_PUBLIC_GAS_URL;
      if (!base) {
        alert("GASのURLが設定されていません");
        return;
      }

      const params = new URLSearchParams({
        action: 'updateAllMapConfigs',
        allianceId: alliance.id,
      });

      const res = await fetch(`${base}?action=updateAllMapConfigs&allianceId=${alliance.id}`, {
        method: "POST",
        body: JSON.stringify({
          configs: updates,
        }),
      });

      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error || "更新に失敗しました");
      }

      // ローカル状態を更新
      setMapConfigs(updates);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      alert(`❌ 並び替えエラー: ${message}`);
    }
  };

  return (
    <>
      {/* ローディングオーバーレイ */}
      {loading && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{
            animation: "snowflakeAnimation 3s infinite linear",
            display: "inline-block",
            transformOrigin: "center center",
            lineHeight: 1,
          }}>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* 中心の六角形 */}
              <circle cx="32" cy="32" r="4" fill="white" opacity="0.9"/>
              
              {/* 6本の主軸 */}
              <line x1="32" y1="8" x2="32" y2="56" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <line x1="11.7" y1="20" x2="52.3" y2="44" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <line x1="11.7" y1="44" x2="52.3" y2="20" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              
              {/* 上方向の枝 */}
              <line x1="32" y1="18" x2="26" y2="13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="32" y1="18" x2="38" y2="13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="32" y1="14" x2="28" y2="10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="32" y1="14" x2="36" y2="10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              
              {/* 下方向の枝 */}
              <line x1="32" y1="46" x2="26" y2="51" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="32" y1="46" x2="38" y2="51" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="32" y1="50" x2="28" y2="54" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="32" y1="50" x2="36" y2="54" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              
              {/* 右上方向の枝 */}
              <line x1="40.5" y1="26.9" x2="42.5" y2="21.5" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="40.5" y1="26.9" x2="45" y2="29" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="43.8" y1="24.6" x2="46" y2="19.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="43.8" y1="24.6" x2="47.8" y2="26.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              
              {/* 右下方向の枝 */}
              <line x1="40.5" y1="37.1" x2="42.5" y2="42.5" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="40.5" y1="37.1" x2="45" y2="35" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="43.8" y1="39.4" x2="46" y2="44.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="43.8" y1="39.4" x2="47.8" y2="37.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              
              {/* 左上方向の枝 */}
              <line x1="23.5" y1="26.9" x2="21.5" y2="21.5" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="23.5" y1="26.9" x2="19" y2="29" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="20.2" y1="24.6" x2="18" y2="19.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="20.2" y1="24.6" x2="16.2" y2="26.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              
              {/* 左下方向の枝 */}
              <line x1="23.5" y1="37.1" x2="21.5" y2="42.5" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="23.5" y1="37.1" x2="19" y2="35" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="20.2" y1="39.4" x2="18" y2="44.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="20.2" y1="39.4" x2="16.2" y2="37.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      )}
      
    <main style={{ 
      padding: 12, 
      fontFamily: "system-ui", 
      position: "relative",
      paddingTop: tickerHidden ? 12 : 44, // テロップ表示時は上部にスペースを確保
    }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", gap: isMobile ? 6 : 10, alignItems: "center", position: "relative" }}>
        {/* ハンバーガーメニューボタン */}
        <button
          onClick={() => setShowHeaderMenu(!showHeaderMenu)}
          style={{
            padding: "8px 12px",
            background: showHeaderMenu ? "#374151" : "#1f2937",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: "18px",
            transition: "all 0.2s",
            flexShrink: 0,
          }}
          title="メニュー"
        >
          ☰
        </button>
        
        <h1 style={{ 
          margin: 0, 
          fontSize: isMobile ? "14px" : "20px",
          maxWidth: isMobile ? "80px" : "150px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flexShrink: 1,
          minWidth: 0,
        }}>
          {cfg.name}
        </h1>
        <button onClick={loadMap} style={{ padding: "8px 10px", fontSize: "14px", flexShrink: 0 }}>
          🔄
        </button>
        
        {/* テロップ オン/オフ切替 */}
        {!isEditMode && (
          <div
            onClick={() => setTickerHidden(!tickerHidden)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? "4px" : "8px",
              padding: isMobile ? "6px 8px" : "6px 12px",
              background: "white",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: 6,
              cursor: "pointer",
              userSelect: "none",
              minHeight: isMobile ? "36px" : "auto",
              flexShrink: 0,
            }}
            title={tickerHidden ? "テロップを表示" : "テロップを非表示"}
          >
            <span style={{
              fontSize: isMobile ? 11 : 13,
              fontWeight: 500,
              color: "#333",
              whiteSpace: "nowrap",
            }}>
              テロップ
            </span>
            <div style={{
              position: "relative",
              width: isMobile ? "38px" : "44px",
              height: isMobile ? "20px" : "22px",
              background: tickerHidden ? "#d1d5db" : "#fbbf24",
              borderRadius: isMobile ? "10px" : "11px",
              transition: "background 0.3s",
              flexShrink: 0,
            }}>
              <div style={{
                position: "absolute",
                top: "2px",
                left: tickerHidden ? "2px" : (isMobile ? "20px" : "22px"),
                width: isMobile ? "16px" : "18px",
                height: isMobile ? "16px" : "18px",
                background: "white",
                borderRadius: "50%",
                transition: "left 0.3s",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }} />
            </div>
            <span style={{
              fontSize: isMobile ? 10 : 12,
              fontWeight: 600,
              color: tickerHidden ? "#9ca3af" : "#f59e0b",
              minWidth: "28px",
            }}>
              {tickerHidden ? "OFF" : "ON"}
            </span>
          </div>
        )}
        
        {!isEditMode ? (
          <button
            onClick={() => {
              // キャッシュされたパスワードで自動認証を試みる
              if (alliance) {
                const cachedPassword = localStorage.getItem(`map-edit-password-${alliance.allianceId}`);
                if (cachedPassword && cachedPassword === alliance.editPassword) {
                  // 自動認証成功
                  setIsEditMode(true);
                  return;
                }
              }
              // キャッシュなし or 不一致の場合はパスワードモーダルを表示
              setShowPasswordModal(true);
            }}
            style={{
              padding: "8px 12px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: "14px",
              flexShrink: 0,
            }}
            title="編集モード"
          >
            🔒
          </button>
        ) : (
          <>
            <button
              onClick={saveToGAS}
              disabled={isSaving}
              style={{
                padding: "8px 12px",
                background: isSaving ? "#9ca3af" : "#16a34a",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: isSaving ? "not-allowed" : "pointer",
                fontSize: "14px",
                opacity: isSaving ? 0.7 : 1,
                flexShrink: 0,
              }}
              title={isSaving ? "保存中..." : "保存"}
            >
              {isSaving ? "⏳" : "💾"}
            </button>
            <button
              onClick={exitEditMode}
              style={{
                padding: "8px 12px",
                background: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: "14px",
              }}
              title="編集モード終了"
            >
              🔓
            </button>
          </>
        )}
      </div>

      {/* パスワード認証モーダル */}
      {showPasswordModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowPasswordModal(false)}
        >
          <div
            style={{
              background: "white",
              padding: "24px",
              borderRadius: 12,
              minWidth: 320,
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 16px 0" }}>編集モード認証</h2>
            <p style={{ margin: "0 0 12px 0", fontSize: 14, color: "#666" }}>
              パスワードを入力してください
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
              placeholder="パスワード"
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ddd",
                borderRadius: 6,
                fontSize: 14,
                boxSizing: "border-box",
              }}
              autoFocus
            />
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                onClick={() => setShowPasswordModal(false)}
                style={{
                  flex: 1,
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  background: "white",
                  cursor: "pointer",
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handlePasswordSubmit}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                ログイン
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ハンバーガーメニューパネル */}
      {showHeaderMenu && (
        <div
          ref={headerMenuRef}
          style={{
            position: "absolute",
            top: "60px",
            left: "12px",
            background: "white",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            minWidth: 280,
            zIndex: 200,
            overflow: "hidden",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* マップ切替（常に表示） */}
          <>
            <div 
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid #e5e7eb",
                  userSelect: "none",
                  fontWeight: 600,
                  color: "#6b7280",
                  fontSize: "13px",
                  background: "#f9fafb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>🗺️ マップ切替</span>
                {isEditMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMapManagement(true);
                      setShowHeaderMenu(false);
                    }}
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      background: "#2563eb",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    管理
                  </button>
                )}
              </div>
              
              {/* マップ一覧（2つ以上の場合のみ表示） */}
              {visibleMaps.length > 1 && visibleMaps.map((map, index) => {
                const isCurrent = map.id === currentMapId;
                
                return (
                  <div 
                    key={map.id}
                    style={{
                      padding: "10px 16px 10px 32px",
                      cursor: isCurrent ? "default" : "pointer",
                      borderBottom: index < visibleMaps.length - 1 ? "1px solid #e5e7eb" : "1px solid #e5e7eb",
                      transition: "background 0.2s",
                      userSelect: "none",
                      fontSize: "14px",
                      background: isCurrent ? "#dbeafe" : "white",
                      color: "#1f2937",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      opacity: map.isVisible ? 1 : 0.5,
                    }}
                    onClick={(e) => {
                      if (!isCurrent) {
                        e.stopPropagation();
                        switchMap(map.id);
                      }
                    }}
                  >
                    <span style={{ flex: 1 }}>
                      {isCurrent && "✓ "}
                      {map.name}
                      {!map.isVisible && " (非表示)"}
                    </span>
                    {isEditMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMapConfig(map);
                          setShowMapManagement(true);
                          setShowHeaderMenu(false);
                        }}
                        style={{
                          padding: "2px 6px",
                          fontSize: "11px",
                          background: "#e5e7eb",
                          color: "#1f2937",
                          border: "none",
                          borderRadius: 3,
                          cursor: "pointer",
                          userSelect: "none",
                        }}
                      >
                        編集
                      </button>
                    )}
                  </div>
                );
              })}
          </>
          
          {/* リンク集（見出し） */}
          <div 
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #e5e7eb",
              userSelect: "none",
              fontWeight: 600,
              color: "#6b7280",
              fontSize: "13px",
              background: "#f9fafb",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>🔗 リンク集</span>
            {isEditMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingLink({ name: "", url: "", order: 0, display: true, index: -1 });
                  setShowAddLinkModal(true);
                  setShowHeaderMenu(false);
                }}
                style={{
                  padding: "4px 8px",
                  fontSize: "11px",
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                ＋追加
              </button>
            )}
          </div>
          
          {/* リンク集のサブメニュー - スプレッドシートから動的に生成 */}
          {links.filter(link => link.display).map((link, displayIndex) => {
            const actualIndex = links.indexOf(link);  // 元の配列でのインデックス
            const isHighlighted = highlightedLinkIndex === actualIndex;
            const isHovered = hoveredLinkIndex === actualIndex;
            
            return (
            <div 
              key={actualIndex}
              style={{
                padding: "10px 16px 10px 32px",
                cursor: "pointer",
                borderBottom: displayIndex < links.filter(l => l.display).length - 1 ? "1px solid #e5e7eb" : "none",
                transition: "background 0.2s",
                userSelect: "none",
                fontSize: "14px",
                background: isHighlighted 
                  ? "#dbeafe" 
                  : (isHovered ? "#f3f4f6" : "white"),
                color: "#1f2937",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              onMouseEnter={() => setHoveredLinkIndex(actualIndex)}
              onMouseLeave={() => setHoveredLinkIndex(null)}
            >
              <span 
                onClick={(e) => {
                  if (!isEditMode) {
                    e.stopPropagation();
                    window.open(link.url, "_blank");
                    setShowHeaderMenu(false);
                  }
                }}
                style={{ flex: 1, cursor: isEditMode ? "default" : "pointer" }}
              >
                {link.name}
              </span>
              {isEditMode && (
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (actualIndex > 0) {
                        const newLinks = [...links];
                        [newLinks[actualIndex - 1], newLinks[actualIndex]] = [newLinks[actualIndex], newLinks[actualIndex - 1]];
                        setLinks(newLinks);
                        setHasUnsavedLinksChanges(true);
                        setHighlightedLinkIndex(actualIndex - 1);  // 移動先をハイライト
                      }
                    }}
                    disabled={actualIndex === 0}
                    style={{
                      padding: "2px 6px",
                      fontSize: "11px",
                      background: actualIndex === 0 ? "#d1d5db" : "#6366f1",
                      color: "white",
                      border: "none",
                      borderRadius: 3,
                      cursor: actualIndex === 0 ? "not-allowed" : "pointer",
                      userSelect: "none",
                      opacity: actualIndex === 0 ? 0.5 : 1,
                    }}
                    title="上に移動"
                  >
                    ↑
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (actualIndex < links.length - 1) {
                        const newLinks = [...links];
                        [newLinks[actualIndex], newLinks[actualIndex + 1]] = [newLinks[actualIndex + 1], newLinks[actualIndex]];
                        setLinks(newLinks);
                        setHasUnsavedLinksChanges(true);
                        setHighlightedLinkIndex(actualIndex + 1);  // 移動先をハイライト
                      }
                    }}
                    disabled={actualIndex === links.length - 1}
                    style={{
                      padding: "2px 6px",
                      fontSize: "11px",
                      background: actualIndex === links.length - 1 ? "#d1d5db" : "#6366f1",
                      color: "white",
                      border: "none",
                      borderRadius: 3,
                      cursor: actualIndex === links.length - 1 ? "not-allowed" : "pointer",
                      userSelect: "none",
                      opacity: actualIndex === links.length - 1 ? 0.5 : 1,
                    }}
                    title="下に移動"
                  >
                    ↓
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingLink({ ...link, index: actualIndex });
                      setShowHeaderMenu(false);
                    }}
                    style={{
                      padding: "2px 6px",
                      fontSize: "11px",
                      background: "#059669",
                      color: "white",
                      border: "none",
                      borderRadius: 3,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    編集
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLinks(links.map((l, i) => 
                        i === actualIndex ? { ...l, display: false } : l
                      ));
                      setHasUnsavedLinksChanges(true);
                    }}
                    style={{
                      padding: "2px 6px",
                      fontSize: "11px",
                      background: "#dc2626",
                      color: "white",
                      border: "none",
                      borderRadius: 3,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    title="非表示"
                  >
                    非表示
                  </button>
                </div>
              )}
            </div>
            );
          })}

          {/* マイオブジェクト設定（閲覧モード時のみ） */}
          {!isEditMode && (
            <div
              onClick={() => {
                setShowMyObjectSelector(true);
                setShowHeaderMenu(false);
              }}
              style={{
                padding: "12px 16px",
                borderTop: "1px solid #e5e7eb",
                cursor: "pointer",
                userSelect: "none",
                background: "white",
                transition: "background 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
              onMouseLeave={(e) => e.currentTarget.style.background = "white"}
            >
              <span>{myObjectId ? "✓" : "📍"} マイオブジェクト設定</span>
              {myObjectId && (
                <span style={{
                  padding: "2px 8px",
                  background: "#10b981",
                  color: "white",
                  borderRadius: 4,
                  fontSize: "11px",
                  fontWeight: 600,
                }}>
                  設定済み
                </span>
              )}
            </div>
          )}

          {/* 集計（閲覧モード時のみ） */}
          {!isEditMode && (
            <div
              onClick={() => {
                setShowFireLevelStats(true);
                setShowHeaderMenu(false);
              }}
              style={{
                padding: "12px 16px",
                borderTop: "1px solid #e5e7eb",
                cursor: "pointer",
                userSelect: "none",
                background: "white",
                transition: "background 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
              onMouseLeave={(e) => e.currentTarget.style.background = "white"}
            >
              <span>📊 集計</span>
            </div>
          )}

          {/* リンク変更保存ボタン（編集モード時のみ） */}
          {isEditMode && hasUnsavedLinksChanges && (
            <div style={{ padding: "12px 16px", borderTop: "1px solid #e5e7eb" }}>
              <button
                onClick={async () => {
                  const success = await saveLinks();
                  if (success) {
                    setShowHeaderMenu(false);
                  }
                }}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                リンクを保存
              </button>
            </div>
          )}

          {/* 閉じるボタン */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid #e5e7eb" }}>
            <button
              onClick={() => setShowHeaderMenu(false)}
              style={{
                width: "100%",
                padding: "8px",
                background: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* マップ管理モーダル */}
      {showMapManager && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: "20px",
          }}
          onClick={() => setShowMapManager(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: "24px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "80vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 20px 0", fontSize: "20px", fontWeight: 600 }}>マップ管理</h2>
            
            <div style={{ marginBottom: "20px" }}>
              {mapConfigs.map((map, index) => (
                <div
                  key={map.id}
                  style={{
                    padding: "12px",
                    marginBottom: "8px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    background: map.isBase ? "#f9fafb" : "white",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {/* 並び替えボタン */}
                    {!map.isBase && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <button
                          onClick={() => moveMap(map.id, 'up')}
                          disabled={index === 0}
                          style={{
                            padding: "4px 8px",
                            background: index === 0 ? "#f3f4f6" : "#3b82f6",
                            color: index === 0 ? "#9ca3af" : "white",
                            border: "none",
                            borderRadius: 4,
                            cursor: index === 0 ? "not-allowed" : "pointer",
                            fontSize: "12px",
                          }}
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveMap(map.id, 'down')}
                          disabled={index === mapConfigs.length - 1}
                          style={{
                            padding: "4px 8px",
                            background: index === mapConfigs.length - 1 ? "#f3f4f6" : "#3b82f6",
                            color: index === mapConfigs.length - 1 ? "#9ca3af" : "white",
                            border: "none",
                            borderRadius: 4,
                            cursor: index === mapConfigs.length - 1 ? "not-allowed" : "pointer",
                            fontSize: "12px",
                          }}
                        >
                          ▼
                        </button>
                      </div>
                    )}
                    
                    {/* マップ情報 */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, marginBottom: "4px" }}>
                        {map.name}
                        {map.isBase && (
                          <span style={{ marginLeft: "8px", fontSize: "12px", color: "#3b82f6" }}>
                            (ベース)
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>
                        ID: {map.id} | シート: {map.sheetName}
                      </div>
                    </div>
                    
                    {/* 表示/非表示トグル */}
                    {!map.isBase && (
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={map.isVisible}
                          onChange={() => toggleMapVisibility(map.id)}
                          style={{ width: "18px", height: "18px", cursor: "pointer" }}
                        />
                        <span style={{ fontSize: "14px" }}>表示</span>
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setShowMapManager(false)}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "#f3f4f6",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* テロップ表示 */}
      {!tickerHidden && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: "32px",
            background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
            color: "white",
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
            zIndex: 1000, // ヘッダーよりも上に
            fontSize: isMobile ? "12px" : "14px",
            fontWeight: 500,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)", // 影を追加
          }}
        >
          <div
            style={{
              display: "inline-block",
              whiteSpace: "nowrap",
              paddingLeft: "100%",
              animation: "scroll-left 30s linear infinite",
            }}
          >
            {tickerText}
          </div>
          <style>{`
            @keyframes scroll-left {
              0% { transform: translateX(0); }
              100% { transform: translateX(-100%); }
            }
          `}</style>
        </div>
      )}

      {err && (
        <div
          style={{
            marginTop: 10,
            padding: "12px 16px",
            background: "rgba(220, 38, 38, 0.1)",
            border: "1px solid rgba(220, 38, 38, 0.3)",
            borderRadius: 8,
            color: "#991b1b",
            fontSize: 14,
          }}
        >
          <strong>⚠️ エラー:</strong> {err}
        </div>
      )}

      <div
        style={{
          marginTop: 10,
          width: "100%",
          height: "calc(100vh - 90px)",
          border: "1px solid rgba(0,0,0,0.10)",
          borderRadius: 12,
          overflow: "hidden",
          background: "#fff",
          touchAction: "none", // ★これがないとピンチがブラウザ操作に取られる
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", display: "block" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
        />
      </div>

      {/* 編集ダイアログ */}
      {editingObject && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: isMobile ? "12px" : "16px",
            overflowY: "auto",
          }}
          onClick={() => {
            setEditingObject(null);
            setOriginalEditingId(null);
            window.scrollTo(0, 0);
          }}
        >
          <div
            style={{
              background: "white",
              padding: "0",
              borderRadius: 16,
              width: "100%",
              maxWidth: isMobile ? "min(calc(100vw - 32px), 460px)" : "480px",
              minWidth: isMobile ? "auto" : "280px",
              maxHeight: isMobile ? "calc(100vh - 24px)" : "90vh",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              margin: "0 auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              padding: isMobile ? "12px 16px" : "18px 24px",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              flexShrink: 0,
            }}>
              <h2 style={{ margin: 0, color: "white", fontSize: isMobile ? 17 : 20, fontWeight: 600, userSelect: "none" }}>オブジェクト編集</h2>
            </div>
            <div style={{ padding: isMobile ? "14px" : "20px", overflowY: "auto", flex: 1 }}>
            
            {/* ID入力フィールド */}
            <div style={{ 
              marginBottom: isMobile ? 8 : 12,
              display: isMobile ? "grid" : "block",
              gridTemplateColumns: isMobile ? "70px 1fr" : "auto",
              gap: isMobile ? "8px" : "0",
              alignItems: isMobile ? "center" : "flex-start",
              background: isMobile ? "linear-gradient(to right, rgba(107, 114, 128, 0.03), rgba(156, 163, 175, 0.03))" : "transparent",
              padding: isMobile ? "10px" : "0",
              borderRadius: isMobile ? 8 : 0,
              border: isMobile ? "1px solid rgba(107, 114, 128, 0.1)" : "none",
            }}>
              <label style={{ 
                display: "flex",
                alignItems: "center",
                gap: isMobile ? 4 : 0,
                marginBottom: isMobile ? 0 : 6, 
                fontSize: 13, 
                fontWeight: 600, 
                color: "#374151",
                userSelect: "none",
              }}>
                {isMobile && "🔖"}
                <span>ID</span>
              </label>
              <input
                type="text"
                value={editingObject.id != null ? String(editingObject.id) : ""}
                onChange={(e) => {
                  const newId = e.target.value.trim();
                  setEditingObject({ ...editingObject, id: newId });
                }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: (() => {
                    const newId = editingObject.id != null ? String(editingObject.id) : "";
                    // 新規作成時（originalEditingIdがnull）でIDが空の場合は重複チェックしない
                    if (!newId && !originalEditingId) return "2px solid #e5e7eb";
                    const isDuplicate = objects.some(o => String(o.id) === newId && String(o.id) !== originalEditingId);
                    return isDuplicate ? "2px solid #dc2626" : "2px solid #e5e7eb";
                  })(),
                  borderRadius: 8,
                  fontSize: 15,
                  boxSizing: "border-box",
                  backgroundColor: "white",
                  color: "#1f2937",
                  transition: "all 0.2s",
                  outline: "none",
                  boxShadow: isMobile ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
                onFocus={(e) => {
                  const newId = editingObject.id != null ? String(editingObject.id) : "";
                  // 新規作成時（originalEditingIdがnull）でIDが空の場合は重複チェックしない
                  if (!newId && !originalEditingId) {
                    e.target.style.borderColor = "#2563eb";
                    e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
                    return;
                  }
                  const isDuplicate = objects.some(o => String(o.id) === newId && String(o.id) !== originalEditingId);
                  if (!isDuplicate) {
                    e.target.style.borderColor = "#2563eb";
                    e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
                  }
                }}
                onBlur={(e) => {
                  const newId = editingObject.id != null ? String(editingObject.id) : "";
                  // 新規作成時でIDが空の場合は重複チェックしない
                  if (!newId && !originalEditingId) {
                    e.target.style.borderColor = "#e5e7eb";
                    e.target.style.boxShadow = isMobile ? "0 1px 3px rgba(0,0,0,0.1)" : "none";
                    return;
                  }
                  const isDuplicate = objects.some(o => String(o.id) === newId && String(o.id) !== originalEditingId);
                  e.target.style.borderColor = isDuplicate ? "#dc2626" : "#e5e7eb";
                  e.target.style.boxShadow = isMobile ? "0 1px 3px rgba(0,0,0,0.1)" : "none";
                }}
              />
              {(() => {
                const currentId = editingObject.id != null ? String(editingObject.id) : "";
                // 新規作成時でIDが空の場合は重複エラーを表示しない
                if (!currentId && !originalEditingId) return null;
                const isDuplicate = objects.some(o => String(o.id) === currentId && String(o.id) !== originalEditingId);
                return isDuplicate ? (
                  <p style={{ margin: "4px 0 0 0", fontSize: 11, color: "#dc2626", userSelect: "none" }}>
                    ⚠️ このIDは既に使用されています
                  </p>
                ) : null;
              })()}
            </div>

            <div style={{ 
              marginBottom: isMobile ? 8 : 12,
              display: isMobile ? "grid" : "block",
              gridTemplateColumns: isMobile ? "70px 1fr" : "auto",
              gap: isMobile ? "8px" : "0",
              alignItems: isMobile ? "center" : "flex-start",
              background: isMobile ? "linear-gradient(to right, rgba(59, 130, 246, 0.03), rgba(147, 197, 253, 0.03))" : "transparent",
              padding: isMobile ? "10px" : "0",
              borderRadius: isMobile ? 8 : 0,
              border: isMobile ? "1px solid rgba(59, 130, 246, 0.1)" : "none",
            }}>
              <label style={{ 
                display: "flex",
                alignItems: "center",
                gap: isMobile ? 4 : 0,
                marginBottom: isMobile ? 0 : 6, 
                fontSize: 13, 
                fontWeight: 600, 
                color: "#374151",
                userSelect: "none",
              }}>
                {isMobile && "📝"}
                <span>名前</span>
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={editingObject.label || ""}
                onChange={(e) => setEditingObject({ ...editingObject, label: e.target.value })}
                readOnly={editingObject.type === "FLAG" || editingObject.type === "MOUNTAIN" || editingObject.type === "LAKE"}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "2px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 15,
                  boxSizing: "border-box",
                  backgroundColor: (editingObject.type === "FLAG" || editingObject.type === "MOUNTAIN" || editingObject.type === "LAKE") ? "#f9fafb" : "white",
                  color: "#1f2937",
                  cursor: (editingObject.type === "FLAG" || editingObject.type === "MOUNTAIN" || editingObject.type === "LAKE") ? "not-allowed" : "text",
                  transition: "all 0.2s",
                  outline: "none",
                  boxShadow: isMobile ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
                onFocus={(e) => {
                  if (editingObject.type !== "FLAG" && editingObject.type !== "MOUNTAIN" && editingObject.type !== "LAKE") {
                    e.target.style.borderColor = "#2563eb";
                    e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e5e7eb";
                  e.target.style.boxShadow = isMobile ? "0 1px 3px rgba(0,0,0,0.1)" : "none";
                }}
              />
            </div>

            {/* Fire（溶鉱炉Lv）- 都市の場合のみ */}
            {editingObject.type === 'CITY' && (
            <div style={{ 
              marginBottom: isMobile ? 8 : 12,
              display: isMobile ? "grid" : "block",
              gridTemplateColumns: isMobile ? "70px 1fr" : "auto",
              gap: isMobile ? "8px" : "0",
              alignItems: isMobile ? "center" : "flex-start",
              background: isMobile ? "linear-gradient(to right, rgba(239, 68, 68, 0.03), rgba(252, 165, 165, 0.03))" : "transparent",
              padding: isMobile ? "10px" : "0",
              borderRadius: isMobile ? 8 : 0,
              border: isMobile ? "1px solid rgba(239, 68, 68, 0.1)" : "none",
            }}>
              <label style={{ 
                display: "flex",
                alignItems: "center",
                gap: isMobile ? 4 : 0,
                marginBottom: isMobile ? 0 : 6, 
                fontSize: 13, 
                fontWeight: 600, 
                color: "#374151",
                userSelect: "none",
              }}>
                {isMobile && "🔥"}
                <span>溶鉱炉Lv</span>
              </label>
              <select
                value={editingObject.Fire || ''}
                onChange={(e) => setEditingObject({ ...editingObject, Fire: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "2px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 15,
                  boxSizing: "border-box",
                  backgroundColor: "white",
                  color: "#1f2937",
                  outline: "none",
                  cursor: "pointer",
                  boxShadow: isMobile ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                <option value="">選択してください</option>
                {Array.from({ length: 30 }, (_, i) => i + 1).map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
                {Array.from({ length: 10 }, (_, i) => i + 1).map(fc => (
                  <option key={`FC${fc}`} value={`FC${fc}`}>FC{fc}</option>
                ))}
              </select>
            </div>
            )}

            {/* 誕生日入力フィールド（ベースマップのみ） */}
            {currentMap?.isBase && (
            <div style={{ 
              marginBottom: isMobile ? 8 : 12,
              display: isMobile ? "grid" : "block",
              gridTemplateColumns: isMobile ? "70px 1fr" : "auto",
              gap: isMobile ? "8px" : "0",
              alignItems: isMobile ? "center" : "flex-start",
              background: isMobile ? "linear-gradient(to right, rgba(251, 146, 60, 0.03), rgba(254, 215, 170, 0.03))" : "transparent",
              padding: isMobile ? "10px" : "0",
              borderRadius: isMobile ? 8 : 0,
              border: isMobile ? "1px solid rgba(251, 146, 60, 0.1)" : "none",
            }}>
              <label style={{ 
                display: "flex",
                alignItems: "center",
                gap: isMobile ? 4 : 0,
                marginBottom: isMobile ? 0 : 6, 
                fontSize: 13, 
                fontWeight: 600, 
                color: "#374151",
                userSelect: "none",
              }}>
                {isMobile && "🎂"}
                <span>誕生日</span>
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  value={(() => {
                    if (!editingObject.birthday) return '';
                    const match = editingObject.birthday.match(/(\d{1,2})月/);
                    return match ? match[1] : '';
                  })()}
                  onChange={(e) => {
                    const month = e.target.value;
                    if (!month) {
                      setEditingObject({ ...editingObject, birthday: '' });
                    } else {
                      const currentDay = (() => {
                        if (!editingObject.birthday) return '1';
                        const match = editingObject.birthday.match(/(\d{1,2})日/);
                        return match ? match[1] : '1';
                      })();
                      setEditingObject({ ...editingObject, birthday: `${month}月${currentDay}日` });
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    border: "2px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 15,
                    boxSizing: "border-box",
                    backgroundColor: "white",
                    color: "#1f2937",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="">--月</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{m}月</option>
                  ))}
                </select>
                <select
                  value={(() => {
                    if (!editingObject.birthday) return '';
                    const match = editingObject.birthday.match(/(\d{1,2})日/);
                    return match ? match[1] : '';
                  })()}
                  onChange={(e) => {
                    const day = e.target.value;
                    const currentMonth = (() => {
                      if (!editingObject.birthday) return '';
                      const match = editingObject.birthday.match(/(\d{1,2})月/);
                      return match ? match[1] : '';
                    })();
                    if (!day || !currentMonth) {
                      setEditingObject({ ...editingObject, birthday: '' });
                    } else {
                      setEditingObject({ ...editingObject, birthday: `${currentMonth}月${day}日` });
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    border: "2px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 15,
                    boxSizing: "border-box",
                    backgroundColor: "white",
                    color: "#1f2937",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="">--日</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}日</option>
                  ))}
                </select>
              </div>
            </div>
            )}

            {/* タイプ */}
            <div style={{ 
              marginBottom: isMobile ? 8 : 12,
              display: isMobile ? "grid" : "block",
              gridTemplateColumns: isMobile ? "70px 1fr" : "auto",
              gap: isMobile ? "8px" : "0",
              alignItems: isMobile ? "center" : "flex-start",
              background: isMobile ? "linear-gradient(to right, rgba(147, 51, 234, 0.03), rgba(196, 181, 253, 0.03))" : "transparent",
              padding: isMobile ? "10px" : "0",
              borderRadius: isMobile ? 8 : 0,
              border: isMobile ? "1px solid rgba(147, 51, 234, 0.1)" : "none",
            }}>
              <label style={{ 
                display: "flex",
                alignItems: "center",
                gap: isMobile ? 4 : 0,
                marginBottom: isMobile ? 0 : 6, 
                fontSize: 13, 
                fontWeight: 600, 
                color: "#374151",
                userSelect: "none",
              }}>
                {isMobile && "🏷️"}
                <span>タイプ</span>
              </label>
              <select
                value={editingObject.type || "OTHER"}
                onChange={(e) => {
                  const newType = e.target.value;
                  const defaultSize = getDefaultSize(newType);
                  let newLabel = editingObject.label;
                  if (newType === "FLAG") newLabel = "🚩";
                  else if (newType === "MOUNTAIN") newLabel = "🏔️";
                  else if (newType === "LAKE") newLabel = "🌊";
                  setEditingObject({ 
                    ...editingObject, 
                    type: newType,
                    label: newLabel,
                    w: defaultSize.w,
                    h: defaultSize.h,
                  });
                }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "2px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 15,
                  boxSizing: "border-box",
                  backgroundColor: "white",
                  color: "#1f2937",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="HQ">本部</option>
                <option value="BEAR_TRAP">熊罠</option>
                <option value="STATUE">同盟建造物</option>
                <option value="CITY">都市</option>
                <option value="DEPOT">同盟資材</option>
                <option value="FLAG">旗</option>
                <option value="MOUNTAIN">山</option>
                <option value="LAKE">湖</option>
                <option value="OTHER">その他</option>
              </select>
            </div>

            {/* サイズセクション（サブマップ用） */}
            {!currentMap?.isBase && (
            <div style={{ marginBottom: isMobile ? 8 : 12 }}>
              {/* 幅 */}
              <div style={{ 
                marginBottom: isMobile ? 8 : 10,
                display: isMobile ? "grid" : "block",
                gridTemplateColumns: isMobile ? "70px 1fr" : "auto",
                gap: isMobile ? "8px" : "0",
                alignItems: isMobile ? "center" : "flex-start",
                background: isMobile ? "linear-gradient(to right, rgba(34, 197, 94, 0.03), rgba(134, 239, 172, 0.03))" : "transparent",
                padding: isMobile ? "10px" : "0",
                borderRadius: isMobile ? 8 : 0,
                border: isMobile ? "1px solid rgba(34, 197, 94, 0.1)" : "none",
              }}>
                <label style={{ 
                  display: "flex",
                  alignItems: "center",
                  gap: isMobile ? 4 : 0,
                  marginBottom: isMobile ? 0 : 6, 
                  fontSize: 13, 
                  fontWeight: 600, 
                  color: "#374151",
                  userSelect: "none",
                }}>
                  {isMobile && "↔️"}
                  <span>幅</span>
                </label>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button
                    onClick={() => setEditingObject({ ...editingObject, w: Math.max(1, (editingObject.w || 1) - 1) })}
                    style={{
                      width: 40,
                      height: 46,
                      border: "2px solid #e5e7eb",
                      borderRadius: 8,
                      background: "white",
                      cursor: "pointer",
                      fontSize: 20,
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#6b7280",
                      flexShrink: 0,
                      userSelect: "none",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#f3f4f6";
                      e.currentTarget.style.borderColor = "#d1d5db";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "white";
                      e.currentTarget.style.borderColor = "#e5e7eb";
                    }}
                  >
                    −
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={editingObject.w || 1}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setEditingObject({ ...editingObject, w: Math.max(1, val === '' ? 1 : Number(val)) });
                    }}
                    style={{
                      flex: 1,
                      padding: "12px 8px",
                      border: "2px solid #e5e7eb",
                      borderRadius: 8,
                      fontSize: 16,
                      boxSizing: "border-box",
                      backgroundColor: "white",
                      color: "#1f2937",
                      outline: "none",
                      textAlign: "center",
                      fontWeight: 600,
                    }}
                  />
                  <button
                    onClick={() => setEditingObject({ ...editingObject, w: (editingObject.w || 1) + 1 })}
                    style={{
                      width: 40,
                      height: 46,
                      border: "2px solid #e5e7eb",
                      borderRadius: 8,
                      background: "white",
                      cursor: "pointer",
                      fontSize: 20,
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#6b7280",
                      flexShrink: 0,
                      userSelect: "none",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#f3f4f6";
                      e.currentTarget.style.borderColor = "#d1d5db";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "white";
                      e.currentTarget.style.borderColor = "#e5e7eb";
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 高さ */}
              <div style={{ 
                marginBottom: 0,
                display: isMobile ? "grid" : "block",
                gridTemplateColumns: isMobile ? "70px 1fr" : "auto",
                gap: isMobile ? "8px" : "0",
                alignItems: isMobile ? "center" : "flex-start",
                background: isMobile ? "linear-gradient(to right, rgba(34, 197, 94, 0.03), rgba(134, 239, 172, 0.03))" : "transparent",
                padding: isMobile ? "10px" : "0",
                borderRadius: isMobile ? 8 : 0,
                border: isMobile ? "1px solid rgba(34, 197, 94, 0.1)" : "none",
              }}>
                <label style={{ 
                  display: "flex",
                  alignItems: "center",
                  gap: isMobile ? 4 : 0,
                  marginBottom: isMobile ? 0 : 6, 
                  fontSize: 13, 
                  fontWeight: 600, 
                  color: "#374151",
                  userSelect: "none",
                }}>
                  {isMobile && "↕️"}
                  <span>高さ</span>
                </label>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button
                    onClick={() => setEditingObject({ ...editingObject, h: Math.max(1, (editingObject.h || 1) - 1) })}
                    style={{
                      width: 40,
                      height: 46,
                      border: "2px solid #e5e7eb",
                      borderRadius: 8,
                      background: "white",
                      cursor: "pointer",
                      fontSize: 20,
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#6b7280",
                      flexShrink: 0,
                      userSelect: "none",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#f3f4f6";
                      e.currentTarget.style.borderColor = "#d1d5db";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "white";
                      e.currentTarget.style.borderColor = "#e5e7eb";
                    }}
                  >
                    −
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={editingObject.h || 1}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setEditingObject({ ...editingObject, h: Math.max(1, val === '' ? 1 : Number(val)) });
                    }}
                    style={{
                      flex: 1,
                      padding: "12px 8px",
                      border: "2px solid #e5e7eb",
                      borderRadius: 8,
                      fontSize: 16,
                      boxSizing: "border-box",
                      backgroundColor: "white",
                      color: "#1f2937",
                      outline: "none",
                      textAlign: "center",
                      fontWeight: 600,
                    }}
                  />
                  <button
                    onClick={() => setEditingObject({ ...editingObject, h: (editingObject.h || 1) + 1 })}
                    style={{
                      width: 40,
                      height: 46,
                      border: "2px solid #e5e7eb",
                      borderRadius: 8,
                      background: "white",
                      cursor: "pointer",
                      fontSize: 20,
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#6b7280",
                      flexShrink: 0,
                      userSelect: "none",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#f3f4f6";
                      e.currentTarget.style.borderColor = "#d1d5db";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "white";
                      e.currentTarget.style.borderColor = "#e5e7eb";
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* 位置・サイズセクション（アコーディオン）- ベースマップのみ */}
            {currentMap?.isBase && (
            <div style={{ marginBottom: isMobile ? 8 : 12 }}>
              <button
                onClick={() => setIsPositionSizeExpanded(!isPositionSizeExpanded)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  background: "#f9fafb",
                  border: "2px solid #e5e7eb",
                  borderRadius: 8,
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#374151",
                  userSelect: "none",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f3f4f6";
                  e.currentTarget.style.borderColor = "#d1d5db";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f9fafb";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
              >
                <span>位置/サイズ設定</span>
                <span style={{ fontSize: 12, transition: "transform 0.2s", transform: isPositionSizeExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
              </button>
              
              {isPositionSizeExpanded && (
                <div style={{ marginTop: 12 }}>
                  {/* X座標 */}
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151", userSelect: "none" }}>
                      X座標
                    </label>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <button
                        onClick={() => setEditingObject({ ...editingObject, x: Math.max(0, (editingObject.x || 0) - 1) })}
                        style={{
                          width: 40,
                          height: 46,
                          border: "2px solid #e5e7eb",
                          borderRadius: 8,
                          background: "white",
                          cursor: "pointer",
                          fontSize: 20,
                          fontWeight: "bold",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#6b7280",
                          flexShrink: 0,
                          userSelect: "none",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f3f4f6";
                          e.currentTarget.style.borderColor = "#d1d5db";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "white";
                          e.currentTarget.style.borderColor = "#e5e7eb";
                        }}
                      >
                        −
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={editingObject.x || 0}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setEditingObject({ ...editingObject, x: val === '' ? 0 : Number(val) });
                        }}
                        style={{
                          flex: 1,
                          padding: "12px 8px",
                          border: "2px solid #e5e7eb",
                          borderRadius: 8,
                          fontSize: 16,
                          boxSizing: "border-box",
                          backgroundColor: "white",
                          color: "#1f2937",
                          outline: "none",
                          textAlign: "center",
                          fontWeight: 600,
                        }}
                      />
                      <button
                        onClick={() => setEditingObject({ ...editingObject, x: (editingObject.x || 0) + 1 })}
                        style={{
                          width: 40,
                          height: 46,
                          border: "2px solid #e5e7eb",
                          borderRadius: 8,
                          background: "white",
                          cursor: "pointer",
                          fontSize: 20,
                          fontWeight: "bold",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#6b7280",
                          flexShrink: 0,
                          userSelect: "none",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f3f4f6";
                          e.currentTarget.style.borderColor = "#d1d5db";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "white";
                          e.currentTarget.style.borderColor = "#e5e7eb";
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  {/* Y座標 */}
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151", userSelect: "none" }}>
                      Y座標
                    </label>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <button
                        onClick={() => setEditingObject({ ...editingObject, y: Math.max(0, (editingObject.y || 0) - 1) })}
                        style={{
                          width: 40,
                          height: 46,
                          border: "2px solid #e5e7eb",
                          borderRadius: 8,
                          background: "white",
                          cursor: "pointer",
                          fontSize: 20,
                          fontWeight: "bold",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#6b7280",
                          flexShrink: 0,
                          userSelect: "none",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f3f4f6";
                          e.currentTarget.style.borderColor = "#d1d5db";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "white";
                          e.currentTarget.style.borderColor = "#e5e7eb";
                        }}
                      >
                        −
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={editingObject.y || 0}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setEditingObject({ ...editingObject, y: val === '' ? 0 : Number(val) });
                        }}
                        style={{
                          flex: 1,
                          padding: "12px 8px",
                          border: "2px solid #e5e7eb",
                          borderRadius: 8,
                          fontSize: 16,
                          boxSizing: "border-box",
                          backgroundColor: "white",
                          color: "#1f2937",
                          outline: "none",
                          textAlign: "center",
                          fontWeight: 600,
                        }}
                      />
                      <button
                        onClick={() => setEditingObject({ ...editingObject, y: (editingObject.y || 0) + 1 })}
                        style={{
                          width: 40,
                          height: 46,
                          border: "2px solid #e5e7eb",
                          borderRadius: 8,
                          background: "white",
                          cursor: "pointer",
                          fontSize: 20,
                          fontWeight: "bold",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#6b7280",
                          flexShrink: 0,
                          userSelect: "none",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f3f4f6";
                          e.currentTarget.style.borderColor = "#d1d5db";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "white";
                          e.currentTarget.style.borderColor = "#e5e7eb";
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  {/* 幅 */}
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151", userSelect: "none" }}>
                      幅
                    </label>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <button
                        onClick={() => setEditingObject({ ...editingObject, w: Math.max(1, (editingObject.w || 1) - 1) })}
                        style={{
                          width: 40,
                          height: 46,
                          border: "2px solid #e5e7eb",
                          borderRadius: 8,
                          background: "white",
                          cursor: "pointer",
                          fontSize: 20,
                          fontWeight: "bold",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#6b7280",
                          flexShrink: 0,
                          userSelect: "none",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f3f4f6";
                          e.currentTarget.style.borderColor = "#d1d5db";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "white";
                          e.currentTarget.style.borderColor = "#e5e7eb";
                        }}
                      >
                        −
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={editingObject.w || 1}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setEditingObject({ ...editingObject, w: Math.max(1, val === '' ? 1 : Number(val)) });
                        }}
                        style={{
                          flex: 1,
                          padding: "12px 8px",
                          border: "2px solid #e5e7eb",
                          borderRadius: 8,
                          fontSize: 16,
                          boxSizing: "border-box",
                          backgroundColor: "white",
                          color: "#1f2937",
                          outline: "none",
                          textAlign: "center",
                          fontWeight: 600,
                        }}
                      />
                      <button
                        onClick={() => setEditingObject({ ...editingObject, w: (editingObject.w || 1) + 1 })}
                        style={{
                          width: 40,
                          height: 46,
                          border: "2px solid #e5e7eb",
                          borderRadius: 8,
                          background: "white",
                          cursor: "pointer",
                          fontSize: 20,
                          fontWeight: "bold",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#6b7280",
                          flexShrink: 0,
                          userSelect: "none",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f3f4f6";
                          e.currentTarget.style.borderColor = "#d1d5db";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "white";
                          e.currentTarget.style.borderColor = "#e5e7eb";
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  {/* 高さ */}
                  <div>
                    <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151", userSelect: "none" }}>
                      高さ
                    </label>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <button
                        onClick={() => setEditingObject({ ...editingObject, h: Math.max(1, (editingObject.h || 1) - 1) })}
                        style={{
                          width: 40,
                          height: 46,
                          border: "2px solid #e5e7eb",
                          borderRadius: 8,
                          background: "white",
                          cursor: "pointer",
                          fontSize: 20,
                          fontWeight: "bold",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#6b7280",
                          flexShrink: 0,
                          userSelect: "none",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f3f4f6";
                          e.currentTarget.style.borderColor = "#d1d5db";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "white";
                          e.currentTarget.style.borderColor = "#e5e7eb";
                        }}
                      >
                        −
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={editingObject.h || 1}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setEditingObject({ ...editingObject, h: Math.max(1, val === '' ? 1 : Number(val)) });
                        }}
                        style={{
                          flex: 1,
                          padding: "12px 8px",
                          border: "2px solid #e5e7eb",
                          borderRadius: 8,
                          fontSize: 16,
                          boxSizing: "border-box",
                          backgroundColor: "white",
                          color: "#1f2937",
                          outline: "none",
                          textAlign: "center",
                          fontWeight: 600,
                        }}
                      />
                      <button
                        onClick={() => setEditingObject({ ...editingObject, h: (editingObject.h || 1) + 1 })}
                        style={{
                          width: 40,
                          height: 46,
                          border: "2px solid #e5e7eb",
                          borderRadius: 8,
                          background: "white",
                          cursor: "pointer",
                          fontSize: 20,
                          fontWeight: "bold",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#6b7280",
                          flexShrink: 0,
                          userSelect: "none",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f3f4f6";
                          e.currentTarget.style.borderColor = "#d1d5db";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "white";
                          e.currentTarget.style.borderColor = "#e5e7eb";
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            )}

            {/* お気に入り - ベースマップのみ */}
            {currentMap?.isBase && (
            <div style={{ 
              marginBottom: isMobile ? 10 : 16, 
              padding: isMobile ? "10px" : "14px", 
              background: "#fef3c7", 
              borderRadius: 8,
              border: "2px solid #fbbf24",
            }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
                <input
                  type="checkbox"
                  checked={editingObject.isFavorite || false}
                  onChange={(e) => setEditingObject({ ...editingObject, isFavorite: e.target.checked })}
                  style={{
                    width: 20,
                    height: 20,
                    cursor: "pointer",
                    accentColor: "#f59e0b",
                  }}
                />
                <span style={{ fontSize: 15, fontWeight: 600, color: "#92400e", userSelect: "none" }}>
                  お気に入り（注目マーク）
                </span>
              </label>
              <p style={{ margin: "8px 0 0 30px", fontSize: 12, color: "#78350f", lineHeight: 1.5, userSelect: "none" }}>
                チェックするとマップ上でピンク系の柔らかいぼかしで目立つように表示されます
              </p>
            </div>
            )}

            {/* メモ欄 - ベースマップのみ */}
            {currentMap?.isBase && (
            <div style={{ 
              marginBottom: isMobile ? 10 : 16,
              display: isMobile ? "block" : "block",
            }}>
              <label style={{ 
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 8, 
                fontSize: 13, 
                fontWeight: 600, 
                color: "#374151",
                userSelect: "none",
              }}>
                <span>メモ</span>
                <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400, userSelect: "none" }}>（選択時に吹き出しで表示されます）</span>
              </label>
              <textarea
                value={editingObject.note || ""}
                onChange={(e) => setEditingObject({ ...editingObject, note: e.target.value })}
                placeholder="このオブジェクトについてのメモを入力してください..."
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "2px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: "border-box",
                  backgroundColor: "white",
                  color: "#1f2937",
                  minHeight: "80px",
                  resize: "vertical",
                  fontFamily: "system-ui",
                  lineHeight: 1.5,
                  outline: "none",
                  transition: "all 0.2s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#2563eb";
                  e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e5e7eb";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
            )}

            {/* メインアクションボタン */}
            <div style={{ 
              display: "flex", 
              gap: 10,
              paddingTop: 8, 
              borderTop: "1px solid #e5e7eb" 
            }}>
              {/* PC版：削除ボタンを左側に小さく配置 */}
              {!isMobile && (
                <button
                  onClick={() => {
                    if (confirm("本当に削除しますか？")) {
                      setObjects((prev) => prev.filter((o) => o.id !== editingObject.id));
                      setEditingObject(null);
                      setOriginalEditingId(null);
                      setPendingPosition(null);
                      setSelectedId(null);
                      window.scrollTo(0, 0);
                    }
                  }}
                  style={{
                    padding: "9px 14px",
                    background: "white",
                    color: "#dc2626",
                    border: "1px solid #fca5a5",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                    minWidth: "auto",
                    transition: "all 0.2s",
                    opacity: 0.7,
                    userSelect: "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "1";
                    e.currentTarget.style.borderColor = "#dc2626";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "0.7";
                    e.currentTarget.style.borderColor = "#fca5a5";
                  }}
                >
                  🗑️
                </button>
              )}
              <div style={{ flex: 1 }} />
              
              {/* キャンセルと更新ボタン */}
              <div style={{ 
                display: "flex", 
                gap: 10,
                width: isMobile ? "100%" : "auto",
              }}>
                <button
                  onClick={() => {
                    setEditingObject(null);
                    setOriginalEditingId(null);
                    setPendingPosition(null);
                    window.scrollTo(0, 0);
                  }}
                  style={{
                    padding: isMobile ? "13px 0" : "11px 24px",
                    border: "2px solid #d1d5db",
                    borderRadius: 8,
                    background: "white",
                    color: "#374151",
                    cursor: "pointer",
                    fontSize: isMobile ? 15 : 14,
                    fontWeight: 600,
                    flex: isMobile ? 1 : "0 0 auto",
                    minWidth: isMobile ? 0 : "auto",
                    transition: "all 0.2s",
                    userSelect: "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f3f4f6";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "white";
                  }}
                >
                  {isMobile ? "閉じる" : "キャンセル"}
                </button>
                <button
                  onClick={() => {
                    // 必須入力チェック
                    if (!editingObject.label || editingObject.label.trim() === "") {
                      alert("名前を入力してください");
                      return;
                    }
                    if (!editingObject.type) {
                      alert("タイプを選択してください");
                      return;
                    }
                    const idStr = editingObject.id != null ? String(editingObject.id).trim() : "";
                    if (!idStr) {
                      alert("IDを入力してください");
                      return;
                    }
                    
                    // ID重複チェック
                    const isDuplicate = objects.some(o => String(o.id) === idStr && String(o.id) !== originalEditingId);
                    if (isDuplicate) {
                      alert("このIDは既に使用されています。別のIDを入力してください。");
                      return;
                    }
                    
                    // グリッドスナップを適用し、全角ハイフンを半角に変換
                    const snappedObject = {
                      ...editingObject,
                      id: idStr,
                      label: (editingObject.label || '').replace(/ー/g, '-'),
                      x: Math.round(num(editingObject.x, 0)),
                      y: Math.round(num(editingObject.y, 0)),
                      w: Math.max(1, Math.round(num(editingObject.w, 1))),
                      h: Math.max(1, Math.round(num(editingObject.h, 1))),
                    };
                    
                    // IDが変更されている場合、selectedIdも更新
                    if (originalEditingId && originalEditingId !== idStr) {
                      setSelectedId(idStr);
                    }
                    
                    setObjects((prev) => {
                      // 既存オブジェクトを探す
                      const existingIndex = prev.findIndex(o => o.id === originalEditingId);
                      if (existingIndex >= 0) {
                        // 既存オブジェクトを更新
                        return prev.map((o) => (o.id === originalEditingId ? snappedObject : o));
                      } else {
                        // 新規追加時に、次回のためにタイプを記憶
                        if (snappedObject.type) {
                          setLastCreatedType(snappedObject.type);
                        }
                        return [...prev, snappedObject];
                      }
                    });
                    setEditingObject(null);
                    setOriginalEditingId(null);
                    setPendingPosition(null);
                    window.scrollTo(0, 0);
                  }}
                  style={{
                    padding: isMobile ? "13px 0" : "11px 28px",
                    background: "#2563eb",
                    color: "white",
                    border: "2px solid #2563eb",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: isMobile ? 15 : 14,
                    fontWeight: 600,
                    flex: isMobile ? 1 : "0 0 auto",
                    minWidth: isMobile ? 0 : "auto",
                    boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
                    transition: "all 0.2s",
                    userSelect: "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#1d4ed8";
                    e.currentTarget.style.borderColor = "#1d4ed8";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#2563eb";
                    e.currentTarget.style.borderColor = "#2563eb";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(37, 99, 235, 0.3)";
                  }}
                >
                  {isMobile ? "✓ 更新" : "更新"}
                </button>
              </div>
            </div>
            
            {/* スマホ版：削除ボタンを小さく控えめに下部に配置 */}
            {isMobile && (
              <div style={{ 
                paddingTop: 12,
                textAlign: "center",
              }}>
                <button
                  onClick={() => {
                    if (confirm("⚠️ 本当に削除しますか？\n\nこの操作は取り消せません。")) {
                      setObjects((prev) => prev.filter((o) => o.id !== editingObject.id));
                      setEditingObject(null);
                      setOriginalEditingId(null);
                      setPendingPosition(null);
                      setSelectedId(null);
                      window.scrollTo(0, 0);
                    }
                  }}
                  style={{
                    padding: "8px 20px",
                    background: "transparent",
                    color: "#9ca3af",
                    border: "1px dashed #d1d5db",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 500,
                    transition: "all 0.2s",
                    userSelect: "none",
                  }}
                >
                  🗑️ このオブジェクトを削除
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* マップ管理モーダル */}
      {showMapManager && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: isMobile ? "12px" : "16px",
            overflowY: "auto",
          }}
          onClick={() => setShowMapManager(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: 16,
              width: "100%",
              maxWidth: isMobile ? "min(calc(100vw - 32px), 460px)" : "520px",
              maxHeight: isMobile ? "calc(100vh - 24px)" : "90vh",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              padding: isMobile ? "12px 16px" : "18px 24px",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}>
              <h2 style={{ margin: 0, color: "white", fontSize: isMobile ? 17 : 20, fontWeight: 600, userSelect: "none" }}>
                🗺️ マップ管理
              </h2>
            </div>
            <div style={{ padding: isMobile ? "14px" : "20px", overflowY: "auto", flex: 1 }}>
              {mapConfigs.map((map) => (
                <div 
                  key={map.id}
                  style={{
                    marginBottom: 16,
                    padding: 16,
                    background: map.id === currentMapId ? "#eff6ff" : "#f9fafb",
                    border: map.id === currentMapId ? "2px solid #2563eb" : "1px solid #e5e7eb",
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "#111" }}>
                      {map.name}
                    </div>
                    {map.id === currentMapId && (
                      <span style={{ fontSize: 12, color: "#2563eb", fontWeight: 600 }}>✓ 表示中</span>
                    )}
                  </div>
                  
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {!map.isBase && (
                      <>
                        <button
                          onClick={async () => {
                            await toggleMapVisibility(map.id);
                          }}
                          style={{
                            padding: "6px 12px",
                            fontSize: 12,
                            background: map.isVisible ? "#f59e0b" : "#10b981",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                          }}
                        >
                          {map.isVisible ? "非表示にする" : "表示する"}
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`ベースマップの内容を「${map.name}」にコピーしますか？`)) {
                              return;
                            }
                            await handleCopyMap(map.id);
                            setShowMapManager(false);
                          }}
                          style={{
                            padding: "6px 12px",
                            fontSize: 12,
                            background: "#8b5cf6",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                          }}
                        >
                          ベースからコピー
                        </button>
                      </>
                    )}
                    {map.id !== currentMapId && (
                      <button
                        onClick={() => {
                          setCurrentMapId(map.id);
                          setShowMapManager(false);
                        }}
                        style={{
                          padding: "6px 12px",
                          fontSize: 12,
                          background: "#059669",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                        }}
                      >
                        このマップに切替
                      </button>
                    )}
                  </div>
                  
                  {map.isBase && (
                    <div style={{ 
                      marginTop: 8, 
                      fontSize: 11, 
                      color: "#6b7280",
                      padding: "6px 10px",
                      background: "#fef3c7",
                      borderRadius: 4,
                      border: "1px solid #fcd34d",
                    }}>
                      ⭐ ベースマップ（非表示にできません）
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{
              padding: isMobile ? "12px 16px" : "16px 24px",
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "flex-end",
            }}>
              <button
                onClick={() => setShowMapManager(false)}
                style={{
                  padding: "10px 20px",
                  background: "#6b7280",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* マップ管理モーダル */}
      {showMapManagement && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
            overflowY: "auto",
          }}
          onClick={() => {
            setShowMapManagement(false);
            setEditingMapConfig(null);
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 16,
              width: "100%",
              maxWidth: "520px",
              maxHeight: "90vh",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              padding: "18px 24px",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}>
              <h2 style={{ margin: 0, color: "white", fontSize: 20, fontWeight: 600, userSelect: "none" }}>
                🗺️ マップ管理
              </h2>
            </div>
            <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
              {mapConfigs.map((map) => (
                <div 
                  key={map.id}
                  style={{
                    marginBottom: 16,
                    padding: 16,
                    background: map.id === currentMapId ? "#eff6ff" : "#f9fafb",
                    border: map.id === currentMapId ? "2px solid #2563eb" : "1px solid #e5e7eb",
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <input
                      type="text"
                      value={editingMapConfig?.id === map.id ? editingMapConfig.name : map.name}
                      onChange={(e) => {
                        if (editingMapConfig?.id === map.id) {
                          setEditingMapConfig({ ...editingMapConfig, name: e.target.value });
                        }
                      }}
                      disabled={editingMapConfig?.id !== map.id}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        border: "2px solid #e5e7eb",
                        borderRadius: 6,
                        fontSize: 14,
                        background: editingMapConfig?.id === map.id ? "white" : "#f3f4f6",
                      }}
                    />
                    {map.id === currentMapId && (
                      <span style={{ fontSize: 12, color: "#2563eb", fontWeight: 600 }}>✓ 表示中</span>
                    )}
                  </div>
                  
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {editingMapConfig?.id === map.id ? (
                      <>
                        <button
                          onClick={async () => {
                            try {
                              const MASTER_API_URL = process.env.NEXT_PUBLIC_MASTER_API_URL;
                              if (!MASTER_API_URL || !alliance) return;
                              
                              const params = new URLSearchParams({
                                action: 'updateMapConfig',
                                allianceId: alliance.allianceId,
                              });
                              
                              const res = await fetch(`${MASTER_API_URL}?${params}`, {
                                method: "POST",
                                body: JSON.stringify({
                                  mapId: editingMapConfig.id,
                                  name: editingMapConfig.name,
                                }),
                              });
                              
                              const json = await res.json();
                              if (json.ok) {
                                await loadMapConfigs();
                                setEditingMapConfig(null);
                                alert("✅ マップ名を更新しました");
                              }
                            } catch (e) {
                              console.error(e);
                              alert("❌ 更新に失敗しました");
                            }
                          }}
                          style={{
                            padding: "6px 12px",
                            fontSize: 12,
                            background: "#10b981",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                          }}
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingMapConfig(null)}
                          style={{
                            padding: "6px 12px",
                            fontSize: 12,
                            background: "#6b7280",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                          }}
                        >
                          キャンセル
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingMapConfig(map)}
                          style={{
                            padding: "6px 12px",
                            fontSize: 12,
                            background: "#2563eb",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                          }}
                        >
                          名前変更
                        </button>
                        {!map.isBase && (
                          <>
                            <button
                              onClick={async () => {
                                try {
                                  const MASTER_API_URL = process.env.NEXT_PUBLIC_MASTER_API_URL;
                                  if (!MASTER_API_URL || !alliance) return;
                                  
                                  const params = new URLSearchParams({
                                    action: 'updateMapConfig',
                                    allianceId: alliance.allianceId,
                                  });
                                  
                                  const res = await fetch(`${MASTER_API_URL}?${params}`, {
                                    method: "POST",
                                    body: JSON.stringify({
                                      mapId: map.id,
                                      isVisible: !map.isVisible,
                                    }),
                                  });
                                  
                                  const json = await res.json();
                                  if (json.ok) {
                                    await loadMapConfigs();
                                    alert(`✅ ${!map.isVisible ? "表示" : "非表示"}に設定しました`);
                                  }
                                } catch (e) {
                                  console.error(e);
                                  alert("❌ 更新に失敗しました");
                                }
                              }}
                              style={{
                                padding: "6px 12px",
                                fontSize: 12,
                                background: map.isVisible ? "#f59e0b" : "#10b981",
                                color: "white",
                                border: "none",
                                borderRadius: 4,
                                cursor: "pointer",
                              }}
                            >
                              {map.isVisible ? "非表示にする" : "表示する"}
                            </button>
                            <button
                              onClick={async () => {
                                const baseMapName = mapConfigs.find(m => m.isBase)?.name || "ベースマップ";
                                if (!confirm(`${baseMapName}の内容を「${map.name}」にコピーしますか？`)) {
                                  return;
                                }
                                
                                try {
                                  const MASTER_API_URL = process.env.NEXT_PUBLIC_MASTER_API_URL;
                                  if (!MASTER_API_URL || !alliance) return;
                                  
                                  setLoading(true);
                                  const params = new URLSearchParams({
                                    action: 'copyMap',
                                    allianceId: alliance.allianceId,
                                  });
                                  
                                  const res = await fetch(`${MASTER_API_URL}?${params}`, {
                                    method: "POST",
                                    body: JSON.stringify({
                                      targetMapId: map.id,
                                    }),
                                  });
                                  
                                  const json = await res.json();
                                  if (json.ok) {
                                    alert(`✅ ${json.copied}件のオブジェクトをコピーしました`);
                                    if (map.id === currentMapId) {
                                      await loadMap();
                                    }
                                  }
                                } catch (e) {
                                  console.error(e);
                                  alert("❌ コピーに失敗しました");
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              style={{
                                padding: "6px 12px",
                                fontSize: 12,
                                background: "#8b5cf6",
                                color: "white",
                                border: "none",
                                borderRadius: 4,
                                cursor: "pointer",
                              }}
                            >
                              ベースからコピー
                            </button>
                          </>
                        )}
                        {map.id !== currentMapId && (
                          <button
                            onClick={() => {
                              switchMap(map.id);
                              setShowMapManagement(false);
                              setEditingMapConfig(null);
                            }}
                            style={{
                              padding: "6px 12px",
                              fontSize: 12,
                              background: "#059669",
                              color: "white",
                              border: "none",
                              borderRadius: 4,
                              cursor: "pointer",
                            }}
                          >
                            このマップに切替
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  
                  {map.isBase && (
                    <div style={{ 
                      marginTop: 8, 
                      fontSize: 11, 
                      color: "#6b7280",
                      padding: "6px 10px",
                      background: "#fef3c7",
                      borderRadius: 4,
                      border: "1px solid #fcd34d",
                    }}>
                      ⭐ ベースマップ（非表示にできません）
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{
              padding: "16px 24px",
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "flex-end",
            }}>
              <button
                onClick={() => {
                  setShowMapManagement(false);
                  setEditingMapConfig(null);
                }}
                style={{
                  padding: "10px 20px",
                  fontSize: 14,
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* リンク追加・編集モーダル */}
      {(editingLink || showAddLinkModal) && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: isMobile ? "16px" : "20px",
          }}
          onClick={() => {
            setEditingLink(null);
            setShowAddLinkModal(false);
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: isMobile ? "20px" : "28px",
              maxWidth: 500,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ 
              margin: "0 0 20px 0", 
              fontSize: isMobile ? 18 : 20, 
              fontWeight: 700,
              color: "#1f2937",
              userSelect: "none",
            }}>
              {editingLink ? "リンク編集" : "リンク追加"}
            </h2>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151", userSelect: "none" }}>
                表示名（絵文字含む）
              </label>
              <input
                type="text"
                value={editingLink?.name || ""}
                onChange={(e) => {
                  if (editingLink) {
                    setEditingLink({ ...editingLink, name: e.target.value });
                  }
                }}
                placeholder="例: 🎁 交換センター"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "2px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 15,
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151", userSelect: "none" }}>
                URL
              </label>
              <input
                type="url"
                value={editingLink?.url || ""}
                onChange={(e) => {
                  if (editingLink) {
                    setEditingLink({ ...editingLink, url: e.target.value });
                  }
                }}
                placeholder="https://example.com"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "2px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 15,
                  boxSizing: "border-box",
                }}
              />
            </div>

            {!showAddLinkModal && editingLink && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
                  <input
                    type="checkbox"
                    checked={editingLink.display}
                    onChange={(e) => {
                      setEditingLink({ ...editingLink, display: e.target.checked });
                    }}
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>
                    メニューに表示する
                  </span>
                </label>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button
                onClick={() => {
                  setEditingLink(null);
                  setShowAddLinkModal(false);
                }}
                style={{
                  flex: 1,
                  padding: "11px 24px",
                  border: "2px solid #d1d5db",
                  borderRadius: 8,
                  background: "white",
                  color: "#374151",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  userSelect: "none",
                }}
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  if (!editingLink?.name || !editingLink?.url) {
                    alert("表示名とURLを入力してください");
                    return;
                  }

                  if (showAddLinkModal) {
                    // 新規追加
                    const newLink = { 
                      name: editingLink.name || "", 
                      url: editingLink.url || "", 
                      order: links.length + 1,
                      display: true  // 新規追加は常に表示
                    };
                    setLinks([...links, newLink]);
                    setHasUnsavedLinksChanges(true);
                  } else if (editingLink) {
                    // 編集
                    setLinks(links.map((link, i) => 
                      i === editingLink.index 
                        ? { name: editingLink.name, url: editingLink.url, order: link.order, display: editingLink.display }
                        : link
                    ));
                    setHasUnsavedLinksChanges(true);
                  }

                  setEditingLink(null);
                  setShowAddLinkModal(false);
                }}
                style={{
                  flex: 1,
                  padding: "11px 28px",
                  background: "#2563eb",
                  color: "white",
                  border: "2px solid #2563eb",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  userSelect: "none",
                }}
              >
                {editingLink && !showAddLinkModal ? "更新" : "追加"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* マイオブジェクト選択モーダル */}
      {showMyObjectSelector && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setShowMyObjectSelector(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: isMobile ? "16px" : "24px",
              width: isMobile ? "90%" : "500px",
              maxHeight: "80vh",
              overflow: "auto",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: isMobile ? 18 : 20 }}>
              📍 マイオブジェクト設定
            </h2>

            {/* 検索ボックス */}
            <input
              type="text"
              placeholder="オブジェクト名で検索..."
              value={myObjectSearchText}
              onChange={(e) => setMyObjectSearchText(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 14,
                marginBottom: 12,
              }}
            />

            {/* ソートボタン */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => setMyObjectSortBy('name')}
                style={{
                  flex: 1,
                  padding: "6px 12px",
                  background: myObjectSortBy === 'name' ? "#2563eb" : "#e5e7eb",
                  color: myObjectSortBy === 'name' ? "white" : "#374151",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                名前順
              </button>
              <button
                onClick={() => setMyObjectSortBy('fire')}
                style={{
                  flex: 1,
                  padding: "6px 12px",
                  background: myObjectSortBy === 'fire' ? "#2563eb" : "#e5e7eb",
                  color: myObjectSortBy === 'fire' ? "white" : "#374151",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                溶鉱炉順
              </button>
              <button
                onClick={() => setMyObjectSortBy('birthday')}
                style={{
                  flex: 1,
                  padding: "6px 12px",
                  background: myObjectSortBy === 'birthday' ? "#2563eb" : "#e5e7eb",
                  color: myObjectSortBy === 'birthday' ? "white" : "#374151",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                誕生日順
              </button>
            </div>

            {/* オブジェクトリスト */}
            <div style={{ maxHeight: "300px", overflowY: "auto", marginBottom: 16 }}>
              {(() => {
                // CITYタイプのオブジェクトのみ
                let cityObjects = objects.filter(o => o.type === 'CITY');
                
                // 検索フィルター
                if (myObjectSearchText.trim()) {
                  const search = myObjectSearchText.toLowerCase();
                  cityObjects = cityObjects.filter(o => 
                    (o.label || '').toLowerCase().includes(search) ||
                    (o.note || '').toLowerCase().includes(search)
                  );
                }
                
                // ソート
                if (myObjectSortBy === 'name') {
                  cityObjects.sort((a, b) => (a.label || '').localeCompare(b.label || ''));
                } else if (myObjectSortBy === 'fire') {
                  cityObjects.sort((a, b) => {
                    const aFire = a.Fire ? String(a.Fire).replace(/\D/g, '') : '0';
                    const bFire = b.Fire ? String(b.Fire).replace(/\D/g, '') : '0';
                    return parseInt(bFire) - parseInt(aFire);
                  });
                } else if (myObjectSortBy === 'birthday') {
                  cityObjects.sort((a, b) => {
                    const aBirthday = a.birthday || '';
                    const bBirthday = b.birthday || '';
                    return aBirthday.localeCompare(bBirthday);
                  });
                }
                
                return cityObjects.map(obj => (
                  <div
                    key={obj.id}
                    onClick={() => {
                      setMyObjectId(String(obj.id));
                      setShowMyObjectSelector(false);
                    }}
                    style={{
                      padding: "10px 12px",
                      border: myObjectId === String(obj.id) ? "2px solid #10b981" : "1px solid #e5e7eb",
                      borderRadius: 6,
                      marginBottom: 8,
                      cursor: "pointer",
                      background: myObjectId === String(obj.id) ? "#f0fdf4" : "white",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      {obj.icon} {obj.label}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      {obj.Fire && <span>🔥 {obj.Fire} </span>}
                      {obj.birthday && <span>🎂 {obj.birthday}</span>}
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* クリアボタン */}
            {myObjectId && (
              <button
                onClick={() => {
                  setMyObjectId(null);
                  setShowMyObjectSelector(false);
                }}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 12,
                }}
              >
                選択解除
              </button>
            )}

            {/* 閉じるボタン */}
            <button
              onClick={() => setShowMyObjectSelector(false)}
              style={{
                width: "100%",
                padding: "10px",
                background: "#6b7280",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* 溶鉱炉レベル集計モーダル */}
      {showFireLevelStats && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10001,
            padding: 20,
          }}
          onClick={() => setShowFireLevelStats(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: 16,
              padding: isMobile ? 20 : 30,
              maxWidth: 450,
              width: "100%",
              maxHeight: "80vh",
              overflowY: "auto",
              position: "relative",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowFireLevelStats(false)}
              style={{
                position: "absolute",
                top: 15,
                right: 15,
                background: "transparent",
                border: "none",
                fontSize: 24,
                cursor: "pointer",
                color: "#9ca3af",
                padding: 5,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
            
            <h2 style={{ 
              margin: "0 0 20px 0", 
              fontSize: isMobile ? 20 : 22, 
              fontWeight: 600,
              color: "#1f2937",
              userSelect: "none",
            }}>
              集計
            </h2>
            
            {(() => {
              const cityObjects = objects.filter(obj => obj.id && obj.label && obj.type === 'CITY');
              const stats: { [key: string]: number } = {};
              
              cityObjects.forEach(obj => {
                const fireValue = obj.Fire !== undefined && obj.Fire !== null ? String(obj.Fire).trim() : '';
                stats[fireValue] = (stats[fireValue] || 0) + 1;
              });
              
              // FC10からFC1
              const fcLevels = [];
              for (let i = 10; i >= 1; i--) {
                const key = `FC${i}`;
                if (stats[key]) {
                  fcLevels.push({ label: key, count: stats[key], isFC: true, level: i });
                }
              }
              
              // Lv30からLv21
              const highLevels = [];
              for (let i = 30; i >= 21; i--) {
                const count = stats[String(i)] || 0;
                if (count > 0) {
                  highLevels.push({ label: `Lv${i}`, count, isFC: false, level: i });
                }
              }
              
              // Lv20以下をまとめる
              let low20Count = 0;
              for (let i = 1; i <= 20; i++) {
                low20Count += stats[String(i)] || 0;
              }
              
              // 未設定（空文字と'0'）を合計
              const unsetCount = (stats[''] || 0) + (stats['0'] || 0);
              
              const allStats = [...fcLevels, ...highLevels];
              if (low20Count > 0) {
                allStats.push({ label: 'Lv20以下', count: low20Count, isFC: false, level: 0 });
              }
              if (unsetCount > 0) {
                allStats.push({ label: '未設定', count: unsetCount, isFC: false, level: -1 });
              }
              
              return (
                <div style={{ marginBottom: 20 }}>
                  {allStats.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '6px 12px',
                        borderBottom: index < allStats.length - 1 ? '1px solid #e5e7eb' : 'none',
                        gap: 12,
                      }}
                    >
                      <div style={{
                        width: 80,
                        fontWeight: 600,
                        color: '#1f2937',
                        fontSize: 15,
                      }}>
                        {item.label}
                      </div>
                      <div style={{
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {item.isFC ? (
                          <img 
                            src={`/fire-levels/FC${item.level}.webp`}
                            alt={`FC${item.level}`}
                            style={{
                              width: 22,
                              height: 22,
                              opacity: 0.9,
                            }}
                          />
                        ) : item.level > 0 ? (
                          <svg width="18" height="18" viewBox="0 0 18 18">
                            <circle cx="9" cy="9" r="9" fill="#ffffff" />
                            <circle cx="9" cy="9" r="8" fill="#4169E1" />
                            <text
                              x="9"
                              y="9"
                              textAnchor="middle"
                              dominantBaseline="central"
                              fill="#ffffff"
                              fontSize={item.level >= 10 ? "9" : "11"}
                              fontWeight="bold"
                              fontFamily="system-ui"
                            >
                              {item.level}
                            </text>
                          </svg>
                        ) : item.level === 0 ? (
                          <div style={{
                            width: 18,
                            height: 18,
                            background: '#4169E1',
                            borderRadius: '50%',
                            border: '1.5px solid #ffffff',
                          }} />
                        ) : (
                          <div style={{
                            width: 18,
                            height: 18,
                            background: '#9ca3af',
                            borderRadius: '50%',
                            border: '1.5px solid #ffffff',
                          }} />
                        )}
                      </div>
                      <div style={{
                        flex: 1,
                        textAlign: 'right',
                        fontSize: 18,
                        fontWeight: 700,
                        color: '#5b21b6',
                      }}>
                        {item.count}
                      </div>
                    </div>
                  ))}
                  
                  <div style={{
                    marginTop: 20,
                    padding: '12px',
                    background: '#f3f4f6',
                    borderRadius: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: '#1f2937',
                    }}>
                      合計
                    </div>
                    <div style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: '#5b21b6',
                    }}>
                      {cityObjects.length}
                    </div>
                  </div>
                </div>
              );
            })()}
            
            <button
              onClick={() => setShowFireLevelStats(false)}
              style={{
                width: "100%",
                padding: "12px",
                background: "#6b7280",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
        {isEditMode
          ? "編集モード：ドラッグで移動／ダブルクリックで編集／Ctrl+クリックで新規追加"
          : "操作：ドラッグで移動（パン）／ピンチでズーム／タップで選択（リング表示）／文字は水平固定"}
      </div>
      
      <style jsx global>{`
        @keyframes snowflakeAnimation {
          0% {
            transform: rotate(0deg) scale(0.8);
            opacity: 0.7;
          }
          25% {
            transform: rotate(90deg) scale(1.1);
            opacity: 0.9;
          }
          50% {
            transform: rotate(180deg) scale(0.8);
            opacity: 1;
          }
          75% {
            transform: rotate(270deg) scale(1.1);
            opacity: 0.9;
          }
          100% {
            transform: rotate(360deg) scale(0.8);
            opacity: 0.7;
          }
        }
      `}</style>
    </main>
    </>
  );
}

