# 🚀 マルチテナント版セットアップガイド

このガイドでは、WOS Map Managerをマルチテナント対応版として稼働させるための手順を説明します。

## 📋 前提条件

- Googleアカウント
- GitHubアカウント
- Node.js 18以上がインストール済み

## ステップ1: マスタースプレッドシートの作成

### 1.1 新しいスプレッドシートを作成

1. [Google Sheets](https://sheets.google.com)にアクセス
2. 「空白」をクリックして新しいスプレッドシートを作成
3. シート名を「alliances」に変更
4. スプレッドシート名を「WOS Map Master」などに設定

### 1.2 alliancesシートの設定

A1セルから以下のヘッダーを入力:

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| allianceId | allianceName | serverNumber | spreadsheetId | ownerEmail | editPasswordHash | createdAt | updatedAt | isActive |

### 1.3 スプレッドシートIDをメモ

URLから取得:1NEh2yL6enlyH_yFIMsvIK6kZQRPJFTNzvASpeeg3_FE
```
https://docs.google.com/spreadsheets/d/【ここがスプレッドシートID】/edit
```

例: `1AbC2DeFgHiJkLmNoPqRsTuVwXyZ0123456789`

## ステップ2: テンプレートスプレッドシートの準備

### 2.1 既存スプレッドシートを使用する場合

現在使用している `1E3snSo7vzpdcTLkRqJFDlgDK3GZ3IuJYehspN95AgvQ` をテンプレートとして使用できます。

### 2.2 新規作成する場合

1. 新しいスプレッドシートを作成
2. 以下のシートを作成:
   - **meta**: マップメタ情報（key-valueペア）
   - **map_config**: マップ設定
   - **objects**: メインマップのオブジェクト
   - **objects_map2〜5**: サブマップ（オプション）
   - **LINK**: リンク情報（オプション）

## ステップ3: マスターGASスクリプトのデプロイ

### 3.1 Apps Scriptを開く

1. マスタースプレッドシートを開く
2. 「拡張機能」→「Apps Script」をクリック

### 3.2 スクリプトをコピー

1. `scripts/MasterCode.gs` の内容を全てコピー
2. Apps Scriptエディタに貼り付け

### 3.3 設定を変更

```javascript
const MASTER_SPREADSHEET_ID = "YOUR_MASTER_SPREADSHEET_ID"; // ステップ1.3でメモしたID
const TEMPLATE_SPREADSHEET_ID = "1E3snSo7vzpdcTLkRqJFDlgDK3GZ3IuJYehspN95AgvQ"; // テンプレートID
```

### 3.4 デプロイ

1. 「デプロイ」→「新しいデプロイ」をクリック
2. 「種類の選択」→「ウェブアプリ」を選択
3. 設定:
   - 説明: `WOS Map Master API`
   - 次のユーザーとして実行: **自分**
   - アクセスできるユーザー: **全員**
4. 「デプロイ」をクリック
5. 権限の承認を行う
6. **デプロイURL**をコピー（重要！）

例: `https://script.google.com/macros/s/ABC...XYZ/exec`

## ステップ4: テンプレートスプレッドシートの設定

### 4.1 Apps Scriptを開く

テンプレートスプレッドシートで「拡張機能」→「Apps Script」

### 4.2 スクリプトをコピー

`scripts/AllianceCode.gs` の内容をコピー&貼り付け

### 4.3 デプロイ

マスターと同様の手順でデプロイ（このURLは直接使用しませんが、テンプレートとして必要）

## ステップ5: Next.jsアプリの設定

### 5.1 環境変数の設定

プロジェクトルートに `.env.local` を作成:

```bash
NEXT_PUBLIC_MASTER_API_URL=https://script.google.com/macros/s/ABC...XYZ/exec
```

※ステップ3.4でコピーしたURLを使用

### 5.2 next.config.tsの確認

リポジトリ名を確認し、必要に応じて変更:

```typescript
basePath: isProd ? '/wos-map' : '',  // GitHubリポジトリ名に合わせる
```

### 5.3 package.jsonの確認

デプロイスクリプトのリポジトリURLを確認:

```json
"deploy": "gh-pages -d out --dotfiles"
```

## ステップ6: ローカルでテスト

### 6.1 依存関係のインストール

```bash
npm install
```

### 6.2 開発サーバー起動

```bash
npm run dev
```

### 6.3 ブラウザで確認

```
http://localhost:3000
```

### 6.4 テスト手順

1. トップページが表示されることを確認
2. 「新しい同盟を登録」をクリック
3. テスト情報を入力:
   - 同盟名: `テスト同盟`
   - サーバー番号: `999`
   - メール: `test@example.com`
   - パスワード: `test1234`
4. 登録実行
5. 成功すると同盟ページにリダイレクト
6. マスタースプレッドシートに同盟情報が追加されているか確認

## ステップ7: GitHub Pagesにデプロイ

### 7.1 GitHubリポジトリの作成

1. GitHubで新しいリポジトリを作成（例: `wos-map`）
2. リポジトリをクローン:

```bash
git clone https://github.com/YOUR_USERNAME/wos-map.git
cd wos-map
```

### 7.2 コードをプッシュ

```bash
git add .
git commit -m "Initial commit - Multi-tenant version"
git push origin main
```

### 7.3 ビルドとデプロイ

```bash
npm run build
npm run deploy
```

### 7.4 GitHub Pagesの設定

1. GitHubリポジトリの「Settings」→「Pages」
2. Source: `gh-pages` ブランチを選択
3. 「Save」をクリック
4. 数分後、URLが表示されます:
   ```
   https://YOUR_USERNAME.github.io/wos-map/
   ```

## ステップ8: 本番環境の確認

### 8.1 デプロイされたサイトにアクセス

```
https://YOUR_USERNAME.github.io/wos-map/
```

### 8.2 動作確認

1. トップページが表示される
2. 同盟登録が正常に動作する
3. 登録した同盟のマップページにアクセスできる

## 🔧 トラブルシューティング

### 問題: GASスクリプトへのアクセスエラー

**解決策**:
- GASスクリプトのデプロイ設定を確認
- 「アクセスできるユーザー」が「全員」になっているか確認
- ブラウザのコンソールでCORSエラーがないか確認

### 問題: 同盟登録が失敗する

**解決策**:
- `.env.local` のURLが正しいか確認
- マスタースプレッドシートのIDが正しいか確認
- Apps Scriptの実行ログを確認（「実行」→「実行ログ」）

### 問題: GitHub Pagesで404エラー

**解決策**:
- `next.config.ts` の `basePath` がリポジトリ名と一致しているか確認
- `gh-pages` ブランチが作成されているか確認
- GitHub Pagesの設定でブランチが正しく選択されているか確認

### 問題: 環境変数が読み込まれない

**解決策**:
- `.env.local` ファイルがプロジェクトルートにあるか確認
- 環境変数名が `NEXT_PUBLIC_` で始まっているか確認
- 開発サーバーを再起動

## 📚 次のステップ

1. **既存マップコンポーネントの統合**
   - `page.tsx` の既存コードを `alliance/[allianceId]/page.tsx` に統合
   - マップビューア機能を追加

2. **アニメーション機能の整理**
   - 不要なアニメーションを削除
   - 誕生日表示のみ残す

3. **UIの改善**
   - レスポンシブデザインの強化
   - エラーメッセージの改善
   - ローディング状態の表示

4. **セキュリティ強化**
   - より強力なパスワードハッシュアルゴリズムの導入
   - レート制限の実装

## 💡 ヒント

- **テスト環境**: 本番デプロイ前に、別のGitHubリポジトリでテストすることをお勧めします
- **バックアップ**: マスタースプレッドシートの定期的なバックアップを取りましょう
- **モニタリング**: Apps Scriptの実行ログを定期的に確認しましょう

---

**セットアップ完了後は、README_MULTITENANT.mdを参照してアプリの使い方を確認してください。**
