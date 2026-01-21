# Monthly Analysis Route リファクタリング計画

## 現状の問題

- `src/app/api/ai/monthly-analysis/route.ts` が **4192行** と非常に大きい
- 型定義、ユーティリティ、データ取得、計算ロジック、AI生成、APIルートが全て混在
- 保守性・可読性・テスト容易性が低い
- チーム開発でのコンフリクトが発生しやすい

## 提案するレイヤー構造

```
src/app/api/ai/monthly-analysis/
├── route.ts                    # 薄いAPI層（認証・バリデーション・usecase呼び出しのみ）
├── types.ts                    # 型定義（将来は types/ 配下に分割可能）
├── utils/                      # 純粋関数ユーティリティ
│   ├── date-utils.ts          # 日付関連ユーティリティ
│   ├── validation.ts          # バリデーション関数
│   └── data-utils.ts          # データ変換ユーティリティ
├── infra/                      # インフラ層（永続化・外部API）
│   └── firestore/
│       ├── master-context.ts  # マスターコンテキスト取得
│       ├── report-summary.ts  # レポートサマリー取得
│       └── plan-summary.ts    # 運用計画取得
├── domain/                     # ドメインロジック（ビジネスルール）
│   ├── metrics/               # 純粋な数値計算（副作用なし）
│   │   ├── engagement.ts      # エンゲージメント計算
│   │   ├── performance.ts     # パフォーマンス評価
│   │   └── calculations.ts    # 各種メトリクス計算
│   ├── analysis/              # 評価・解釈・判定
│   │   ├── post-patterns.ts   # 投稿パターン分析
│   │   ├── alerts.ts          # アラート生成
│   │   └── pdca.ts            # PDCA メトリクス
│   ├── planning/              # アクション・PDCA生成（AIなし）
│   │   └── action-plans.ts    # フォールバックアクションプラン
│   └── ai/                    # AI依存ロジックのみ
│       ├── action-plans.ts    # AI アクションプラン生成
│       ├── overview.ts        # AI オーバービュー生成
│       └── client.ts          # OpenAI API呼び出し
└── services/
    └── analysis-service.ts    # メイン分析サービス（処理の流れ・フォールバック・統合）

```

### レイヤー説明

**route.ts**
- 認証・バリデーションのみ
- usecase（analysis-service）を呼び出すだけ
- 100行以下を目標

