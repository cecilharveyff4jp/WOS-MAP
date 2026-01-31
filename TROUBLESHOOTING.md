# Google OAuth エラー解決ガイド

## エラー: 401 invalid_client - no registered origin

### 原因
Google Cloud Consoleで「承認済みのJavaScript生成元」が正しく設定されていない

### 解決手順

#### Step 1: Google Cloud Console設定確認

1. https://console.cloud.google.com/apis/credentials にアクセス
2. 「OAuth 2.0 クライアントID」セクションで作成したクライアントをクリック
3. **承認済みのJavaScript生成元**に以下が含まれているか確認:
   ```
   http://localhost:3000
   ```
4. なければ「URIを追加」で追加して**保存**
5. **重要**: 保存後5〜10分待つ（Googleの設定反映に時間がかかります）

#### Step 2: 完全なブラウザキャッシュクリア

**Chrome/Edge:**
1. `Ctrl + Shift + Delete` でキャッシュクリアダイアログを開く
2. 期間: **全期間**
3. チェック項目:
   - ✅ Cookie と他のサイトデータ
   - ✅ キャッシュされた画像とファイル
4. 「データを削除」をクリック
5. **ブラウザを完全に閉じて再起動**

#### Step 3: 開発サーバー再起動

```bash
# 既存のプロセスを停止
Get-Process node | Where-Object {$_.Path -like "*Next.js*"} | Stop-Process -Force

# 開発サーバーを再起動
npm run dev
```

#### Step 4: 再テスト

1. http://localhost:3000 を開く
2. 「Googleでログイン」ボタンをクリック
3. Googleアカウントを選択

### まだエラーが出る場合

#### クライアントIDの再確認

1. `.env.local` ファイルを開く
2. `NEXT_PUBLIC_GOOGLE_CLIENT_ID` の値を確認
3. Google Cloud Consoleの「クライアントID」と一致しているか確認
4. 一致していなければコピー&ペーストで修正

#### OAuth同意画面の確認

1. https://console.cloud.google.com/apis/credentials/consent にアクセス
2. 「テストユーザー」にあなたのGmailアドレスが追加されているか確認
3. なければ「ユーザーを追加」で追加

#### 新しいクライアントIDを作成

既存の設定がうまくいかない場合、新しいクライアントIDを作成:

1. https://console.cloud.google.com/apis/credentials
2. 「認証情報を作成」→「OAuth クライアント ID」
3. アプリケーションの種類: **ウェブアプリケーション**
4. 名前: `WOS Map Local Dev`
5. **承認済みのJavaScript生成元**:
   ```
   http://localhost:3000
   ```
6. **承認済みのリダイレクトURI**: （空白のまま）
7. 「作成」をクリック
8. 表示されたクライアントIDをコピー
9. `.env.local` の `NEXT_PUBLIC_GOOGLE_CLIENT_ID` を新しい値に置き換え
10. 開発サーバーを再起動

### デバッグ情報の確認

ブラウザの開発者ツールで詳細を確認:

1. `F12` で開発者ツールを開く
2. **Console**タブでエラーメッセージを確認
3. **Network**タブで失敗したリクエストを確認

よくあるエラーメッセージ:
- `no registered origin` → JavaScript生成元が未登録
- `redirect_uri_mismatch` → リダイレクトURIの問題（通常無視可能）
- `invalid_client` → クライアントIDが間違っている

### それでも解決しない場合

以下の情報を確認してください:

1. `.env.local` のクライアントID（最初の部分のみ）
2. Google Cloud Consoleに登録されているJavaScript生成元の一覧
3. ブラウザのコンソールに表示されているエラーの全文

これらの情報があれば、より具体的なサポートが可能です。
