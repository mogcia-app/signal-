# Firestore Security Rules テストガイド

Firestore Security Rulesを変更した後、必ずテストを行ってください。

## 🎯 テスト方法

### 方法1: Firebase Console のルールプレイグラウンド（推奨・最も簡単）

1. **Firebase Consoleにアクセス**
   - https://console.firebase.google.com/project/signal-v1-fc481/firestore/rules

2. **ルールプレイグラウンドを開く**
   - ルールエディタの右上にある「ルールプレイグラウンド」ボタンをクリック

3. **テストシナリオを実行**

#### テストケース1: ユーザーが自分のドキュメントを読み取れる
```
場所: /users/{userId}
操作: get
認証: 有効
ユーザーID: user123
ドキュメントID: user123
ドキュメントデータ: { userId: "user123", name: "Test User", status: "active" }
```
**期待結果**: ✅ 許可される

#### テストケース2: ユーザーが他人のドキュメントを読み取れない
```
場所: /users/{userId}
操作: get
認証: 有効
ユーザーID: user123
ドキュメントID: user456
ドキュメントデータ: { userId: "user456", name: "Other User", status: "active" }
```
**期待結果**: ❌ 拒否される

#### テストケース3: ユーザーが許可されたフィールドのみ更新できる
```
場所: /users/{userId}
操作: update
認証: 有効
ユーザーID: user123
ドキュメントID: user123
既存データ: { userId: "user123", name: "Test User", status: "active" }
更新データ: { name: "Updated Name", businessInfo: { industry: "IT" }, updatedAt: "2024-01-01T00:00:00Z" }
```
**期待結果**: ✅ 許可される

#### テストケース4: ユーザーがstatusフィールドを更新できない
```
場所: /users/{userId}
操作: update
認証: 有効
ユーザーID: user123
ドキュメントID: user123
既存データ: { userId: "user123", name: "Test User", status: "active" }
更新データ: { status: "suspended", updatedAt: "2024-01-01T00:00:00Z" }
```
**期待結果**: ❌ 拒否される

#### テストケース5: 管理者が全ユーザーのドキュメントを読み取れる
```
場所: /users/{userId}
操作: get
認証: 有効
ユーザーID: admin123
ユーザーEmail: admin@signalapp.jp
ドキュメントID: user123
ドキュメントデータ: { userId: "user123", name: "Test User", status: "active" }
```
**期待結果**: ✅ 許可される

#### テストケース6: ユーザーが自分のプランを作成できる
```
場所: /plans/{planId}
操作: create
認証: 有効
ユーザーID: user123
ドキュメントID: plan1
ドキュメントデータ: { userId: "user123", title: "My Plan", status: "active" }
```
**期待結果**: ✅ 許可される

#### テストケース7: ユーザーが他人のuserIdでプランを作成できない
```
場所: /plans/{planId}
操作: create
認証: 有効
ユーザーID: user123
ドキュメントID: plan2
ドキュメントデータ: { userId: "user456", title: "Other User Plan" }
```
**期待結果**: ❌ 拒否される

#### テストケース8: 未認証ユーザーがドキュメントを読み取れない
```
場所: /users/{userId}
操作: get
認証: 無効
ドキュメントID: user123
ドキュメントデータ: { userId: "user123", name: "Test User", status: "active" }
```
**期待結果**: ❌ 拒否される

---

### 方法2: Firebase Emulator を使った自動テスト

#### セットアップ

1. **必要なパッケージをインストール**
```bash
npm install --save-dev @firebase/rules-unit-testing
```

2. **Firebase Emulatorを起動**
```bash
npm run emulators:start:firestore
```

別のターミナルで:

3. **テストスクリプトを実行**
```bash
npm run test:firestore-rules
```

---

## 📋 主要なテストシナリオ

### Users Collection

- ✅ 自分のドキュメントを読み取れる
- ❌ 他人のドキュメントを読み取れない
- ✅ 許可されたフィールド（name, businessInfo, snsAISettings, setupRequired, updatedAt）のみ更新できる
- ❌ statusフィールドを更新できない
- ✅ 管理者が全ユーザーのドキュメントを読み取れる
- ✅ 管理者が全ユーザーのドキュメントを更新できる

### Plans Collection

- ✅ 自分のプランを作成できる
- ❌ 他人のuserIdでプランを作成できない
- ✅ 自分のプランを読み取れる
- ❌ 他人のプランを読み取れない
- ✅ 自分のプランのuserIdを変更できない

### Analytics Collection

- ✅ 自分のアナリティクスを作成できる
- ✅ 自分のアナリティクスを読み取れる
- ❌ 他人のアナリティクスを読み取れない

### Posts Collection

- ✅ 自分の投稿を作成できる
- ✅ 自分の投稿を読み取れる
- ❌ 他人の投稿を読み取れない

---

## ⚠️ 注意事項

1. **本番環境に適用する前に必ずテスト**
   - ルールプレイグラウンドで主要なシナリオを確認
   - エミュレータで実際の動作を確認

2. **段階的な適用**
   - まずはステージング環境でテスト
   - 問題がなければ本番環境に適用

3. **ログの確認**
   - Firebase Console > Firestore > 使用状況
   - 拒否されたリクエストがないか確認

---

## 🔍 トラブルシューティング

### ルールが適用されない

- Firebase Consoleでルールが正しく保存されているか確認
- ブラウザのキャッシュをクリア
- 数分待ってから再試行（反映に時間がかかる場合がある）

### 予期しない拒否エラー

- ルールプレイグラウンドで該当シナリオをテスト
- エラーメッセージを確認（どの条件で拒否されたか）
- ログを確認して詳細を把握

### テストが失敗する

- Emulatorが正しく起動しているか確認
- ルールファイルの構文エラーがないか確認
- テストデータが正しく設定されているか確認




































