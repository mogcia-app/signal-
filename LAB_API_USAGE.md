# ラボページで使用しているAPI一覧

## 📋 使用中のAPI

ラボページは以下のAPIを使用しています。すべて既存のAPIで、ラボ専用のAPIはありません。

### Feed Lab (`/instagram/lab/feed`)

1. **`/api/posts`** - 投稿データの取得
2. **`/api/analytics`** - 分析データの取得
3. **`/api/user/business-info`** - ビジネス情報の取得
4. **`/api/instagram/feed-schedule`** - フィードスケジュールの生成
5. **`/api/instagram/schedule-save`** - スケジュールの保存
6. **`/api/instagram/feed-suggestions`** - フィードの提案生成
7. **`/api/ai/post-generation`** - AI投稿生成（PostEditorコンポーネント）

### Reel Lab (`/instagram/lab/reel`)

1. **`/api/posts`** - 投稿データの取得
2. **`/api/analytics`** - 分析データの取得
3. **`/api/user/business-info`** - ビジネス情報の取得
4. **`/api/instagram/reel-schedule`** - リールスケジュールの生成
5. **`/api/instagram/schedule-save`** - スケジュールの保存
6. **`/api/instagram/reel-structure`** - リール構造の取得
7. **`/api/ai/post-generation`** - AI投稿生成（PostEditorコンポーネント）

### Story Lab (`/instagram/lab/story`)

1. **`/api/posts`** - 投稿データの取得
2. **`/api/analytics`** - 分析データの取得
3. **`/api/user/business-info`** - ビジネス情報の取得
4. **`/api/instagram/story-schedule`** - ストーリースケジュールの生成
5. **`/api/instagram/schedule-save`** - スケジュールの保存
6. **`/api/instagram/story-suggestions`** - ストーリーの提案生成
7. **`/api/ai/post-generation`** - AI投稿生成（PostEditorコンポーネント）

## 🔍 確認結果

- ✅ すべてのAPIは存在しています
- ✅ ラボ専用のAPIはありません（既存のAPIを共有使用）
- ✅ すべてのAPIルートは正常に動作しています

## 📝 補足

ラボページは既存のAPIを組み合わせて使用しているため、専用のAPIエンドポイントは不要です。これにより：

1. **コードの重複を避ける**: 共通のAPIを再利用
2. **メンテナンス性の向上**: 1つのAPIを修正すればすべてのページで反映
3. **一貫性の確保**: 同じAPIを使用することで動作が統一される

