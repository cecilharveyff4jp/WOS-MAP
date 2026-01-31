# WOS Map Manager - マルチテナント対応版

ホワイトアウトサバイバルの同盟マップを管理・共有するためのWebアプリケーション（マルチテナント版）

## 🌟 主な機能

- 🔐 **簡単な認証システム** - パスワードベースの編集権限管理
- 🏢 **マルチテナント対応** - 複数の同盟が独立してマップを管理
- 🗺️ **複数マップ管理** - 各同盟で最大5つのマップを作成可能
- 🔗 **簡単共有** - URLで簡単にマップを共有
- 📊 **スプレッドシート連携** - Google Sheetsをデータベースとして使用

## 🏗️ アーキテクチャ

```
┌─────────────────────────────────────────┐
│ フロントエンド (Next.js)                │
│ ・React 19 + TypeScript                 │
│ ・動的ルーティング (/alliance/[id])     │
│ ・GitHub Pages デプロイ                 │
└─────────────────────────────────────────┘
                 ↕
┌─────────────────────────────────────────┐
│ バックエンド (Google Apps Script)       │
│ ・MasterCode.gs: 同盟管理                │
│ ・AllianceCode.gs: マップデータ管理      │
└─────────────────────────────────────────┘
                 ↕
┌─────────────────────────────────────────┐
│ データベース (Google Spreadsheet)        │
│ ・マスターシート: 同盟情報管理            │
│ ・各同盟専用シート: マップデータ          │
└─────────────────────────────────────────┘
```

## 📦 技術スタック

- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: Google Apps Script (GAS)
- **Database**: Google Spreadsheet
- **Hosting**: GitHub Pages
- **Styling**: Inline CSS (シンプル化のため)

## 🚀 セットアップ手順

### 1. マスタースプレッドシートの作成

1. Google Sheetsで新しいスプレッドシートを作成
2. シート名を「alliances」に変更
3. 以下のヘッダー行を追加:
   ```
   allianceId | allianceName | serverNumber | spreadsheetId | ownerEmail | editPasswordHash | createdAt | updatedAt | isActive
   ```

### 2. マスターGASスクリプトのデプロイ

1. マスタースプレッドシートで「拡張機能」→「Apps Script」を開く
2. `scripts/MasterCode.gs` の内容をコピー&ペースト
3. `MASTER_SPREADSHEET_ID` を実際のスプレッドシートIDに変更
4. `TEMPLATE_SPREADSHEET_ID` をテンプレート用スプレッドシートIDに変更
5. デプロイ:
   - 「デプロイ」→「新しいデプロイ」
   - 種類: Webアプリ
   - 実行ユーザー: 自分
   - アクセス: 全員
6. デプロイURLをコピー

### 3. テンプレートスプレッドシートの準備

1. 既存の `Code.gs` を使用しているスプレッドシートをテンプレートとして使用
2. または新規作成して `scripts/AllianceCode.gs` をデプロイ

### 4. Next.jsアプリの設定

1. リポジトリをクローン:
   ```bash
   git clone <repository-url>
   cd wos-map
   ```

2. 依存関係のインストール:
   ```bash
   npm install
   ```

3. 環境変数の設定:
   プロジェクトルートに `.env.local` を作成:
   ```
   NEXT_PUBLIC_MASTER_API_URL=<マスターGASのデプロイURL>
   ```

4. 開発サーバーの起動:
   ```bash
   npm run dev
   ```

5. ブラウザで `http://localhost:3000` を開く

### 5. GitHub Pagesへのデプロイ

1. `next.config.ts` の `basePath` を自分のリポジトリ名に変更

2. ビルド:
   ```bash
   npm run build
   ```

3. GitHub Pagesにデプロイ:
   ```bash
   npm run deploy
   ```

## 📖 使い方

### 新規同盟の登録

1. トップページで「新しい同盟を登録」をクリック
2. 必要情報を入力:
   - 同盟名
   - サーバー番号
   - 責任者メールアドレス
   - 編集用パスワード（4文字以上）
3. 「同盟を登録する」をクリック
4. 自動で同盟専用URLにリダイレクト

### マップの閲覧

- 同盟URL (`/alliance/[allianceId]`) にアクセス
- URLを知っている人は誰でも閲覧可能
- 認証不要

### マップの編集

1. マップページで「マップを編集」をクリック
2. 編集パスワードを入力
3. 認証成功後、編集モードに移行
4. 変更を保存

## 📁 プロジェクト構造

```
wos-map/
├── scripts/
│   ├── MasterCode.gs          # マスター管理GAS
│   ├── AllianceCode.gs        # マップデータ管理GAS
│   └── Code.gs                # 既存のスクリプト（廃止予定）
├── src/app/
│   ├── alliance/
│   │   ├── new/
│   │   │   └── page.tsx       # 新規同盟登録
│   │   └── [allianceId]/
│   │       └── page.tsx       # マップ閲覧/編集
│   ├── components/
│   │   └── auth/
│   │       ├── AllianceForm.tsx
│   │       └── PasswordModal.tsx
│   ├── lib/
│   │   ├── api.ts             # API通信
│   │   ├── auth.ts            # 認証管理
│   │   └── storage.ts         # ローカルストレージ
│   ├── types.ts               # 型定義
│   ├── page.tsx               # ランディングページ
│   └── layout.tsx
├── MULTI_TENANT_DESIGN.md     # 設計書
├── next.config.ts
├── package.json
└── README.md
```

## 🔒 セキュリティ

- **パスワードハッシュ化**: 編集パスワードはハッシュ化して保存
- **クライアントサイド認証**: ローカルストレージでセッション管理（24時間有効）
- **閲覧制限なし**: URLを知っている人は誰でも閲覧可能（意図的な設計）
- **編集制限あり**: パスワードを知っている人のみ編集可能

## 🎯 今後の開発予定

### Phase 1: 基本機能（完了）
- ✅ マルチテナント設計
- ✅ 型定義
- ✅ GASスクリプト作成
- ✅ 認証システム
- ✅ 動的ルーティング
- ✅ 基本UI

### Phase 2: マップビューア（次のステップ）
- [ ] 既存のマップコンポーネントの統合
- [ ] ズーム・パン機能
- [ ] オブジェクト配置・編集
- [ ] マップ切り替え機能

### Phase 3: 機能拡張
- [ ] アニメーション削減（誕生日のみ保持）
- [ ] UIのシンプル化
- [ ] パフォーマンス最適化
- [ ] エラーハンドリング強化

### Phase 4: 将来的な拡張
- [ ] Google OAuth 2.0統合
- [ ] リアルタイム同期
- [ ] モバイル対応強化
- [ ] 分析ダッシュボード

## 📝 ライセンス

MIT License

## 👥 コントリビューション

Pull Requestを歓迎します！

## 🐛 バグ報告

Issuesセクションでバグを報告してください。

---

**作成日**: 2026-01-29  
**バージョン**: 2.0.0（マルチテナント対応版）
