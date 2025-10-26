# Sentry Prevent セットアップ完了 ✅

## 📦 インストールが必要なパッケージ

```bash
npm install
```

これは以下をインストールします：
- jest
- jest-environment-jsdom
- jest-junit
- @types/jest

## ✅ 作成したファイル

1. **`.github/workflows/sentry-prevent.yml`** - GitHub Actionsワークフロー
2. **`jest.config.js`** - Jest設定
3. **`jest.setup.js`** - Jestセットアップ
4. **`src/__tests__/example.test.ts`** - サンプルテスト

## 🎯 使い方

### ローカルでテスト実行
```bash
# すべてのテスト実行
npm test

# ウォッチモード
npm run test:watch

# カバレッジレポート
npm run test:coverage
```

### CIで自動実行
1. プッシュまたはプルリクエストを作成
2. GitHub Actionsが自動実行
3. テスト結果がSentry Preventに送信
4. PRコメントに結果が表示

## 📊 テスト結果の確認

### 1. GitHub Actions
- `.github/workflows/sentry-prevent.yml`のログを確認

### 2. Sentry Prevent ダッシュボード
- `mogcia.sentry.io/prevent/signal/`
- テスト分析と不安定なテストの特定

### 3. PRコメント
- プルリクエストにテスト結果が自動コメント

## 🔧 カスタマイズ

### テストを追加
`src/__tests__/` ディレクトリに `.test.ts` ファイルを追加

例：`src/__tests__/utils.test.ts`
```typescript
import { add } from '@/utils/math';

test('adds 1 + 2 to equal 3', () => {
  expect(add(1, 2)).toBe(3);
});
```

### テストの場所
- `src/__tests__/` - テスト専用ディレクトリ
- `**/*.test.ts` - ファイルと同じディレクトリに配置も可能

## ⚙️ 設定のカスタマイズ

### JUnit XMLの出力先
`jest.config.js` で設定：
```javascript
outputDirectory: './test-results',
outputName: 'junit.xml',
```

### カバレッジ設定
```javascript
collectCoverageFrom: [
  'src/**/*.{js,jsx,ts,tsx}',
  '!src/**/*.d.ts',
],
```

## 🚀 次のステップ

1. `npm install` を実行
2. `npm test` でローカルテスト
3. GitにプッシュしてCIを実行
4. Sentry Preventダッシュボードで結果を確認

