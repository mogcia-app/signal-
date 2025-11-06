# 警告修正ガイド

警告を段階的に修正していくためのガイドです。

## 📊 現在の状況

- **エラー**: 0個 ✅
- **警告**: 121個 ⚠️

## 🎯 修正の優先順位

### 優先度1: `alert`の修正（約53個）

**理由**: ユーザー体験に直接影響する

**修正方法**:
1. トースト通知に置き換える（推奨）
2. カスタムモーダルコンポーネントを使用

**修正済み**:
- ✅ `src/app/analytics/feed/page.tsx`

**次の修正対象**:
1. `src/app/instagram/posts/page.tsx`
2. `src/app/instagram/analytics/reel/page.tsx`
3. `src/app/instagram/components/FeedAnalyticsForm.tsx`

### 優先度2: 未使用変数の修正（約20個）

**理由**: コードの可読性に影響

**修正方法**:
- 使用していない変数を削除
- または、変数名を`_`で始める（例: `_unusedVar`）

### 優先度3: `any`型の修正（約10個）

**理由**: 型安全性の向上

**修正方法**:
- 適切な型を定義
- `unknown`型を使用してから型ガード

### 優先度4: `console.log`の修正（約80個）

**理由**: 開発中は問題ないが、本番環境では削除推奨

**修正方法**:
- 開発環境でのみ実行されるようにする
- または、`console.warn`に変更（許可されている）

## 🚀 修正の進め方

### ステップ1: 重要な`alert`から修正（1-2時間）

```bash
# alertを検索
grep -r "alert(" src/

# 1ファイルずつ修正
# トースト通知を追加して、alertを置き換え
```

### ステップ2: 段階的に修正（週1-2時間）

1. 新しいコードを書くときは警告を出さない
2. 既存コードは、触ったファイルだけ修正
3. リファクタリング時に一緒に修正

### ステップ3: 自動修正（時間があるとき）

```bash
# 自動修正できるものは自動修正
npm run lint:fix

# 残りは手動で修正
```

## 💡 修正例

### 例1: alertの置き換え

```typescript
// 修正前
alert('保存に失敗しました');

// 修正後
setToastMessage({ message: '保存に失敗しました', type: 'error' });
setTimeout(() => setToastMessage(null), 5000);
```

### 例2: 未使用変数の修正

```typescript
// 修正前
const postId = urlParams.get('postId');
// postIdは使用されていない

// 修正後
const _postId = urlParams.get('postId'); // または削除
```

### 例3: console.logの修正

```typescript
// 修正前
console.log('API Response:', result);

// 修正後
if (process.env.NODE_ENV === 'development') {
  console.log('API Response:', result);
}
// または
console.warn('API Response:', result);
```

## ✅ チェックリスト

### 商用化前（必須）
- [ ] 主要ページの`alert`をすべて削除または置き換え
- [ ] 重要な未使用変数を修正
- [ ] エラーが0個であることを確認

### 商用化後（推奨）
- [ ] すべての`alert`を削除
- [ ] `any`型を段階的に修正
- [ ] `console.log`を開発環境のみに制限
- [ ] すべての警告を0個にする

## 🎯 目標

- **短期目標（1週間）**: 主要ページの`alert`をすべて削除
- **中期目標（1ヶ月）**: 未使用変数を修正
- **長期目標（3ヶ月）**: すべての警告を0個にする

