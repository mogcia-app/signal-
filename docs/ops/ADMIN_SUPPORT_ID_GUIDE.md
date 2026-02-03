# Adminプロジェクト向け: サポートID実装ガイド

## 📋 概要

Signal.のサポート効率化とセキュリティ向上のため、ランダムなサポートID（UUID v4）を各ユーザーに付与します。
このドキュメントは、Adminプロジェクトでの実装手順を説明します。

## 🎯 目的

1. **サポート対応の効率化**: サポートIDでエラー履歴、操作ログ、学習データを統合管理
2. **セキュリティ向上**: IPアドレスと組み合わせて異常検知
3. **個人情報保護**: サポートIDは個人情報ではないため、漏洩リスクが低い

## 📊 データ構造

### Firestore構造

```
users/{uid}
  - supportId: string (UUID v4)
  - ... 既存フィールド
```

### サポートIDの仕様

- **形式**: UUID v4（例: `550e8400-e29b-41d4-a716-446655440000`）
- **生成タイミング**: ユーザー作成時、または既存ユーザーへの付与時
- **変更**: 原則として変更不可（セキュリティ上の理由で再生成が必要な場合のみ）

## 🔧 実装手順

### 1. ユーザー作成時のサポートID自動生成

**実装場所**: ユーザー作成処理

**実装例** (JavaScript/TypeScript):

```typescript
import { v4 as uuidv4 } from 'uuid';
import { adminDb } from './firebase-admin'; // 適宜パスを調整

/**
 * ユーザー作成時にサポートIDを自動生成して付与
 */
async function createUserWithSupportId(userData: {
  id: string; // Firebase Auth UID
  email: string;
  name: string;
  // ... その他の必須フィールド
}) {
  const supportId = uuidv4(); // UUID v4を生成

  const userProfile = {
    ...userData,
    supportId: supportId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await adminDb.collection('users').doc(userData.id).set(userProfile);

  console.log(`✅ ユーザー作成完了: ${userData.email}, サポートID: ${supportId}`);
  
  return { ...userProfile, supportId };
}
```

**実装例** (Python):

```python
import uuid
from firebase_admin import firestore

def create_user_with_support_id(user_data: dict):
    """ユーザー作成時にサポートIDを自動生成して付与"""
    support_id = str(uuid.uuid4())  # UUID v4を生成
    
    user_profile = {
        **user_data,
        'supportId': support_id,
        'createdAt': firestore.SERVER_TIMESTAMP,
        'updatedAt': firestore.SERVER_TIMESTAMP,
    }
    
    db = firestore.client()
    db.collection('users').document(user_data['id']).set(user_profile)
    
    print(f"✅ ユーザー作成完了: {user_data['email']}, サポートID: {support_id}")
    
    return {**user_profile, 'supportId': support_id}
```

### 2. 既存ユーザーへのサポートID付与

**実装場所**: 管理画面のユーザー管理機能、またはバッチ処理

**実装例** (JavaScript/TypeScript):

```typescript
import { v4 as uuidv4 } from 'uuid';
import { adminDb } from './firebase-admin';

/**
 * 既存ユーザーにサポートIDを付与（未付与の場合のみ）
 */
async function assignSupportIdToUser(userId: string): Promise<string | null> {
  const userRef = adminDb.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new Error(`ユーザーが見つかりません: ${userId}`);
  }

  const userData = userDoc.data();
  
  // 既にサポートIDが付与されている場合はスキップ
  if (userData?.supportId) {
    console.log(`⚠️ 既にサポートIDが付与されています: ${userData.supportId}`);
    return userData.supportId;
  }

  // サポートIDを生成して付与
  const supportId = uuidv4();
  await userRef.update({
    supportId: supportId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`✅ サポートIDを付与しました: ${userId} → ${supportId}`);
  return supportId;
}

/**
 * 全ユーザーにサポートIDを一括付与（バッチ処理）
 */
async function assignSupportIdToAllUsers() {
  const usersSnapshot = await adminDb.collection('users').get();
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const userDoc of usersSnapshot.docs) {
    try {
      const userData = userDoc.data();
      
      if (userData.supportId) {
        skipCount++;
        continue;
      }

      const supportId = uuidv4();
      await userDoc.ref.update({
        supportId: supportId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      successCount++;
      console.log(`✅ ${userData.email}: ${supportId}`);
    } catch (error) {
      errorCount++;
      console.error(`❌ ${userDoc.id}: ${error}`);
    }
  }

  console.log(`
