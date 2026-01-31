# Google OAuth 2.0 セットアップガイド

このガイドでは、Google Sign-Inを設定する手順を説明します。

## 📋 前提条件

- Googleアカウント
- Google Cloud Consoleへのアクセス権限

## ステップ1: Google Cloud Projectの作成

### 1.1 Google Cloud Consoleにアクセス

[https://console.cloud.google.com/](https://console.cloud.google.com/)

### 1.2 新しいプロジェクトを作成

1. 画面上部の「プロジェクトを選択」をクリック
2. 「新しいプロジェクト」をクリック
3. プロジェクト名を入力（例: `wos-map-manager`）
4. 「作成」をクリック

### 1.3 プロジェクトを選択

作成したプロジェクトを選択します。

## ステップ2: OAuth同意画面の設定

### 2.1 OAuth同意画面に移動

1. 左メニューから「APIとサービス」→「OAuth同意画面」を選択

### 2.2 ユーザータイプを選択

- **外部**を選択
- 「作成」をクリック

### 2.3 アプリ情報を入力

**必須項目:**
- アプリ名: `WOS Map Manager`
- ユーザーサポートメール: あなたのメールアドレス
- デベロッパーの連絡先情報: あなたのメールアドレス

**省略可能:**
- アプリのロゴ
- アプリのホームページ
- アプリのプライバシーポリシー
- アプリの利用規約

「保存して次へ」をクリック

### 2.4 スコープ

デフォルトのままで「保存して次へ」

### 2.5 テストユーザー（開発中のみ）

開発中は自分のメールアドレスを追加:
- 「ユーザーを追加」をクリック
- 自分のGmailアドレスを入力
- 「保存して次へ」

### 2.6 確認

「ダッシュボードに戻る」をクリック

## ステップ3: OAuth 2.0クライアントIDの作成

### 3.1 認証情報ページに移動

左メニューから「APIとサービス」→「認証情報」

### 3.2 認証情報を作成

1. 「認証情報を作成」→「OAuth クライアント ID」
2. アプリケーションの種類: **ウェブアプリケーション**
3. 名前: `WOS Map Web Client`

### 3.3 承認済みのJavaScript生成元を追加 ⚠️ 重要

**開発環境:**
```
http://localhost:3000
```

**本番環境（GitHub Pages）:**
```
https://YOUR_USERNAME.github.io
```

⚠️ **このステップが最重要です！** JavaScript生成元を登録しないと「Error 401: invalid_client」が発生します。

### 3.4 承認済みのリダイレクトURIを追加（オプション）

**開発環境:**
```
http://localhost:3000
```

**本番環境（GitHub Pages）:**
```
https://YOUR_USERNAME.github.io/wos-map
```

**注意**: `@react-oauth/google`を使う場合、リダイレクトURIは通常不要です。JavaScript生成元のみで動作します。

### 3.4 クライアントIDとシークレットをコピー

作成完了後、以下が表示されます:
- **クライアントID**: `xxxxx.apps.googleusercontent.com`
- **クライアントシークレット**: `GOCSPX-xxxxx`

**これらを安全に保管してください！**

## ステップ4: Next.jsアプリの設定

### 4.1 必要なパッケージをインストール

```bash
npm install @react-oauth/google jwt-decode
```

### 4.2 環境変数の設定

プロジェクトルートに `.env.local` を作成:

```bash
# Google OAuth 2.0
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com

# マスターAPI（既存）
NEXT_PUBLIC_MASTER_API_URL=https://script.google.com/macros/s/ABC...XYZ/exec
```

⚠️ **重要**: `.env.local` は `.gitignore` に含まれているため、Gitにコミットされません。

### 4.3 本番環境の環境変数

GitHub Pagesは環境変数をサポートしていないため、ビルド時に埋め込む必要があります。

`next.config.ts` に追加:

```typescript
const nextConfig: NextConfig = {
  // ... 既存の設定
  env: {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_MASTER_API_URL: process.env.NEXT_PUBLIC_MASTER_API_URL,
  },
};
```

## ステップ5: アプリケーションの公開準備

### 5.1 OAuth同意画面を公開状態にする（本番時）

開発中は「テスト」状態で問題ありませんが、本番公開時には:

1. OAuth同意画面に戻る
2. 「アプリを公開」をクリック
3. 確認して公開

**注意**: 公開すると誰でもログインできるようになります。

## 🔒 セキュリティのベストプラクティス

### 開発環境と本番環境を分ける

**推奨**: 開発用と本番用で別々のOAuth 2.0クライアントIDを作成

- 開発用: `localhost` のみ
- 本番用: `github.io` のみ

### クライアントシークレットの管理

- **.env.local** に保存（Gitにコミットしない）
- **GitHub Secrets** に保存（GitHub Actionsを使う場合）
- **絶対に公開リポジトリにコミットしない**

## 🧪 テスト

### ローカルでテスト

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開き、Googleログインボタンをクリック

### 動作確認

1. Googleログイン画面が表示される
2. アカウントを選択
3. 権限を承認
4. アプリにリダイレクトされる
5. ユーザー情報が取得できる

## 🐛 トラブルシューティング

### エラー: redirect_uri_mismatch

**原因**: リダイレクトURIが登録されていない

**解決策**:
1. Google Cloud Consoleで認証情報を確認
2. 使用しているURLが「承認済みのリダイレクトURI」に含まれているか確認
3. URLは完全一致する必要があります（末尾の `/` も含む）

### エラー: Access blocked: This app's request is invalid

**原因**: OAuth同意画面の設定が不完全

**解決策**:
1. OAuth同意画面で必須項目を全て入力
2. 開発中は「テストユーザー」に自分を追加

### エラー: idpiframe_initialization_failed

**原因**: クッキーがブロックされている

**解決策**:
1. ブラウザのサードパーティCookieを許可
2. シークレットモードでは動作しない場合があります

## 📚 参考リンク

- [Google Identity Services](https://developers.google.com/identity/gsi/web/guides/overview)
- [OAuth 2.0 for Web Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [@react-oauth/google Documentation](https://github.com/MomenSherif/react-oauth)

---

**次のステップ**: Google認証コンポーネントの実装
