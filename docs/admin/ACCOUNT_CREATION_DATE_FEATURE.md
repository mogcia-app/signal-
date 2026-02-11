# Admin側：アカウント開設日入力フィールド追加の指示書

## 概要
Instagram運用計画ページのAI提案機能で、初月のフォロワー増加率を計算するために、アカウント開設日が必要になりました。
Admin側のユーザー管理画面に、アカウント開設日の入力フィールドを追加してください。

## 実装内容

### 1. データ構造
- **フィールド名**: `accountCreationDate`
- **型**: `string` (YYYY-MM-DD形式)
- **保存場所**: `users/{userId}/businessInfo/accountCreationDate`
- **必須**: 任意（ただし、AI提案を使用する場合は推奨）

### 2. UI要件

#### 追加場所
- ユーザー編集画面の「ビジネス情報」セクション
- 「利用開始日時点のフォロワー数」の近くに配置

#### UIデザイン
```
┌─────────────────────────────────────────┐
│ 利用開始日時点のフォロワー数              │
│ [入力フィールド]                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Instagramアカウント開設日                 │
│ [日付選択フィールド]                     │
│ ※ AI提案機能で使用されます               │
└─────────────────────────────────────────┘
```

#### 実装例
```typescript
// 日付入力フィールド
<label>
  Instagramアカウント開設日
  <input
    type="date"
    value={businessInfo.accountCreationDate || ""}
    onChange={(e) => {
      updateBusinessInfo({
        accountCreationDate: e.target.value
      });
    }}
  />
  <small>※ AI提案機能で使用されます（任意）</small>
</label>
```

### 3. バリデーション
- 日付形式: YYYY-MM-DD
- 未来の日付は不可（今日以前の日付のみ）
- 空欄でも可（任意項目）

### 4. 保存方法
既存の`businessInfo`更新APIを使用して保存してください。

```typescript
// 更新例
await updateUserProfile(userId, {
  businessInfo: {
    ...existingBusinessInfo,
    accountCreationDate: "2024-01-15" // YYYY-MM-DD形式
  }
});
```

### 5. 表示場所
オンボーディングページ（`/onboarding`）にも表示を追加してください。

```typescript
// オンボーディングページの表示例
<div>
  <label>Instagramアカウント開設日</label>
  <p>
    {businessInfo.accountCreationDate
      ? new Date(businessInfo.accountCreationDate).toLocaleDateString("ja-JP")
      : "未設定"}
  </p>
</div>
```

## 使用目的
このフィールドは、Instagram運用計画ページ（`/instagram/plan`）の「AI提案」機能で使用されます：

1. **初月の場合**: アカウント開設日から計画開始日までの増加率を計算
2. **2ヶ月目以降**: 前月のデータから計算（アカウント開設日は不要）

## 注意事項
- 既存ユーザーには空欄のままでも問題ありません
- アカウント開設日がない場合、AI提案は「データ不足のため提案できません」と表示されます
- ユーザーは「標準」「控えめ」「意欲的」などの固定値から選択できます

## 関連ファイル
- 型定義: `src/types/user.ts` (既に`accountCreationDate`フィールドを追加済み)
- API: `src/app/api/user/profile/route.ts` (既存の更新APIを使用)
- 使用先: `src/app/api/instagram/target-followers/route.ts`

## 実装チェックリスト
- [ ] Admin側のユーザー編集画面に日付入力フィールドを追加
- [ ] バリデーション（未来の日付を禁止）を実装
- [ ] 保存処理を実装
- [ ] オンボーディングページに表示を追加（任意）
- [ ] 既存データへの影響確認（空欄でも動作することを確認）