📊 サポートID付与完了
  - 成功: ${successCount}件
  - スキップ: ${skipCount}件
  - エラー: ${errorCount}件
  `);
}
```

**実装例** (Python):

```python
import uuid
from firebase_admin import firestore

def assign_support_id_to_user(user_id: str) -> str | None:
    """既存ユーザーにサポートIDを付与（未付与の場合のみ）"""
    db = firestore.client()
    user_ref = db.collection('users').document(user_id)
    user_doc = user_ref.get()
    
    if not user_doc.exists:
        raise ValueError(f"ユーザーが見つかりません: {user_id}")
    
    user_data = user_doc.to_dict()
    
    # 既にサポートIDが付与されている場合はスキップ
    if user_data.get('supportId'):
        print(f"⚠️ 既にサポートIDが付与されています: {user_data['supportId']}")
        return user_data['supportId']
    
    # サポートIDを生成して付与
    support_id = str(uuid.uuid4())
    user_ref.update({
        'supportId': support_id,
        'updatedAt': firestore.SERVER_TIMESTAMP,
    })
    
    print(f"✅ サポートIDを付与しました: {user_id} → {support_id}")
    return support_id

def assign_support_id_to_all_users():
    """全ユーザーにサポートIDを一括付与（バッチ処理）"""
    db = firestore.client()
    users = db.collection('users').stream()
    
    success_count = 0
    skip_count = 0
    error_count = 0
    
    for user_doc in users:
        try:
            user_data = user_doc.to_dict()
            
            if user_data.get('supportId'):
                skip_count += 1
                continue
            
            support_id = str(uuid.uuid4())
            user_doc.reference.update({
                'supportId': support_id,
                'updatedAt': firestore.SERVER_TIMESTAMP,
            })
            
            success_count += 1
            print(f"✅ {user_data.get('email', 'N/A')}: {support_id}")
        except Exception as e:
            error_count += 1
            print(f"❌ {user_doc.id}: {e}")
    
    print(f"""
📊 サポートID付与完了
  - 成功: {success_count}件
  - スキップ: {skip_count}件
  - エラー: {error_count}件
    """)
```

### 3. 管理画面UIの実装

#### 3.1 ユーザー一覧画面

**表示項目**:
- サポートID列を追加
- サポートIDが未付与の場合は「未付与」と表示
- サポートIDをクリックでコピー

**実装例** (React):

