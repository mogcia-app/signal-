# コンポーネント分割計画

## PostEditor.tsx (1,390行) の分割

### 分割方針
大きなコンポーネントを機能別の小さなコンポーネントに分割し、保守性と再利用性を向上させる。

### 分割対象コンポーネント

#### 1. **PostEditorToast** (新規作成)
- **場所**: `src/app/instagram/lab/components/PostEditorToast.tsx`
- **責務**: トースト通知の表示
- **行数**: 約20行 (844-867行目)
- **Props**: `message`, `type`, `onClose`

#### 2. **PostEditorHeader** (新規作成)
- **場所**: `src/app/instagram/lab/components/PostEditorHeader.tsx`
- **責務**: エディターヘッダーの表示
- **行数**: 約15行 (869-883行目)
- **Props**: なし（固定コンテンツ）

#### 3. **PostEditorSuccessMessage** (新規作成)
- **場所**: `src/app/instagram/lab/components/PostEditorSuccessMessage.tsx`
- **責務**: 保存成功メッセージの表示
- **行数**: 約20行 (885-905行目)
- **Props**: `show`, `onViewPosts`

#### 4. **PostEditorContentInput** (新規作成)
- **場所**: `src/app/instagram/lab/components/PostEditorContentInput.tsx`
- **責務**: タイトルと投稿文の入力
- **行数**: 約30行 (983-1007行目)
- **Props**: `title`, `onTitleChange`, `content`, `onContentChange`, `postType`

#### 5. **PostEditorVideoStructure** (新規作成)
- **場所**: `src/app/instagram/lab/components/PostEditorVideoStructure.tsx`
- **責務**: リール用の動画構成表示・生成
- **行数**: 約70行 (1009-1077行目)
- **Props**: `videoStructure`, `videoFlow`, `content`, `onGenerate`, `postType`

#### 6. **PostEditorHashtags** (新規作成)
- **場所**: `src/app/instagram/lab/components/PostEditorHashtags.tsx`
- **責務**: ハッシュタグの表示・編集・追加
- **行数**: 約50行 (1079-1130行目)
- **Props**: `hashtags`, `onHashtagsChange`, `onAddHashtag`

#### 7. **PostEditorImageUpload** (新規作成)
- **場所**: `src/app/instagram/lab/components/PostEditorImageUpload.tsx`
- **責務**: 画像のアップロード・プレビュー・削除
- **行数**: 約100行 (1130-1230行目)
- **Props**: `image`, `onImageChange`, `isUploading`, `onCompressImage`

#### 8. **PostEditorAIGenerator** (新規作成)
- **場所**: `src/app/instagram/lab/components/PostEditorAIGenerator.tsx`
- **責務**: AI投稿文生成（自動生成・テーマ指定生成）
- **行数**: 約80行 (1200-1280行目)
- **Props**: `planData`, `postType`, `onAutoGenerate`, `onThemeGenerate`, `isGenerating`, `isAutoGenerating`, `showWarnings`, `onPromptChange`

#### 9. **PostEditorAIHints** (新規作成)
- **場所**: `src/app/instagram/lab/components/PostEditorAIHints.tsx`
- **責務**: AIヒントの表示（ストーリー・フィード用）
- **行数**: 約60行 (1274-1334行目)
- **Props**: `suggestions`, `isGenerating`, `postType`, `latestGeneration`

#### 10. **PostEditorScheduleSettings** (新規作成)
- **場所**: `src/app/instagram/lab/components/PostEditorScheduleSettings.tsx`
- **責務**: 投稿日時の設定
- **行数**: 約25行 (958-981行目)
- **Props**: `scheduledDate`, `onScheduledDateChange`, `scheduledTime`, `onScheduledTimeChange`

#### 11. **PostEditorActions** (新規作成)
- **場所**: `src/app/instagram/lab/components/PostEditorActions.tsx`
- **責務**: 保存・クリアボタン
- **行数**: 約30行 (1357-1383行目)
- **Props**: `onSave`, `onClear`, `isSaving`, `canSave`

#### 12. **PostEditorSnapshotReferences** (新規作成)
- **場所**: `src/app/instagram/lab/components/PostEditorSnapshotReferences.tsx`
- **責務**: AI参照投稿の表示
- **行数**: 約30行 (908-936行目)
- **Props**: `references`, `onReferenceClick`

#### 13. **PostEditorImageHints** (新規作成)
- **場所**: `src/app/instagram/lab/components/PostEditorImageHints.tsx`
- **責務**: 推奨ビジュアルの表示
- **行数**: 約20行 (939-956行目)
- **Props**: `imageHints`

### ユーティリティ関数の分離

#### 1. **imageUtils.ts** (新規作成)
- **場所**: `src/utils/image-utils.ts`
- **責務**: 画像圧縮処理
- **関数**: `compressImage(file, maxWidth, maxHeight, quality)`

#### 2. **postEditorUtils.ts** (新規作成)
- **場所**: `src/utils/post-editor-utils.ts`
- **責務**: プロンプト分析、ハッシュタグ処理など
- **関数**: `analyzePrompt(prompt)`, `normalizeHashtags(hashtags)`

### 実装順序

1. **Phase 1**: ユーティリティ関数の分離
   - `imageUtils.ts`の作成
   - `postEditorUtils.ts`の作成

2. **Phase 2**: 小さなUIコンポーネントの分離
   - `PostEditorToast`
   - `PostEditorHeader`
   - `PostEditorSuccessMessage`
   - `PostEditorActions`

3. **Phase 3**: 機能別コンポーネントの分離
   - `PostEditorContentInput`
   - `PostEditorScheduleSettings`
   - `PostEditorHashtags`
   - `PostEditorImageUpload`

4. **Phase 4**: AI関連コンポーネントの分離
   - `PostEditorAIGenerator`
   - `PostEditorAIHints`
   - `PostEditorVideoStructure`
   - `PostEditorSnapshotReferences`
   - `PostEditorImageHints`

5. **Phase 5**: メインコンポーネントのリファクタリング
   - `PostEditor.tsx`を分割されたコンポーネントを使用するように更新

### 期待される効果

- **可読性の向上**: 各コンポーネントが単一の責務を持つ
- **再利用性の向上**: 他のページでも使用可能
- **テスト容易性の向上**: 小さなコンポーネントはテストしやすい
- **保守性の向上**: 変更が局所化される


