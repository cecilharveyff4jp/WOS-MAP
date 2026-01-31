// 型定義
export type Meta = { 
  cols?: number; 
  rows?: number; 
  cellSize?: number; 
  mapName?: string;
  bgImage?: string;
  bgCenterX?: number;
  bgCenterY?: number;
  bgScale?: number;
  bgOpacity?: number;
};

export type MapConfig = {
  id: string;           // 'object', 'map2', 'map3', 'map4', 'map5'
  name: string;         // 表示名
  sheetName: string;    // スプレッドシートのシート名
  isVisible: boolean;   // 表示/非表示
  isBase: boolean;      // ベースマップかどうか
  order: number;        // 表示順序
};

export type BgConfig = {
  image: string;  // 画像ファイル名
  centerX: number;  // 中心点X (%)
  centerY: number;  // 中心点Y (%)
  scale: number;  // 拡大率
  opacity: number;  // 透明度 (0-1)
};

export type Obj = {
  id?: string;
  type?: string;
  label?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  birthday?: string;
  isFavorite?: boolean;
  note?: string;
  Animation?: string;
  Fire?: string | number;
};

export type SoldierAnimation = {
  id: string;
  bearTrap: Obj;
  cities: Obj[];
  startTime: number;
  damages: Array<{ damage: number; isCritical: boolean }>;
  totalDamage: number;
};

export type Camera = {
  tx: number;
  ty: number;
  scale: number;
};

export const FALLBACK = { cols: 60, rows: 40, cellSize: 24 };

// マルチテナント対応の型定義（Google OAuth版）

// ユーザー型
export type User = {
  userId: string;              // Google UID
  googleEmail: string;         // Googleメールアドレス
  displayName: string;         // 表示名
  photoURL?: string;           // プロフィール画像URL
  createdAt: string;           // 作成日時（ISO 8601形式）
  lastLogin: string;           // 最終ログイン日時
};

// 同盟型（Google OAuth版）
export type Alliance = {
  allianceId: string;          // 同盟の一意識別子（UUID）
  userId: string;              // 所有者のGoogle UID
  allianceName: string;        // 同盟名
  serverNumber: string;        // サーバー番号
  spreadsheetId: string;       // 同盟専用スプレッドシートID
  editPassword?: string;       // 編集用パスワード（平文、オプション）
  createdAt: string;           // 作成日時（ISO 8601形式）
  updatedAt: string;           // 更新日時（ISO 8601形式）
  isActive: boolean;           // 有効/無効フラグ
};

// Google認証セッション
export type AuthSession = {
  user: User;                  // ログインユーザー情報
  idToken: string;             // Google ID Token
  expiresAt: number;           // セッション有効期限（タイムスタンプ）
};
// Google OAuth版の同盟作成リクエスト
export type CreateAllianceRequest = {
  userId: string;              // Google UID
  allianceName: string;
  serverNumber: string;
  editPassword?: string;       // オプション（設定しない場合もある）olean;  // 編集権限の有無
  expiresAt: number;           // セッション有効期限（タイムスタンプ）
};

export type CreateAllianceRequest = {
  allianceName: string;
  serverNumber: string;
  ownerEmail: string;
  editPassword: string;
};

export type CreateAllianceResponse = {
  ok: boolean;
  allianceId?: string;
  spreadsheetId?: string;
  error?: string;
};

export type VerifyPasswordRequest = {
  allianceId: string;
  password: string;
};

export type VerifyPasswordResponse = {
  ok: boolean;
  isValid: boolean;
  error?: string;
};

export type GetAllianceRequest = {
  allianceId: string;
};

export type GetAllianceResponse = {
  ok: boolean;
  alliance?: Alliance;
  

// ユーザーの同盟一覧取得レスポンス
export type GetUserAlliancesResponse = {
  ok: boolean;
  alliances?: Alliance[];
  error?: string;
};

// ユーザー登録/取得リクエスト
export type UpsertUserRequest = {
  userId: string;
  googleEmail: string;
  displayName: string;
  photoURL?: string;
};

// 同盟更新リクエスト
export type UpdateAllianceRequest = {
  allianceId: string;
  userId: string;              // 所有者確認用
  allianceName?: string;
  serverNumber?: string;
  editPassword?: string;       // 新しいパスワード（オプション）
};error?: string;
};