```tsx
import { useState } from 'react';

function UserList() {
  const [users, setUsers] = useState([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copySupportId = async (supportId: string) => {
    await navigator.clipboard.writeText(supportId);
    setCopiedId(supportId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <table>
      <thead>
        <tr>
          <th>メールアドレス</th>
          <th>名前</th>
          <th>サポートID</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td>{user.email}</td>
            <td>{user.name}</td>
            <td>
              {user.supportId ? (
                <span
                  onClick={() => copySupportId(user.supportId)}
                  style={{ cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {copiedId === user.supportId ? '✅ コピーしました' : user.supportId}
                </span>
              ) : (
                <span style={{ color: '#999' }}>未付与</span>
              )}
            </td>
            <td>
              {!user.supportId && (
                <button onClick={() => assignSupportId(user.id)}>
                  サポートIDを付与
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

#### 3.2 ユーザー詳細画面

**表示項目**:
- サポートIDを大きく表示
- コピーボタン
- サポートID再生成ボタン（セキュリティ上の理由がある場合のみ）

**実装例** (React):

```tsx
function UserDetail({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);
  const [copied, setCopied] = useState(false);

  const copySupportId = async () => {
    if (user?.supportId) {
      await navigator.clipboard.writeText(user.supportId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const regenerateSupportId = async () => {
    if (!confirm('サポートIDを再生成しますか？この操作は元に戻せません。')) {
      return;
    }
    
    // API呼び出し
    await fetch(`/api/admin/users/${userId}/regenerate-support-id`, {
      method: 'POST',
    });
    
    // ユーザー情報を再取得
    // ...
  };

  return (
    <div>
      <h2>ユーザー情報</h2>
      <div>
        <label>サポートID</label>
        {user?.supportId ? (
          <div>
            <code style={{ fontSize: '14px', fontFamily: 'monospace' }}>
              {user.supportId}
            </code>
            <button onClick={copySupportId}>
              {copied ? '✅ コピーしました' : '📋 コピー'}
            </button>
            <button onClick={regenerateSupportId} style={{ marginLeft: '8px' }}>
              🔄 再生成
            </button>
          </div>
        ) : (
          <div>
            <span style={{ color: '#999' }}>未付与</span>
            <button onClick={() => assignSupportId(userId)}>
              サポートIDを付与
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 4. APIエンドポイント（オプション）

AdminプロジェクトでAPIエンドポイントを実装する場合:

```typescript
// POST /api/admin/users/:userId/support-id
async function assignSupportIdEndpoint(req, res) {
  const { userId } = req.params;
  
  try {
    const supportId = await assignSupportIdToUser(userId);
    res.json({ success: true, supportId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// POST /api/admin/users/:userId/regenerate-support-id
async function regenerateSupportIdEndpoint(req, res) {
  const { userId } = req.params;
  
  try {
    const supportId = uuidv4();
    await adminDb.collection('users').doc(userId).update({
      supportId: supportId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true, supportId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

## 📋 チェックリスト

### 初期実装

- [ ] UUID v4ライブラリをインストール（`uuid`パッケージなど）
- [ ] ユーザー作成処理にサポートID自動生成を追加
- [ ] 既存ユーザーへのサポートID付与機能を実装
- [ ] 管理画面UIにサポートID表示を追加
- [ ] サポートIDコピー機能を実装

### 既存ユーザーへの一括付与

- [ ] バッチ処理スクリプトを作成
- [ ] テスト環境で動作確認
- [ ] 本番環境で実行（必要に応じて段階的に）

### 検証

- [ ] 新規ユーザー作成時にサポートIDが自動生成されることを確認
- [ ] 既存ユーザーへのサポートID付与が正常に動作することを確認
- [ ] 管理画面でサポートIDが正しく表示されることを確認
- [ ] サポートIDのコピー機能が正常に動作することを確認

## 🔐 セキュリティ考慮事項

1. **サポートIDの再生成**: 原則として変更不可。セキュリティ上の理由がある場合のみ再生成を許可
2. **アクセス制御**: サポートIDの付与・変更は管理者のみが実行可能
3. **監査ログ**: サポートIDの付与・変更は監査ログに記録

## 📝 注意事項

1. **既存ユーザーへの影響**: 既存ユーザーには段階的にサポートIDを付与することを推奨
2. **パフォーマンス**: 一括付与時は、大量のユーザーがいる場合はバッチサイズを制限
3. **エラーハンドリング**: サポートID付与時のエラーは適切にログに記録

## 🔗 関連ドキュメント

- `docs/ops/SUPPORT_ID_IMPLEMENTATION_PLAN.md` - Signal.プロジェクト側の実装計画
- `docs/sentry/SENTRY_SETUP.md` - Sentry設定ガイド

## 💡 よくある質問

### Q: サポートIDは変更できますか？

A: 原則として変更不可です。セキュリティ上の理由がある場合のみ再生成を許可します。

### Q: 既存ユーザーにいつサポートIDを付与すべきですか？

A: 可能な限り早期に一括付与することを推奨します。段階的に付与する場合は、優先順位を決めて実施してください。

### Q: サポートIDが重複することはありますか？

A: UUID v4を使用しているため、実質的に重複の可能性はありません。

### Q: サポートIDを削除することはできますか？

A: 削除は推奨しません。ユーザーが退会した場合でも、サポート対応履歴のため保持することを推奨します。

