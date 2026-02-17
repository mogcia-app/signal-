# Vercel Strict Quality Gate Plan

## 目的
Vercelデプロイ時に「ESLint warning を含めて失敗」させ、品質をデプロイ前に担保する。

## 反映済み設定
- `vercel.json`
  - `buildCommand: "npm run build:vercel"`
- `package.json`
  - `build:vercel`: `npm run lint:strict && npm run typecheck && next build --no-lint`
  - `lint:strict`: `eslint src --ext .ts,.tsx,.js,.jsx --max-warnings=0`
  - `typecheck`: `tsc --noEmit`

この構成により、Vercelでは `warning > 0` でもビルド失敗になる。

## 現状（2026-02-17 計測）
- 対象: `src`
- 総警告数: `390`

上位ルール:
1. `curly`: 282
2. `@typescript-eslint/no-unused-vars`: 74
3. `no-alert`: 12
4. `@typescript-eslint/no-explicit-any`: 12
5. `@next/next/no-img-element`: 3

上位ファイル:
1. `src/app/home/page.tsx`: 84
2. `src/app/api/home/post-generation/route.ts`: 47
3. `src/app/api/instagram/plan-simulation/route.ts`: 25
4. `src/lib/server/post-image-storage.ts`: 17
5. `src/app/learning/page.tsx`: 14

## 段階的解消プラン
### Phase 1（即日〜2日）: 自動修正で母数を削減
- 目的: `curly` / `prefer-const` / 一部 unused を機械的に削る
- 手順:
  1. `npm run lint:fix`
  2. `npm run typecheck`
  3. `npm run lint:strict`
- 完了条件:
  - 警告を `390 -> 220 以下`

### Phase 2（3〜5日）: 高密度ファイルを集中修正
- 対象優先順:
  1. `src/app/home/page.tsx`
  2. `src/app/api/home/post-generation/route.ts`
  3. `src/app/api/instagram/plan-simulation/route.ts`
  4. `src/lib/server/post-image-storage.ts`
  5. `src/app/learning/page.tsx`
- 方針:
  - `no-unused-vars` を優先（副作用が少ない）
  - `any` は `unknown` + 型ガードへ置換
- 完了条件:
  - 警告を `220 -> 120 以下`

### Phase 3（5〜8日）: UX/セキュリティ系 warning を解消
- 対象:
  - `no-alert`
  - `@next/next/no-img-element`
  - `react-hooks/exhaustive-deps`
- 方針:
  - `alert/confirm` をトースト/モーダルへ統一
  - `<img>` を `next/image` へ置換
  - hook 依存配列は意図を明示（不足依存を追加）
- 完了条件:
  - 警告を `120 -> 40 以下`

### Phase 4（8〜10日）: ゼロ化
- 目的: `npm run lint:strict` を常時成功させる
- 完了条件:
  - 警告 `0`
  - `npm run build:vercel` 成功

## 運用ルール
- PRマージ条件:
  1. `npm run lint:strict`
  2. `npm run typecheck`
  3. `npm run build:vercel`
- 例外対応:
  - 例外ルール追加は原則禁止
  - 必要時は「期限付きTODO」とIssue番号を必須化

## 補足
`build:vercel` は `next build --no-lint` を使うため、重複lintを避けつつ、
事前の `lint:strict` でwarningを確実に落とす。
