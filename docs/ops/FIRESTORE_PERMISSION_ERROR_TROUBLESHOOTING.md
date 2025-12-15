# Firestore権限エラー「Missing or insufficient permissions」のトラブルシューティング

**エラーメッセージ**: `Missing or insufficient permissions`  
**Next.js version**: 15.5.9 (Webpack)

## 考えられる原因

### 1. 認証されていない状態でFirestoreにアクセス

**症状**:
- ログイン前やログアウト後にエラーが発生
- `request.auth`が`null`の状態でアクセス

**確認方法**:
```javascript
// ブラウザのコンソールで確認
import { auth } from '@/lib/firebase';
console.log('Current user:', auth.currentUser);
```

**対処法**:
- 認証状態を確認してからFirestoreにアクセス
- `useAuth`フックを使用して認証状態を確認

### 2. 存在しないコレクション/ドキュメントにアクセス

**症状**:
- 新規ユーザーが初回アクセス時にエラー
- ドキュメントが存在しない状態で`read`操作を実行

**確認方法**:
- Firestoreコンソールでコレクション/ドキュメントの存在を確認
- エラーログでどのコレクション/ドキュメントにアクセスしようとしているか確認

**対処法**:
- ドキュメントが存在しない場合は`create`操作を実行
- または、`getDoc`の結果をチェックして存在確認

### 3. セキュリティルールがデプロイされていない

**症状**:
- 開発環境でエラーが発生
- 本番環境では正常に動作

**確認方法**:
```bash
# デプロイされているルールを確認
firebase firestore:rules:get
```

**対処法**:
```bash
# ルールをデプロイ
firebase deploy --only firestore:rules
```

### 4. Next.js 15.5.9アップデートによる影響

**可能性**:
- RSCの変更により、サーバーサイドでのFirestoreアクセスが影響を受けた可能性
- 認証トークンの受け渡し方法が変わった可能性

**確認方法**:
- サーバーコンポーネントでFirestoreに直接アクセスしていないか確認
- クライアントコンポーネントでのみFirestoreにアクセスしているか確認

**対処法**:
- サーバーコンポーネントではFirebase Admin SDKを使用
- クライアントコンポーネントではFirebase Client SDKを使用

### 5. セキュリティルールの条件が厳しすぎる

**症状**:
- 認証済みでもエラーが発生
- 特定の操作のみエラー

**確認方法**:
- Firestoreコンソールの「ルール」タブでルールを確認
- エラーログでどの操作が拒否されているか確認

**対処法**:
- ルールを一時的に緩和してテスト
- デバッグモードでルールをテスト

## デバッグ手順

### ステップ1: 認証状態の確認

```javascript
// ブラウザのコンソールで実行
import { auth } from '@/lib/firebase';
auth.onAuthStateChanged((user) => {
  console.log('Auth state:', user ? 'authenticated' : 'not authenticated');
  console.log('User UID:', user?.uid);
});
```

### ステップ2: Firestoreルールのテスト

```bash
# ローカルでルールをテスト
npm run test:firestore-rules
```

### ステップ3: エラーの詳細を確認

```javascript
// エラーハンドリングを追加
try {
  const doc = await getDoc(docRef);
  if (!doc.exists()) {
    console.log('Document does not exist');
  }
} catch (error) {
  console.error('Firestore error:', error.code, error.message);
  // error.code: 'permission-denied'
  // error.message: 'Missing or insufficient permissions.'
}
```

### ステップ4: Firestoreコンソールで確認

1. Firebase Console → Firestore Database
2. データタブでコレクション/ドキュメントの存在を確認
3. ルールタブで現在のルールを確認

## よくある問題と解決策

### 問題1: 新規ユーザーが初回アクセス時にエラー

**原因**: ユーザードキュメントが存在しない状態で`read`操作を実行

**解決策**:
```typescript
// auth-context.tsx の ensureUserDocument を確認
const ensureUserDocument = async (user: User) => {
  const userDocRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userDocRef);
  
  if (!userDoc.exists()) {
    // ドキュメントが存在しない場合は作成
    await setDoc(userDocRef, defaultUserProfile);
  }
};
```

### 問題2: サーバーコンポーネントでFirestoreにアクセス

**原因**: サーバーコンポーネントでFirebase Client SDKを使用

**解決策**:
```typescript
// ❌ 悪い例（サーバーコンポーネント）
import { db } from '@/lib/firebase';
import { getDoc } from 'firebase/firestore';

// ✅ 良い例（API Route経由）
// app/api/users/route.ts
import { adminDb } from '@/lib/firebase-admin';
```

### 問題3: ルールがデプロイされていない

**原因**: 開発環境でルールが適用されていない

**解決策**:
```bash
# ルールをデプロイ
firebase deploy --only firestore:rules

# または、エミュレータを使用
firebase emulators:start --only firestore
```

## 現在のセキュリティルールの確認

現在のルールファイル: `firestore.rules.final`

主なルール:
- 認証が必要: `isAuthenticated()`
- 自分のデータのみアクセス可能: `request.auth.uid == userId`
- 管理者は全データにアクセス可能: `isAdmin()`

## 緊急時の対処法

### 一時的にルールを緩和（開発環境のみ）

```javascript
// firestore.rules.dev（開発環境用）
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**注意**: 本番環境では絶対に使用しないでください。

## 次のステップ

1. **エラーの詳細を確認**
   - ブラウザのコンソールでエラーメッセージを確認
   - どのコレクション/ドキュメントにアクセスしようとしているか確認

2. **認証状態を確認**
   - ログインしているか確認
   - ユーザーIDが正しく取得できているか確認

3. **ルールを確認**
   - デプロイされているルールを確認
   - ルールの条件が正しいか確認

4. **ログを確認**
   - Firebase Consoleのログを確認
   - エラーの発生タイミングを確認

## 参考リンク

- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firestore Rules Testing](https://firebase.google.com/docs/rules/unit-tests)
- [Firebase Authentication](https://firebase.google.com/docs/auth)