**utils/**
- 純粋関数のみ（副作用なし）
- テストが容易

**infra/**
- 外部依存（Firestore、将来的にはRDB/API）
- 「data」だと誤解されやすいため明確化
- 変更に強い設計

**domain/**
- ビジネスロジックの集約
- AIが落ちても動く設計
  - `metrics/`: 純粋計算
  - `analysis/`: 評価・判定
  - `planning/`: AIなし生成
  - `ai/`: AI依存のみ

**services/**
- 処理の順番とフォールバック
- 計算・分岐ロジックは含めない
- 読めば仕様が分かる設計

## 分割の詳細

### 1. `types.ts` (~200行)
- 型定義のみを集約
- `PostPerformanceTag`, `PostLearningSignal`, `PatternSummary`
- `MasterContext`, `ReportSummary`, `AnalysisAlert`
- `ActionPlan`, `PlanSummary`, `AnalysisOverview`
- など

### 2. `utils/date-utils.ts` (~100行)
- `monthKeyFromDate`, `monthLabelFromKey`, `monthKeyFromUnknown`
- `weekKeyFromDate`, `weekLabelFromKey`, `weekKeyFromUnknown`
- `getIsoWeekInfo`, `getPeriodRange`, `addMonths`
- `parseFirestoreDate`, `resolveReferenceDate`

### 3. `utils/validation.ts` (~50行)
- `ensureArray`, `toNumber`, `clamp`
- `parsePlanPeriodToMonths`

### 4. `infra/firestore/master-context.ts` (~800行)
- `getMasterContext` - メイン関数
- `serializeMasterContext`, `deserializeMasterContext`
- `createDefaultMasterContext`
- `buildLearningAchievements`
- `buildPostPatternPromptSection`

### 5. `infra/firestore/report-summary.ts` (~200行)
- `getReportSummary`

### 6. `infra/firestore/plan-summary.ts` (~300行)
- `fetchPlanSummaryForPeriod`
- `fetchScheduleStats`
- `derivePostCountFromContentStats`

### 7. `domain/metrics/engagement.ts` (~200行)
- `calculateEngagementRate` - 純粋計算
- `aggregateFeedbackData` - データ集約
- `deriveSentimentScore` - スコア計算

### 8. `domain/metrics/performance.ts` (~600行)
- `calculateEngagementRate` - 純粋計算
- `calculateReproducibilityScore` - 再現性スコア
- `calculateImprovabilityScore` - 改善可能性スコア
- `computeBaselineMetrics` - ベースライン計算
- `calculatePostPerformanceScore` - 投稿パフォーマンススコア

### 9. `domain/metrics/calculations.ts` (~300行)
- `collectTopHashtags` - ハッシュタグ集計
- 各種メトリクス計算関数（副作用なし）

### 10. `domain/analysis/post-patterns.ts` (~500行)
- `summarizePostPatterns` - パターン評価・解釈
- `buildFallbackPatternSummary` - フォールバック生成

### 11. `domain/analysis/alerts.ts` (~400行)
- アラート生成ロジック（判定・評価）

### 12. `domain/analysis/pdca.ts` (~300行)
- PDCA メトリクス計算・評価

### 13. `domain/planning/action-plans.ts` (~300行)
- `generateFallbackActionPlans` - AIなし生成
- `sanitizeActionPlanPriority` - 優先度正規化

### 14. `domain/ai/action-plans.ts` (~200行)
- `generateAIActionPlans` - AI依存生成

### 15. `domain/ai/overview.ts` (~600行)
- `generateAIOverview` - AI依存生成
- `buildMetricHighlights` - ハイライト構築（AI依存）

### 16. `domain/ai/client.ts` (~100行)
- `callOpenAI` - OpenAI API呼び出し

### 17. `utils/data-utils.ts` (~100行)
- `saveOverviewHistoryEntry` - 永続化処理

### 18. `services/analysis-service.ts` (~200-300行)
- `performAIAnalysis` - メインサービス関数
- **役割**: 処理の順番、失敗時のフォールバック、トランザクション境界
- **やらない**: 計算、分岐ロジック、変換処理
- **目標**: 読めば仕様が分かる設計

### 17. `route.ts` (~100行)
- `GET` 関数のみ
- `analysis-service` を呼び出すだけの薄い層

## 実装手順（推奨順）

### Phase 1: インフラ層の抽出（最優先）
**理由**: 外部依存が明確になり、テスト容易性が向上

1. `infra/firestore/` ディレクトリを作成
2. Firestoreアクセス関数を移動
   - `master-context.ts`
   - `report-summary.ts`
   - `plan-summary.ts`
3. 既存コードから参照を更新

### Phase 2: ドメイン層（metrics/analysis）の抽出
**理由**: ビジネスロジックの核心部分を明確化

1. `domain/metrics/` ディレクトリを作成
   - 純粋な数値計算関数を移動
   - `engagement.ts`, `performance.ts`, `calculations.ts`
2. `domain/analysis/` ディレクトリを作成
   - 評価・判定関数を移動
   - `post-patterns.ts`, `alerts.ts`, `pdca.ts`

### Phase 3: サービス層の作成（流れだけに）
**理由**: 処理の流れを明確化、フォールバック設計を確立

1. `services/` ディレクトリを作成
2. `analysis-service.ts` を作成
   - **重要**: 計算・分岐ロジックは含めない
   - 処理の順番とフォールバックのみ
   - 目標: 200-300行以下

```typescript
// 理想的な構造例
export async function performAIAnalysis(input) {
  const context = await loadContext(input)
  const metrics = computeMetrics(context)
  const insights = analyze(metrics)

  const overview =
    aiAvailable
      ? await generateAIOverview(insights)
      : generateFallbackOverview(insights)

  return buildResponse({ metrics, insights, overview })
}
```

### Phase 4: ドメイン層（planning/ai）の抽出
1. `domain/planning/` ディレクトリを作成
   - AIなし生成関数を移動
2. `domain/ai/` ディレクトリを作成
   - AI依存ロジックを移動
   - `action-plans.ts`, `overview.ts`, `client.ts`

### Phase 5: ユーティリティの抽出
1. `utils/` ディレクトリを作成
2. 純粋関数を移動
   - `date-utils.ts`, `validation.ts`, `data-utils.ts`

### Phase 6: 型定義の抽出
1. `types.ts` を作成（1ファイルでOK）
2. 型定義を移動
3. 将来必要に応じて `types/` 配下に分割可能

### Phase 7: ルート層の簡素化
1. `route.ts` を簡素化
2. 認証・バリデーション・usecase呼び出しのみ
3. 目標: 100行以下

## メリット

1. **保守性向上**: 各ファイルが明確な責任を持つ
2. **可読性向上**: 必要な機能を素早く見つけられる
3. **テスト容易性**: 各レイヤーを独立してテスト可能
4. **再利用性**: 他のAPIからも再利用可能
5. **パフォーマンス**: TypeScriptのコンパイル時間短縮（インクリメンタルビルド）
6. **チーム開発**: コンフリクトの発生を減少
7. **AI耐性**: AIが落ちても動く設計
8. **型安全性**: `any`問題も自然に解消
9. **拡張性**: 週次・月次切替も楽
10. **差し替え可能**: AIプロバイダーを差し替え可能

## 重要な設計原則

### ① calculators / analyzers / generators の境界を明確化

**問題**: 境界が曖昧だと「これは計算？分析？」となりやすい

**解決**: 役割で明確に分離

- `domain/metrics/` - 純粋な数値計算（副作用なし）
- `domain/analysis/` - 評価・解釈・判定
- `domain/planning/` - アクション・PDCA生成（AIなし）
- `domain/ai/` - AI依存ロジックのみ

**メリット**: 「AIが落ちても動く設計」になる

### ② data/ → infra/ への名称変更

**問題**: 「data = 加工済みデータ」と誤解されやすい

**解決**: `infra/firestore/` として明確化

**メリット**: 
- 永続化層であることが明確
- 将来 RDB / API に変えたときに意味が壊れない

### ③ analysis-service.ts は「太くしすぎない」

**問題**: 800行想定は黄色信号

**解決**: 流れだけにする（200-300行以下）

**役割の明確化**:

❌ **やらない**
- 計算
- 分岐ロジック
- 変換処理

⭕ **やる**
- 処理の順番
- 失敗時のフォールバック
- トランザクション境界

**目標**: 読めば仕様が分かる設計

## 注意事項

- 段階的にリファクタリング（一度に全部やらない）
- 各フェーズでテストを実行して動作確認
- 既存のエクスポートは維持（後方互換性）
- 循環参照に注意
- **AI依存ロジックと非依存ロジックを明確に分離**（重要）

