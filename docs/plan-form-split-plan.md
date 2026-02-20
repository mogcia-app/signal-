# PlanForm.tsx (1,242行) の分割計画

## 分割方針
大きなフォームコンポーネントを機能別の小さなコンポーネントに分割し、保守性と再利用性を向上させる。

## 分割対象コンポーネント

### 1. **PlanFormBasicInfo** (新規作成)
- **場所**: `src/app/instagram/plan/components/PlanFormBasicInfo.tsx`
- **責務**: 計画開始日、現在のフォロワー数、目標フォロワー数の入力
- **行数**: 約50行 (280-330行目)
- **Props**: `formData`, `onFormDataChange`, `getDefaultStartDate`, `aiSuggestedTarget`

### 2. **PlanFormPostingFrequency** (新規作成)
- **場所**: `src/app/instagram/plan/components/PlanFormPostingFrequency.tsx`
- **責務**: 投稿頻度の設定（フィード、リール、ストーリーズ）
- **行数**: 約300行 (330-630行目)
- **Props**: `availableTime`, `onAvailableTimeChange`, `reelCapability`, `onReelCapabilityChange`, `storyFrequency`, `onStoryFrequencyChange`

### 3. **PlanFormMainGoal** (新規作成)
- **場所**: `src/app/instagram/plan/components/PlanFormMainGoal.tsx`
- **責務**: 目標設定（一番叶えたいこと）
- **行数**: 約220行 (630-850行目)
- **Props**: `mainGoalType`, `onMainGoalTypeChange`, `mainGoalOther`, `onMainGoalOtherChange`

### 4. **PlanFormScheduleSettings** (新規作成)
- **場所**: `src/app/instagram/plan/components/PlanFormScheduleSettings.tsx`
- **責務**: 投稿時間、ターゲットオーディエンス、地域制限、コンテンツタイプの設定
- **行数**: 約360行 (850-1210行目)
- **Props**: `preferredPostingTimes`, `onPreferredPostingTimesChange`, `formData`, `onFormDataChange`, `regionRestrictionEnabled`, `onRegionRestrictionChange`, `regionPrefecture`, `onRegionPrefectureChange`, `regionCity`, `onRegionCityChange`, `contentTypes`, `onContentTypesChange`, `contentTypeOther`, `onContentTypeOtherChange`

### 5. **PlanFormSubmitButton** (新規作成)
- **場所**: `src/app/instagram/plan/components/PlanFormSubmitButton.tsx`
- **責務**: 送信ボタン
- **行数**: 約30行 (1210-1240行目)
- **Props**: `isLoading`, `isValid`, `onSubmit`

## 実装順序

1. **Phase 1**: 小さなコンポーネントの分離
   - `PlanFormSubmitButton`

2. **Phase 2**: 基本情報コンポーネントの分離
   - `PlanFormBasicInfo`

3. **Phase 3**: 投稿頻度コンポーネントの分離
   - `PlanFormPostingFrequency`

4. **Phase 4**: 目標設定コンポーネントの分離
   - `PlanFormMainGoal`

5. **Phase 5**: スケジュール設定コンポーネントの分離
   - `PlanFormScheduleSettings`

6. **Phase 6**: メインコンポーネントのリファクタリング
   - `PlanForm.tsx`を分割されたコンポーネントを使用するように更新

## 期待される効果

- **可読性の向上**: 各コンポーネントが単一の責務を持つ
- **再利用性の向上**: 他のページでも使用可能
- **テスト容易性の向上**: 小さなコンポーネントはテストしやすい
- **保守性の向上**: 変更が局所化される




















