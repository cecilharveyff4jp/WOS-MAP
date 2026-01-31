# マルチテナント対応設計書

## 概要
ホワイトアウトサバイバルの同盟マップ管理アプリを、複数の同盟が利用できるマルチテナントシステムに改修します。

## システムアーキテクチャ

### 1. データベース構造

#### マスタースプレッドシート
同盟情報を一元管理する中央データベース

**シート: alliances**
| フィールド | 型 | 説明 |
|-----------|-----|------|
| allianceId | string | 同盟の一意識別子（UUID） |
| allianceName | string | 同盟名 |
| serverNumber | string | サーバー番号 |
| spreadsheetId | string | 同盟専用スプレッドシートID |
| ownerEmail | string | マップ責任者のメールアドレス |
| editPassword | string | 編集用パスワード（ハッシュ化） |
| createdAt | datetime | 作成日時 |
| updatedAt | datetime | 更新日時 |
| isActive | boolean | 有効/無効フラグ |

#### 各同盟専用スプレッドシート
既存の構造を維持（各同盟ごとに1つのスプレッドシート）

**シート構成:**
- meta: マップメタ情報
- map_config: マップ設定（最大5マップ）
- objects: メインマップのオブジェクト
- objects_map2〜5: サブマップのオブジェクト
- LINK: リンク情報

### 2. URL設計

```
/ - ランディングページ（同盟登録・ログイン）
/alliance/[allianceId] - 同盟マップ閲覧（公開）
/alliance/[allianceId]/edit - マップ編集（パスワード認証必要）
/alliance/new - 新規同盟登録
/alliance/[allianceId]/settings - 同盟設定（責任者のみ）
```

### 3. 認証フロー

#### 新規同盟登録フロー
1. ユーザーが `/alliance/new` にアクセス
2. 同盟情報を入力（同盟名、サーバー番号、責任者メール、編集パスワード）
3. システムが以下を実行:
   - 新しいスプレッドシートを自動作成
   - マスターDBに同盟情報を登録
   - 一意のallianceIdを生成
4. 同盟専用URL（`/alliance/[allianceId]`）を発行

#### 閲覧フロー
1. ユーザーが `/alliance/[allianceId]` にアクセス
2. allianceIdの有効性をチェック
3. 該当する同盟のマップを表示（認証不要）

#### 編集フロー
1. ユーザーが編集ボタンをクリック
2. パスワード入力モーダル表示
3. パスワード検証（GAS経由）
4. 成功時、編集モードに移行

### 4. GAS API エンドポイント

#### マスター管理API（新規作成: MasterCode.gs）

```javascript
// POST /master - 新規同盟登録
{
  action: 'createAlliance',
  allianceName: string,
  serverNumber: string,
  ownerEmail: string,
  editPassword: string
}
→ { ok: true, allianceId: string, spreadsheetId: string }

// GET /master - 同盟情報取得
{
  action: 'getAlliance',
  allianceId: string
}
→ { ok: true, alliance: {...} }

// POST /master - パスワード検証
{
  action: 'verifyPassword',
  allianceId: string,
  password: string
}
→ { ok: true, isValid: boolean }

// POST /master - 同盟設定更新
{
  action: 'updateAlliance',
  allianceId: string,
  password: string,
  updates: {...}
}
→ { ok: true }
```

#### 同盟マップAPI（既存Code.gsを拡張）

既存のAPIを維持しつつ、allianceId/spreadsheetIdベースでアクセス

```javascript
// GET - マップデータ取得
{
  action: 'getMap',
  spreadsheetId: string,
  mapId: string
}

// POST - マップデータ保存
{
  action: 'saveMap',
  spreadsheetId: string,
  mapId: string,
  password: string,
  objects: [...]
}
```

### 5. フロントエンド構造

```
src/app/
  ├── page.tsx              # ランディングページ
  ├── alliance/
  │   ├── new/
  │   │   └── page.tsx      # 新規同盟登録
  │   └── [allianceId]/
  │       ├── page.tsx      # マップ閲覧
  │       ├── edit/
  │       │   └── page.tsx  # マップ編集
  │       └── settings/
  │           └── page.tsx  # 同盟設定
  ├── components/
  │   ├── auth/
  │   │   ├── PasswordModal.tsx
  │   │   └── AllianceForm.tsx
  │   ├── map/
  │   │   ├── MapCanvas.tsx       # 既存のマップコンポーネント
  │   │   └── MapControls.tsx
  │   └── shared/
  │       └── Header.tsx
  └── lib/
      ├── api.ts            # API通信ユーティリティ
      ├── auth.ts           # 認証ユーティリティ
      └── storage.ts        # ローカルストレージ管理
```

### 6. セキュリティ対策

1. **パスワード保護**
   - 編集パスワードはハッシュ化してスプレッドシートに保存
   - bcryptまたは同等のハッシュ関数を使用

2. **CORS設定**
   - GASで適切なCORSヘッダーを設定

3. **レート制限**
   - 同一IPからの連続リクエストを制限

4. **データ検証**
   - 全ての入力をサーバーサイドで検証

### 7. 機能のシンプル化

#### 削除するアニメーション
以下のアニメーションを削除し、コードをシンプルに:
- クイズ関連（魚、四字熟語、英語、筋肉、映画、ラーメン、遺産、スイーツ）
- おみくじ
- 花火、桜、流星、オーロラ、雪など季節系
- その他エフェクト系アニメーション

#### 保持する機能
- 誕生日表示（シンプルなアイコン表示のみ）
- 基本的なマップ操作（ズーム、パン、編集）
- マップ切り替え（最大5マップ）
- リンク管理
- お気に入り機能

### 8. 開発フェーズ

#### Phase 1: 基盤構築
- [x] 設計書作成
- [ ] 型定義の拡張
- [ ] GASマスター管理スクリプト作成

#### Phase 2: 認証システム
- [ ] パスワード認証実装
- [ ] 認証コンポーネント作成

#### Phase 3: マルチテナント化
- [ ] 動的ルーティング実装
- [ ] 同盟登録フロー実装
- [ ] マップAPI統合

#### Phase 4: 最適化
- [ ] 不要なアニメーション削除
- [ ] UIシンプル化
- [ ] パフォーマンス最適化

#### Phase 5: デプロイ
- [ ] GitHub Pages設定
- [ ] 環境変数設定
- [ ] ドキュメント整備

## マイグレーション計画

### 既存データの移行
現在の単一同盟のデータを新システムに移行する手順:

1. マスタースプレッドシートを作成
2. 既存のスプレッドシートIDを登録
3. 既存の同盟に一意のallianceIdを割り当て
4. 既存のEDIT_PAスワードを新システムに登録

### 後方互換性
- 既存のスプレッドシート構造は変更なし
- 既存のGAS APIは拡張のみ（破壊的変更なし）

## 制限事項

1. **同盟数**: 特に制限なし（マスタースプレッドシートの行数制限まで）
2. **マップ数**: 各同盟あたり最大5マップ
3. **同時編集**: サポートなし（最後の保存が優先）
4. **ファイルサイズ**: スプレッドシートの制限に準拠

## 今後の拡張可能性

1. Google OAuth 2.0統合（現在はパスワード認証のみ）
2. 同盟間のコラボレーション機能
3. モバイルアプリ対応
4. リアルタイム同期（Firestore等）
5. 分析ダッシュボード

---

**作成日**: 2026-01-29
**バージョン**: 1.0
