# BFFパターン移行 - 計算ロジック分析結果

## フロントエンドに露出している計算ロジック

### 1. ✅ 既に移行済み
- **計画シミュレーション計算** (`calculateSimulation`)
  - 移行先: `/api/instagram/plan-simulation`
  - 状態: 完了

### 2. 🔴 移行が必要な計算ロジック

#### 2.1 フォロワー成長率計算 (`followerGrowth.ts`)
**ファイル**: `src/app/instagram/plan/utils/followerGrowth.ts`

**露出している計算式:**
1. `calculateTargetFollowersByAI`
   - 計算式: `目標フォロワー数 = 現在のフォロワー数 × (1 + 0.008) ^ 期間月数`
   - 月間成長率: 0.8% (0.008)

2. `calculateAIPredictionWeekly`
   - 計算式: 週次成長率 = `(1 + 0.008) ^ (1/4) - 1`
   - 週次でフォロワー推移を計算

3. `calculateTargetWeeklyPredictions`
   - 計算式: 週次増加数 = `(目標フォロワー数 - 現在のフォロワー数) / (期間月数 × 4)`
   - 線形予測で週次推移を計算

**使用箇所:**
- `TargetFollowerAutoInput.tsx`で直接使用されている可能性

#### 2.2 目標フォロワー数自動計算 (`TargetFollowerAutoInput.tsx`)
**ファイル**: `src/app/instagram/plan/components/TargetFollowerAutoInput.tsx`

**露出している計算式:**
- `calculateTargetFollowers` (38-46行目)
  - 計算式: `目標フォロワー数 = 現在のフォロワー数 × (1 + 0.008) ^ 期間月数`
  - 月間成長率: 0.8% (0.008)

**問題点:**
- フロントエンドで直接計算を実行している
- 計算式がクライアントサイドに露出している

### 3. ✅ バックエンドで既に処理されている計算

#### 3.1 PDCAメトリクス計算
- ファイル: `src/app/api/home/pdca-status/route.ts`
- 状態: バックエンドで計算済み ✅

#### 3.2 パフォーマンススコア計算
- ファイル: `src/app/api/analytics/performance-score/route.ts`
- 状態: バックエンドで計算済み ✅

#### 3.3 シミュレーション計算（旧API）
- ファイル: `src/app/api/instagram/simulation/route.ts`
- 状態: バックエンドで計算済み ✅

#### 3.4 投稿頻度計算
- ファイル: `src/app/api/plan/simulation/route.ts`
- 状態: バックエンドで計算済み ✅

## 移行計画

### Phase 1: 目標フォロワー数自動計算の移行
1. 新しいAPIエンドポイント `/api/instagram/target-followers` を作成
2. `TargetFollowerAutoInput.tsx`を修正してAPI呼び出しに変更
3. `followerGrowth.ts`の計算ロジックをバックエンドに移動

### Phase 2: 週次予測計算の移行
1. 既存の `/api/instagram/plan-simulation` に週次予測計算を含める
2. または新しいエンドポイント `/api/instagram/weekly-predictions` を作成

### Phase 3: 未使用ファイルの削除
1. `src/app/instagram/plan/utils/calculations.ts` を削除（既にバックエンドに移行済み）
2. `src/app/instagram/plan/utils/followerGrowth.ts` を削除（移行後）

## セキュリティ上の利点

1. **計算式の保護**: 月間成長率0.8%などのビジネスロジックがクライアントサイドに露出しない
2. **改ざん防止**: クライアント側で計算結果を改ざんできない
3. **一貫性**: すべての計算がサーバー側で統一されたロジックで実行される
4. **監査**: すべての計算リクエストがサーバー側でログに記録される











