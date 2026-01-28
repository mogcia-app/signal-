# パスワード変更ロジック

**作成日**: 2025年1月
**対象**: 会員サイト開発チーム

## 概要

このドキュメントは、Signalプロジェクトで実装されていたパスワード変更機能のロジックを説明します。会員サイトでパスワード変更機能を実装する際の参考として使用してください。

## 技術スタック

- **認証**: Firebase Authentication
- **フロントエンド**: React (Next.js)
- **状態管理**: React Hooks (`useState`)

## 実装ロジック

### 1. バリデーション

パスワード変更前に以下のバリデーションを実行します：

```typescript
// 必須フィールドチェック
if (!currentPassword || !newPassword || !confirmPassword) {
  setPasswordChangeError("すべてのフィールドを入力してください");
  return;
}

// 最小文字数チェック（8文字以上）
if (newPassword.length < 8) {
  setPasswordChangeError("新しいパスワードは8文字以上である必要があります");
  return;
}

// パスワード一致チェック
if (newPassword !== confirmPassword) {
  setPasswordChangeError("新しいパスワードと確認用パスワードが一致しません");
  return;
}

// 現在のパスワードと異なるかチェック
if (currentPassword === newPassword) {
  setPasswordChangeError("新しいパスワードは現在のパスワードと異なる必要があります");
  return;
}
```

### 2. パスワード変更処理

Firebase Authenticationを使用してパスワードを変更します：

```typescript
import { signInWithEmailAndPassword, updatePassword } from "firebase/auth";
import { auth } from "../lib/firebase";

// 1. 現在のパスワードで再認証（セキュリティのため）
await signInWithEmailAndPassword(auth, user.email, currentPassword);

// 2. パスワードを変更
if (auth.currentUser) {
  await updatePassword(auth.currentUser, newPassword);
}
```

### 3. エラーハンドリング

Firebase Authenticationのエラーコードに基づいて適切なエラーメッセージを表示します：

```typescript
try {
  // パスワード変更処理
} catch (error: any) {
  if (error.code === "auth/wrong-password") {
    setPasswordChangeError("現在のパスワードが正しくありません");
  } else if (error.code === "auth/weak-password") {
    setPasswordChangeError("パスワードが弱すぎます。より強力なパスワードを設定してください");
  } else if (error.code === "auth/requires-recent-login") {
    setPasswordChangeError("セキュリティのため、再度ログインしてからパスワードを変更してください");
  } else {
    setPasswordChangeError(error.message || "パスワードの変更に失敗しました");
  }
}
```

## UI要件

### 入力フィールド

1. **現在のパスワード**
   - タイプ: `password`（表示/非表示切り替え可能）
   - 必須: はい
   - アイコン: ロックアイコン

2. **新しいパスワード**
   - タイプ: `password`（表示/非表示切り替え可能）
   - 必須: はい
   - 最小文字数: 8文字
   - ヒント: "8文字以上で入力してください"

3. **新しいパスワード（確認）**
   - タイプ: `password`（表示/非表示切り替え可能）
   - 必須: はい
   - 最小文字数: 8文字

### フィードバック

- **成功メッセージ**: パスワード変更成功時に表示（3秒後に自動で消える）
- **エラーメッセージ**: バリデーションエラーやFirebaseエラー時に表示

### ボタン

- **送信ボタン**: ローディング状態を表示（変更中...）
- **無効化**: ローディング中はボタンを無効化

## セキュリティ考慮事項

1. **再認証の必要性**
   - パスワード変更前に現在のパスワードで再認証を行う
   - セキュリティのため、長時間ログインしている場合は再ログインを促す

2. **パスワード強度**
   - 最小8文字を要求
   - Firebase Authenticationの弱いパスワード検出機能を活用

3. **エラーメッセージ**
   - 具体的なエラー内容を表示しない（セキュリティリスクを回避）
   - ユーザーフレンドリーなメッセージを表示

## 実装例（参考）

```typescript
"use client";

import { useState } from "react";
import { useAuth } from "../contexts/auth-context";
import { signInWithEmailAndPassword, updatePassword } from "firebase/auth";
import { auth } from "../lib/firebase";

export default function PasswordChangeForm() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // バリデーション
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("すべてのフィールドを入力してください");
      return;
    }

    if (newPassword.length < 8) {
      setError("新しいパスワードは8文字以上である必要があります");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("新しいパスワードと確認用パスワードが一致しません");
      return;
    }

    if (currentPassword === newPassword) {
      setError("新しいパスワードは現在のパスワードと異なる必要があります");
      return;
    }

    setLoading(true);

    try {
      if (!user || !user.email) {
        throw new Error("ユーザー情報を取得できませんでした");
      }

      // 再認証
      await signInWithEmailAndPassword(auth, user.email, currentPassword);

      // パスワード変更
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
      }

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      if (error.code === "auth/wrong-password") {
        setError("現在のパスワードが正しくありません");
      } else if (error.code === "auth/weak-password") {
        setError("パスワードが弱すぎます。より強力なパスワードを設定してください");
      } else if (error.code === "auth/requires-recent-login") {
        setError("セキュリティのため、再度ログインしてからパスワードを変更してください");
      } else {
        setError(error.message || "パスワードの変更に失敗しました");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* フォームフィールド */}
    </form>
  );
}
```

## 注意事項

1. **Firebase Authenticationの設定**
   - Firebase Authenticationが有効になっていることを確認
   - メール/パスワード認証が有効になっていることを確認

2. **ユーザー認証状態**
   - パスワード変更時にはユーザーがログインしている必要がある
   - `useAuth`フックなどでユーザー情報を取得

3. **エラーハンドリング**
   - すべてのエラーケースを適切に処理する
   - ユーザーに分かりやすいエラーメッセージを表示

## 参考リンク

- [Firebase Authentication - パスワード更新](https://firebase.google.com/docs/auth/web/manage-users#update_a_users_password)
- [Firebase Authentication - エラーコード](https://firebase.google.com/docs/auth/admin/errors)

