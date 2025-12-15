# React Hooks初期化エラー「初期化前にアクセスできません」について

## エラーメッセージ
```
初期化前に 'handleGenerateInsight'にアクセスできません
Cannot access 'handleGenerateInsight' before initialization
```

## このエラーが発生する可能性があったケース

### 1. **useCallbackとuseEffectの依存関係の循環参照**

**問題のあったコード構造**:
```typescript
// ❌ 問題のあるパターン
const handleGenerateInsight = useCallback(async () => {
  // ... 処理
}, [user?.uid, postId, post, postAnalytics]); // オブジェクト全体を依存配列に含める

useEffect(() => {
  handleGenerateInsight(); // ここで参照
}, [postAnalytics, handleGenerateInsight]); // handleGenerateInsightが依存配列に
```

**なぜエラーが発生しそうだったか**:
- `post`や`postAnalytics`がオブジェクト全体として依存配列に含まれている
- これらのオブジェクトが再作成されるたびに`handleGenerateInsight`も再作成される
- `useEffect`が`handleGenerateInsight`に依存しているため、再実行される
- Reactのレンダリングサイクルで、`handleGenerateInsight`が定義される前に`useEffect`が実行される可能性がある

### 2. **依存配列の過剰な依存**

**問題のあったコード**:
```typescript
// ❌ 問題のあるパターン
const handleGenerateInsight = useCallback(async () => {
  // post?.postType, post?.title など一部のプロパティのみ使用
}, [user?.uid, postId, post, postAnalytics]); // オブジェクト全体を依存

// postが変更されるたびにhandleGenerateInsightが再作成される
// しかし、実際に使用しているのは一部のプロパティのみ
```

**発生しうるタイミング**:
- `post`オブジェクトが再作成される（参照が変わる）たびに`handleGenerateInsight`が再作成
- `useEffect`が`handleGenerateInsight`に依存しているため、再実行される
- レンダリング中に`handleGenerateInsight`が再定義される過程で、古い参照が残っている可能性

### 3. **React Strict Modeでの二重レンダリング**

**発生条件**:
- 開発環境でReact Strict Modeが有効
- コンポーネントが2回レンダリングされる
- 1回目のレンダリングで`handleGenerateInsight`が定義される前に`useEffect`が実行される可能性

### 4. **条件付きレンダリングや早期リターン**

**問題のあったコード**:
```typescript
// ❌ 問題のあるパターン
if (!user) {
  return null; // 早期リターン
}

const handleGenerateInsight = useCallback(async () => {
  // ...
}, [user?.uid, postId]);

useEffect(() => {
  handleGenerateInsight(); // userがnullの場合、ここでエラー
}, [handleGenerateInsight]);
```

**発生しうるタイミング**:
- `user`が`null`から`undefined`に変わる瞬間
- 条件分岐により`handleGenerateInsight`が定義されない場合がある

### 5. **TypeScriptの型チェックと実行時の不一致**

**問題のあったコード**:
```typescript
// ❌ 問題のあるパターン
const handleGenerateInsight = useCallback(async () => {
  // postAnalytics?.publishedAt を使用
}, [user?.uid, postId, post, postAnalytics]); // postAnalytics全体

// postAnalyticsがundefinedの場合、依存配列に含めても
// 実行時にundefinedになり、再作成のタイミングがずれる
```

## 修正後のコード（安全なパターン）

### ✅ 修正版

```typescript
// ✅ 安全なパターン
const handleGenerateInsight = useCallback(async () => {
  if (!user?.uid || !postId) {
    return;
  }
  // ... 処理
  // 実際に使用しているプロパティのみを参照
  category: post?.postType || "feed",
  postTitle: post?.title || "",
  postHashtags: post?.hashtags || [],
  postPublishedAt: postAnalytics?.publishedAt?.toISOString() || null,
}, [
  user?.uid, 
  postId, 
  post?.postType,      // オブジェクト全体ではなく、使用しているプロパティのみ
  post?.title,
  post?.hashtags,
  postAnalytics?.publishedAt
]);

useEffect(() => {
  if (!user?.uid || !postId || !postAnalytics) {
    return;
  }
  // ... 処理
  handleGenerateInsight();
}, [
  postAnalytics, 
  postInsight, 
  savedSummary, 
  user?.uid, 
  postId, 
  autoGenerateScheduled, 
  handleGenerateInsight // useCallbackで定義されているので安全
]);
```

## なぜ修正で解決したか

1. **依存配列の最適化**
   - オブジェクト全体ではなく、実際に使用しているプロパティのみを依存配列に含める
   - 不要な再作成を防ぐ

2. **明確な初期化順序**
   - `useCallback`で定義された関数は、依存配列の値が変更されない限り再作成されない
   - `useEffect`が`handleGenerateInsight`を参照する時点で、既に定義されていることが保証される

3. **条件チェックの追加**
   - `useEffect`内で必要な値が存在することを確認してから`handleGenerateInsight`を呼び出す

## 一般的なベストプラクティス

### 1. useCallbackの依存配列は最小限に
```typescript
// ❌ 悪い例
const fn = useCallback(() => {
  console.log(obj.prop);
}, [obj]); // オブジェクト全体

// ✅ 良い例
const fn = useCallback(() => {
  console.log(obj.prop);
}, [obj.prop]); // 使用しているプロパティのみ
```

### 2. useEffectの依存配列は正確に
```typescript
// ❌ 悪い例
useEffect(() => {
  fn();
}, []); // 依存配列が空（eslint-disableを使っている）

// ✅ 良い例
useEffect(() => {
  fn();
}, [fn]); // 使用している関数を依存配列に含める
```

### 3. 条件付きフックの使用を避ける
```typescript
// ❌ 悪い例
if (condition) {
  const fn = useCallback(() => {}, []);
}

// ✅ 良い例
const fn = useCallback(() => {
  if (!condition) return;
  // ...
}, [condition]);
```

## デバッグ方法

1. **React DevToolsで確認**
   - コンポーネントの再レンダリング回数を確認
   - フックの実行順序を確認

2. **コンソールログで確認**
   ```typescript
   console.log('handleGenerateInsight defined:', typeof handleGenerateInsight);
   useEffect(() => {
     console.log('useEffect running, handleGenerateInsight:', typeof handleGenerateInsight);
   }, [handleGenerateInsight]);
   ```

3. **ESLintルールを有効にする**
   - `react-hooks/exhaustive-deps` ルールを有効にして、依存配列の不備を検出

## 参考リンク

- [React Hooks Rules](https://react.dev/reference/rules/rules-of-hooks)
- [useCallback API Reference](https://react.dev/reference/react/useCallback)
- [useEffect API Reference](https://react.dev/reference/react/useEffect)

