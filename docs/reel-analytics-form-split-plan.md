# ReelAnalyticsForm.tsx (1,294行) の分割計画

## 分割方針
大きなコンポーネントを機能別の小さなコンポーネントに分割し、保守性と再利用性を向上させる。

## 分割対象コンポーネント

### 1. **parseInstagramReelData** (ユーティリティ関数)
- **場所**: `src/utils/instagram-data-parser.ts`
- **責務**: Instagram分析データのパース処理
- **行数**: 約300行 (120-420行目)
- **関数**: `parseInstagramReelData(text: string)`

### 2. **ReelAnalyticsToast** (新規作成)
- **場所**: `src/app/instagram/components/ReelAnalyticsToast.tsx`
- **責務**: トースト通知の表示（PostEditorToastと統合可能）
- **行数**: 約25行 (472-495行目)

### 3. **ReelAnalyticsBasicInfo** (新規作成)
- **場所**: `src/app/instagram/components/ReelAnalyticsBasicInfo.tsx`
- **責務**: 基本情報入力（タイトル、サムネイル、投稿日時）
- **行数**: 約80行 (497-577行目)
- **Props**: `data`, `onChange`, `handleInputChange`

### 4. **ReelAnalyticsPasteSection** (新規作成)
- **場所**: `src/app/instagram/components/ReelAnalyticsPasteSection.tsx`
- **責務**: Instagram分析データの貼り付けUI
- **行数**: 約20行 (670-689行目)
- **Props**: `onPaste`, `pasteSuccess`

### 5. **ReelAnalyticsReactionData** (新規作成)
- **場所**: `src/app/instagram/components/ReelAnalyticsReactionData.tsx`
- **責務**: リール反応データ入力（いいね、コメント、保存、シェアなど）
- **行数**: 約150行 (691-845行目)
- **Props**: `data`, `onChange`, `handleInputChange`

### 6. **ReelAnalyticsReachSources** (新規作成)
- **場所**: `src/app/instagram/components/ReelAnalyticsReachSources.tsx`
- **責務**: 閲覧数の上位ソース入力
- **行数**: 約60行 (847-906行目)
- **Props**: `data`, `onChange`, `handleInputChange`

### 7. **ReelAnalyticsVideoLength** (新規作成)
- **場所**: `src/app/instagram/components/ReelAnalyticsVideoLength.tsx`
- **責務**: 動画の長さ入力
- **行数**: 約100行 (908-1018行目)
- **Props**: `data`, `onChange`, `handleInputChange`

### 8. **ReelAnalyticsCommentLogs** (新規作成)
- **場所**: `src/app/instagram/components/ReelAnalyticsCommentLogs.tsx`
- **責務**: コメントと返信ログの管理
- **行数**: 約65行 (1020-1082行目)
- **Props**: `data`, `onChange`, `handleCommentThreadChange`, `handleAddCommentThread`, `handleRemoveCommentThread`

### 9. **ReelAnalyticsAudience** (新規作成)
- **場所**: `src/app/instagram/components/ReelAnalyticsAudience.tsx`
- **責務**: オーディエンス分析入力
- **行数**: 約80行 (1084-1164行目)
- **Props**: `data`, `onChange`, `handleInputChange`

### 10. **ReelAnalyticsFeedback** (新規作成)
- **場所**: `src/app/instagram/components/ReelAnalyticsFeedback.tsx`
- **責務**: フィードバック（満足/不満足）入力
- **行数**: 約50行 (1166-1216行目)
- **Props**: `sentiment`, `onSentimentChange`, `memo`, `onMemoChange`

### 11. **ReelAnalyticsAIAdvice** (新規作成)
- **場所**: `src/app/instagram/components/ReelAnalyticsAIAdvice.tsx`
- **責務**: AIアドバイス生成・表示
- **行数**: 約60行 (1178-1255行目)
- **Props**: `aiAdvice`, `isGenerating`, `error`, `onGenerate`, `sentiment`, `postData`

## 実装順序

1. **Phase 1**: ユーティリティ関数の分離
   - `instagram-data-parser.ts`の作成

2. **Phase 2**: 小さなUIコンポーネントの分離
   - `ReelAnalyticsToast`
   - `ReelAnalyticsFeedback`

3. **Phase 3**: 入力フォームコンポーネントの分離
   - `ReelAnalyticsBasicInfo`
   - `ReelAnalyticsPasteSection`
   - `ReelAnalyticsReactionData`
   - `ReelAnalyticsReachSources`
   - `ReelAnalyticsVideoLength`
   - `ReelAnalyticsCommentLogs`
   - `ReelAnalyticsAudience`

4. **Phase 4**: AI関連コンポーネントの分離
   - `ReelAnalyticsAIAdvice`

5. **Phase 5**: メインコンポーネントのリファクタリング
   - `ReelAnalyticsForm.tsx`を分割されたコンポーネントを使用するように更新

## 期待される効果

- **可読性の向上**: 各コンポーネントが単一の責務を持つ
- **再利用性の向上**: 他のページでも使用可能
- **テスト容易性の向上**: 小さなコンポーネントはテストしやすい
- **保守性の向上**: 変更が局所化される











