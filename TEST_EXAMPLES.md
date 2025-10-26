# テスト追加のサンプルコード 📝

## ✅ 追加したテストファイル

1. **`src/__tests__/utils.test.ts`**
   - `cn`関数のテスト（Tailwindクラスのマージ）
   - 7つのテストケース

2. **`src/__tests__/date-utils.test.ts`**
   - 日付フォーマット、今日判定、日数計算のテスト
   - 11つのテストケース

3. **`src/__tests__/validation.test.ts`**
   - メール、URL、パスワードバリデーションのテスト
   - 11つのテストケース

**合計: 29個のテストすべて成功 ✅**

## 📖 テストの書き方

### 基本的な構造

```typescript
describe('関数名や機能', () => {
  test('テストケースの説明', () => {
    // 準備
    const input = 'something';
    
    // 実行
    const result = yourFunction(input);
    
    // アサート
    expect(result).toBe('expected');
  });
});
```

### よく使うアサーション

```typescript
// 等しい
expect(result).toBe('value');

// 真偽値
expect(result).toBe(true);

// 配列
expect(array).toHaveLength(3);
expect(array).toContain('item');

// オブジェクト
expect(obj).toHaveProperty('key');
expect(obj.key).toBe('value');

// 文字列
expect(str).toContain('substring');
expect(str).toMatch(/regex/);

// エラー
expect(() => riskyFunction()).toThrow();
```

## 🎯 テストを追加する手順

### 1. テストファイルを作成

`src/__tests__/your-feature.test.ts`

```typescript
describe('Your Feature', () => {
  test('should do something', () => {
    expect(true).toBe(true);
  });
});
```

### 2. テストを実行

```bash
# すべてのテスト
npm test

# 特定のファイルのみ
npm test src/__tests__/your-feature.test.ts

# ウォッチモード
npm run test:watch

# カバレッジ
npm run test:coverage
```

### 3. GitHubにプッシュ

```bash
git add src/__tests__/
git commit -m "Add tests for feature X"
git push
```

### 4. GitHub Actionsで自動実行

- プッシュすると自動でテスト実行
- Sentry Preventに結果が送信
- PRコメントに結果が表示

## 📊 カバレッジレポートの見方

```bash
npm run test:coverage
```

結果:
- **Statements**: コードの実行割合
- **Branches**: 分岐のカバー割合
- **Functions**: 関数の実行割合
- **Lines**: 行の実行割合

## 🎯 次のステップ

### 推奨されるテスト

1. **API Routeのテスト**
   - `src/app/api/**/route.ts`
   - レスポンスのテスト

2. **コンポーネントのテスト**
   - React Testing Libraryを使用
   - ユーザー操作のシミュレーション

3. **カスタムフックのテスト**
   - `src/hooks/` のテスト
   - 状態管理のテスト

### テストを書くべき場所

```typescript
// src/__tests__/api/instagram.test.ts
describe('Instagram API', () => {
  test('should fetch analytics data', async () => {
    // テストコード
  });
});

// src/__tests__/components/PostCard.test.tsx
describe('PostCard', () => {
  test('should render correctly', () => {
    // テストコード
  });
});

// src/__tests__/hooks/usePlanForm.test.ts
describe('usePlanForm', () => {
  test('should handle form submission', () => {
    // テストコード
  });
});
```

## 🔧 テストのベストプラクティス

### 1. テストケースの命名
```typescript
// ❌ 悪い例
test('test 1', () => {});

// ✅ 良い例
test('should return error when email is invalid', () => {});
```

### 2. AAA パターン
```typescript
test('should calculate sum correctly', () => {
  // Arrange (準備)
  const a = 1;
  const b = 2;
  
  // Act (実行)
  const result = add(a, b);
  
  // Assert (検証)
  expect(result).toBe(3);
});
```

### 3. エッジケース
```typescript
test('should handle edge cases', () => {
  // 空文字列
  expect(validate('')).toBe(false);
  
  // null/undefined
  expect(validate(null)).toBe(false);
  
  // 境界値
  expect(validate(MAX_LENGTH)).toBe(true);
  expect(validate(MAX_LENGTH + 1)).toBe(false);
});
```

## 📚 参考リンク

- [Jest ドキュメント](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

