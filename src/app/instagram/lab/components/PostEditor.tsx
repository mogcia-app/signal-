"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Save, RefreshCw, CheckCircle, Upload, X, Eye, Sparkles } from "lucide-react";
import { postsApi } from "../../../../lib/api";
import { useAuth } from "../../../../contexts/auth-context";
import { notify } from "../../../../lib/ui/notifications";
import Image from "next/image";
import type { PlanData } from "../../plan/types/plan";
import type {
  AIGenerationResponse,
  AIReference,
  SnapshotReference as AISnapshotReference,
  AIInsightBlock,
} from "@/types/ai";
import { AIReferenceBadge } from "@/components/AIReferenceBadge";

export type AIHintSuggestion = {
  content: string;
  rationale?: string;
};

export type SnapshotReference = AISnapshotReference;

interface PostEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  hashtags: string[];
  onHashtagsChange: (hashtags: string[]) => void;
  postType?: "feed" | "reel" | "story";
  title?: string;
  onTitleChange?: (title: string) => void;
  image?: string | null;
  onImageChange?: (image: string | null) => void;
  scheduledDate?: string;
  onScheduledDateChange?: (date: string) => void;
  scheduledTime?: string;
  onScheduledTimeChange?: (time: string) => void;
  isAIGenerated?: boolean;
  planData?: PlanData | null; // AI投稿文生成用
  aiPromptPlaceholder?: string; // AIプロンプトのプレースホルダー
  onVideoStructureGenerate?: (prompt: string) => void; // 動画構成生成のコールバック
  videoStructure?: {
    introduction: string;
    development: string;
    twist: string;
    conclusion: string;
  }; // 動画構成データ
  videoFlow?: string; // 動画構成の流れ
  imageVideoSuggestions?: AIHintSuggestion | null; // AIヒントの文章
  onImageVideoSuggestionsGenerate?: (content: string) => void; // AIヒント生成のコールバック
  isGeneratingSuggestions?: boolean; // AIヒント生成中のローディング状態
  initialSnapshotReferences?: SnapshotReference[];
  onSnapshotReferencesChange?: (refs: SnapshotReference[]) => void;
  onSnapshotReferenceClick?: (id: string) => void;
  editingPostId?: string | null; // 編集モード用の投稿ID
}

export const PostEditor: React.FC<PostEditorProps> = ({
  content,
  onContentChange,
  hashtags,
  onHashtagsChange,
  postType = "feed",
  title = "",
  onTitleChange,
  image = null,
  onImageChange,
  scheduledDate: externalScheduledDate = "",
  onScheduledDateChange,
  scheduledTime: externalScheduledTime = "",
  onScheduledTimeChange,
  isAIGenerated = false,
  planData,
  aiPromptPlaceholder = "例: 新商品の紹介、日常の出来事、お客様の声など...",
  onVideoStructureGenerate,
  videoStructure,
  videoFlow,
  imageVideoSuggestions,
  onImageVideoSuggestionsGenerate,
  isGeneratingSuggestions = false,
  initialSnapshotReferences,
  onSnapshotReferencesChange,
  onSnapshotReferenceClick,
  editingPostId = null,
}) => {
  const { user } = useAuth();
  const [savedPosts, setSavedPosts] = useState<string[]>([]);
  const [internalScheduledDate, setInternalScheduledDate] = useState("");
  const [internalScheduledTime, setInternalScheduledTime] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [snapshotReferences, setSnapshotReferences] = useState<SnapshotReference[]>(
    initialSnapshotReferences || [],
  );
  const [latestGeneration, setLatestGeneration] = useState<AIGenerationResponse | null>(null);
  const priorityBadgeStyles: Record<"high" | "medium" | "low", string> = {
    high: "bg-red-50 text-red-700 border border-red-200",
    medium: "bg-amber-50 text-amber-700 border border-amber-200",
    low: "bg-blue-50 text-blue-700 border border-blue-200",
  };

  useEffect(() => {
    if (initialSnapshotReferences) {
      setSnapshotReferences(initialSnapshotReferences);
    }
  }, [initialSnapshotReferences]);

  const updateSnapshotReferences = (refs: SnapshotReference[]) => {
    setSnapshotReferences(refs);
    onSnapshotReferencesChange?.(refs);
  };

  const cleanGeneratedText = (text?: string | null) =>
    text
      ? text
          .replace(/^[\s#-]+|[\s#-]+$/g, "")
          .replace(/^#+/g, "")
          .trim()
      : "";

  // 投稿文からハッシュタグを除去する関数（リール用）
  const removeHashtagsFromContent = (text: string): string => {
    // ハッシュタグパターン: #で始まり、英数字、日本語、アンダースコアが続く文字列
    // 投稿文全体からハッシュタグを除去（最後だけでなく、文中のハッシュタグも除去）
    return text
      .replace(/#[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g, "")
      .replace(/\s+/g, " ") // 連続するスペースを1つに
      .trim();
  };

  const normalizeGeneratedHashtags = (tags?: string[]) =>
    (tags ?? [])
      .map((tag) => tag.replace(/^#+-*/, "").replace(/^-+/, "").trim())
      .filter((tag) => tag && tag !== "-");

  const snapshotRefsFromAI = (refs?: AIReference[]): SnapshotReference[] => {
    if (!refs) {return [];}
    return refs
      .filter((ref) => ref.sourceType === "snapshot")
      .map((ref) => ({
        id: ref.id,
        status: (ref.metadata?.status as SnapshotReference["status"]) ?? "normal",
        score:
          typeof ref.metadata?.score === "number" ? Number(ref.metadata.score) : 0,
        title: ref.label,
        summary: ref.summary ?? ref.label,
        postType:
          typeof ref.metadata?.postType === "string"
            ? (ref.metadata.postType as SnapshotReference["postType"])
            : undefined,
      }));
  };

  const applyGeneratedDraft = (payload: {
    title?: string;
    content?: string;
    hashtags?: string[];
    snapshotReferences?: SnapshotReference[];
    generation?: AIGenerationResponse | null;
  }) => {
    const generation = payload.generation ?? null;
    const draft = generation?.draft;
    const finalTitleRaw = draft?.title ?? payload.title ?? "";
    const finalContentRaw = draft?.body ?? payload.content ?? "";
    const finalHashtagsRaw =
      draft?.hashtags && draft.hashtags.length > 0 ? draft.hashtags : payload.hashtags ?? [];

    const cleanTitle = cleanGeneratedText(finalTitleRaw);
    let cleanContent = cleanGeneratedText(finalContentRaw);
    
    // すべての投稿タイプで、投稿文からハッシュタグを除去
    if (cleanContent) {
      cleanContent = removeHashtagsFromContent(cleanContent);
    }
    
    let cleanedHashtags = normalizeGeneratedHashtags(finalHashtagsRaw);
    
    // フィードとリールの場合はハッシュタグを5個までに制限
    if (postType === "feed" || postType === "reel") {
      cleanedHashtags = cleanedHashtags.slice(0, 5);
    }

    if (cleanTitle) {
      onTitleChange?.(cleanTitle);
    }
    onContentChange(cleanContent || "");
    if (cleanedHashtags.length > 0) {
      onHashtagsChange(cleanedHashtags);
    }

    const normalizedSnapshotRefs =
      payload.snapshotReferences && payload.snapshotReferences.length > 0
        ? payload.snapshotReferences
        : snapshotRefsFromAI(generation?.references);

    updateSnapshotReferences(normalizedSnapshotRefs);
    setLatestGeneration(generation);

    return { content: cleanContent || payload.content || "" };
  };

  // AI投稿文生成用のstate
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "error") => {
    setToastMessage({ message, type });
  };

  const nonSnapshotReferences = useMemo(
    () => latestGeneration?.references?.filter((ref) => ref.sourceType !== "snapshot") ?? [],
    [latestGeneration]
  );
  const generationInsightBlocks = useMemo<AIInsightBlock[]>(() => {
    if (!latestGeneration) {return [];}
    if (latestGeneration.aiInsights?.length) {
      return latestGeneration.aiInsights;
    }
    return (latestGeneration.insights ?? []).map((text, index) => ({
      title: `Insight ${index + 1}`,
      description: text,
      action: undefined,
      referenceIds: undefined,
    }));
  }, [latestGeneration]);

  // 外部から渡された日時を優先、なければ内部状態を使用
  const scheduledDate = externalScheduledDate || internalScheduledDate;
  const scheduledTime = externalScheduledTime || internalScheduledTime;

  const handleScheduledDateChange = (date: string) => {
    if (onScheduledDateChange) {
      onScheduledDateChange(date);
    } else {
      setInternalScheduledDate(date);
    }
  };

  const handleScheduledTimeChange = (time: string) => {
    if (onScheduledTimeChange) {
      onScheduledTimeChange(time);
    } else {
      setInternalScheduledTime(time);
    }
  };

  const characterCount = content.length;
  const maxCharacters = 2200;
  const isOverLimit = characterCount > maxCharacters;

  const handleSave = async () => {
    if (!user?.uid) {
      showToast("ログインが必要です");
      return;
    }

    if (!content.trim()) {
      showToast("投稿文を入力してください");
      return;
    }

    // 画像データのサイズチェック（Base64エンコードされたデータのサイズ）
    if (image) {
      // Base64データのサイズを計算（約1.33倍になる）
      const base64Size = image.length * 0.75; // Base64文字列のサイズをバイトに変換
      const maxSize = 800 * 1024; // 800KB制限（Firestoreの1MB制限に余裕を持たせる）

      if (base64Size > maxSize) {
        showToast(
          `画像のサイズが大きすぎます（${Math.round(base64Size / 1024)}KB）。\n800KB以下の画像を選択してください。\n\n画像を圧縮するか、別の画像を選択してください。`,
        );
        return;
      }
    }

    setIsSaving(true);
    try {
      // 日時が設定されていない場合は、デフォルト値を設定（今日の日付と現在時刻）
      const defaultDate = scheduledDate || new Date().toISOString().split("T")[0];
      const defaultTime = scheduledTime || new Date().toTimeString().slice(0, 5);

      const sanitizedGenerationReferences =
        latestGeneration?.references
          ?.slice(0, 8)
          .map((reference) => ({
            id: reference.id,
            sourceType: reference.sourceType,
            label: reference.label,
            summary: reference.summary,
            metadata: reference.metadata,
          })) ?? [];

      const postData = {
        userId: user.uid,
        title: title || "",
        content,
        hashtags: hashtags,
        postType,
        scheduledDate: defaultDate,
        scheduledTime: defaultTime,
        status: "created" as const, // 'draft' → 'created' に変更
        imageData: image || null,
        isAIGenerated, // AI生成フラグを追加
        snapshotReferences,
        generationReferences: sanitizedGenerationReferences,
      };

      console.log("Saving post data:", {
        ...postData,
        imageData: image ? `[Base64 data: ${image.length} chars]` : null,
      });

      let result;
      if (editingPostId) {
        // 編集モード: 既存の投稿を更新
        console.log("Updating existing post:", editingPostId);
        result = await postsApi.update(editingPostId, postData);
        console.log("投稿を更新しました:", result);
      } else {
        // 新規作成モード
        result = await postsApi.create(postData);
        console.log("投稿を保存しました:", result);
        console.log("Post saved successfully with ID:", result.id);
      }

      // 次のアクションを即座に更新
      if (
        typeof window !== "undefined" &&
        (window as Window & { refreshNextActions?: () => void }).refreshNextActions
      ) {
        console.log("🔄 Triggering next actions refresh after post creation");
        (window as Window & { refreshNextActions?: () => void }).refreshNextActions!();
      }

      // ローカル保存リストにも追加
      setSavedPosts((prev) => [...prev, content]);

      // 成功メッセージを表示
      setShowSuccessMessage(true);

      // トースト通知を表示
      notify({ 
        type: "success", 
        message: editingPostId ? "投稿が更新されました" : "投稿が保存されました"
      });

      // 3秒後にメッセージを非表示
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
    } catch (error) {
      console.error("保存エラー:", error);
      const errorMessage = error instanceof Error ? error.message : "保存に失敗しました";

      // エラーメッセージをより詳細に表示
      let errorMsg = "";
      if (errorMessage.includes("Payload too large") || errorMessage.includes("size")) {
        errorMsg = "画像のサイズが大きすぎます。画像を圧縮するか、別の画像を選択してください。";
      } else {
        errorMsg = "保存に失敗しました。もう一度お試しください。";
      }

      // エラートースト通知を表示
      notify({ type: "error", message: errorMsg });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = (savedContent: string) => {
    onContentChange(savedContent);
  };

  const handleClear = () => {
    onContentChange("");
    onTitleChange?.("");
    onHashtagsChange([]);
    handleScheduledDateChange("");
    handleScheduledTimeChange("");
    onImageChange?.(null);
    updateSnapshotReferences([]);
    setLatestGeneration(null);
  };

  // 画像圧縮関数
  const compressImage = (
    file: File,
    maxWidth: number = 1920,
    maxHeight: number = 1920,
    quality: number = 0.8
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement("img");
        img.onload = () => {
          // 画像のサイズを計算
          let width = img.width;
          let height = img.height;

          // 最大サイズを超えている場合はリサイズ
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
          }

          // Canvasで画像を描画
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            reject(new Error("Canvas context not available"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // JPEG形式で圧縮（PNGの場合はJPEGに変換）
          const mimeType = file.type === "image/png" ? "image/jpeg" : file.type;
          const compressedDataUrl = canvas.toDataURL(mimeType, quality);

          resolve(compressedDataUrl);
        };
        img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
      reader.readAsDataURL(file);
    });
  };

  // 画像アップロード処理
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {return;}

    // ファイルサイズチェック（10MB制限）
    if (file.size > 10 * 1024 * 1024) {
      showToast("ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。");
      return;
    }

    // 画像ファイルチェック
    if (!file.type.startsWith("image/")) {
      showToast("画像ファイルを選択してください。");
      return;
    }

    setIsUploading(true);
    try {
      // 画像を圧縮（800KB以下になるように調整）
      const compressedImage = await compressImage(file, 1920, 1920, 0.8);

      // 圧縮後のサイズをチェック
      const base64Size = compressedImage.length * 0.75;
      const maxSize = 800 * 1024; // 800KB制限

      if (base64Size > maxSize) {
        // さらに圧縮を試みる
        const moreCompressed = await compressImage(file, 1600, 1600, 0.7);
        const moreCompressedSize = moreCompressed.length * 0.75;

        if (moreCompressedSize > maxSize) {
          // 最終的な圧縮
          const finalCompressed = await compressImage(file, 1280, 1280, 0.6);
          onImageChange?.(finalCompressed);
        } else {
          onImageChange?.(moreCompressed);
        }
      } else {
        onImageChange?.(compressedImage);
      }

      setIsUploading(false);
    } catch (error) {
      console.error("画像アップロードエラー:", error);
      showToast("画像のアップロードに失敗しました。もう一度お試しください。");
      setIsUploading(false);
    }
  };

  // 画像削除
  const handleImageRemove = () => {
    onImageChange?.(null);
  };

  const handleHashtagRemove = (index: number) => {
    onHashtagsChange(hashtags.filter((_, i) => i !== index));
  };

  const handleHashtagAdd = (hashtag: string) => {
    if (hashtag.trim() && !hashtags.includes(hashtag)) {
      // フィードとリールの場合はハッシュタグを5個までに制限
      const maxHashtags = postType === "feed" || postType === "reel" ? 5 : Infinity;
      if (hashtags.length < maxHashtags) {
        onHashtagsChange([...hashtags, hashtag]);
      }
    }
  };

  // AI自動生成（テーマも自動選択）
  const handleAutoGenerate = async () => {
    if (!planData) {
      showToast("運用計画が設定されていません");
      return;
    }

    setIsAutoGenerating(true);
    try {
      // 🔐 Firebase認証トークンを取得
      const { auth } = await import("../../../../lib/firebase");
      const currentUser = auth.currentUser;
      const token = currentUser ? await currentUser.getIdToken() : null;

      // AI APIを呼び出して完全自動生成
      const response = await fetch("/api/ai/post-generation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          prompt: "auto", // 自動生成を示す
          postType: postType || "feed",
          planData,
          scheduledDate,
          scheduledTime,
          autoGenerate: true, // 自動生成フラグ
        }),
      });

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error("レスポンスのJSON解析エラー:", jsonError);
        const errorText = await response.text().catch(() => "レスポンスの読み取りに失敗しました");
        throw new Error(`サーバーエラーが発生しました: ${response.status} ${response.statusText} - ${errorText}`);
      }

      if (!response.ok) {
        const errorMessage = result?.error || result?.message || `自動生成に失敗しました（${response.status}）`;
        console.error("自動生成APIエラー:", {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          details: result?.details,
          fullResult: result,
        });
        throw new Error(errorMessage);
      }

      if (result.success && result.data) {
        const applied = applyGeneratedDraft({
          title: result.data.title,
          content: result.data.content,
          hashtags: result.data.hashtags,
          snapshotReferences: result.data.snapshotReferences,
          generation: result.data.generation ?? null,
        });
        const generatedContent = applied.content;

        if (postType === "reel" && onVideoStructureGenerate) {
          onVideoStructureGenerate("auto");
        }

        if (
          (postType === "story" || postType === "feed") &&
          onImageVideoSuggestionsGenerate &&
          generatedContent
        ) {
          onImageVideoSuggestionsGenerate(generatedContent);
        }
      } else {
        throw new Error("自動生成に失敗しました");
      }
    } catch (error) {
      console.error("自動生成エラー:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "自動生成に失敗しました";
      
      // エラーメッセージをユーザーフレンドリーに変換
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes("Internal server error") || errorMessage.includes("500")) {
        userFriendlyMessage = "サーバーエラーが発生しました。しばらく待ってから再度お試しください。";
      } else if (errorMessage.includes("運用計画")) {
        userFriendlyMessage = "運用計画が設定されていません。運用計画ページで計画を作成してください。";
      } else if (errorMessage.includes("APIキー") || errorMessage.includes("API key") || errorMessage.includes("OpenAI")) {
        userFriendlyMessage = "AI機能の設定に問題があります。管理者にお問い合わせください。";
      } else if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
        userFriendlyMessage = "APIの利用制限に達しました。しばらく待ってから再度お試しください。";
      } else if (errorMessage.includes("401")) {
        userFriendlyMessage = "認証エラーが発生しました。ページを再読み込みしてください。";
      }
      
      showToast(userFriendlyMessage);
    } finally {
      setIsAutoGenerating(false);
    }
  };

  // AI投稿文生成（テーマ指定）
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      showToast("投稿のテーマを入力してください");
      return;
    }

    setIsGenerating(true);
    try {
      // 🔐 Firebase認証トークンを取得
      const { auth } = await import("../../../../lib/firebase");
      const currentUser = auth.currentUser;
      const token = currentUser ? await currentUser.getIdToken() : null;

      // AI APIを呼び出して投稿文生成
      const response = await fetch("/api/ai/post-generation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          postType: postType || "feed",
          planData,
          scheduledDate,
          scheduledTime,
          action: "generatePost",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "投稿文生成に失敗しました");
      }

      if (result.success && result.data) {
        const applied = applyGeneratedDraft({
          title: result.data.title,
          content: result.data.content,
          hashtags: result.data.hashtags,
          snapshotReferences: result.data.snapshotReferences,
          generation: result.data.generation ?? null,
        });
        const generatedContent = applied.content;
        setAiPrompt(""); // テーマをクリア

        if (postType === "reel" && onVideoStructureGenerate) {
          onVideoStructureGenerate(aiPrompt);
        }

        if (
          (postType === "story" || postType === "feed") &&
          onImageVideoSuggestionsGenerate &&
          generatedContent
        ) {
          onImageVideoSuggestionsGenerate(generatedContent);
        }
      } else {
        throw new Error("投稿文生成に失敗しました");
      }
    } catch (error) {
      console.error("投稿文生成エラー:", error);
      showToast(
        `投稿文生成に失敗しました: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* トースト通知 */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px] max-w-md ${
              toastMessage.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
            }`}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle size={20} className="flex-shrink-0" />
            ) : (
              <X size={20} className="flex-shrink-0" />
            )}
            <p className="font-medium flex-1">{toastMessage.message}</p>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-2 text-white hover:text-gray-200 transition-colors flex-shrink-0"
              aria-label="閉じる"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col min-h-full">
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-[#ff8a15] to-orange-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">📝</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-black">投稿文エディター</h2>
                <p className="text-sm text-black">投稿文を作成・編集しましょう</p>
              </div>
            </div>
          </div>
        </div>

        {/* 成功メッセージ */}
        {showSuccessMessage && (
          <div className="mx-6 mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircle size={20} className="text-orange-600 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-800">投稿が保存されました！</p>
                <p className="text-xs text-orange-600 mt-1">投稿一覧ページで確認できます。</p>
              </div>
              <div className="flex space-x-2">
                <Link
                  href="/instagram/posts"
                  className="inline-flex items-center px-3 py-1 text-xs bg-[#ff8a15] text-white hover:bg-orange-600 transition-colors"
                >
                  <Eye size={12} className="mr-1" />
                  投稿一覧を見る
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="p-6 flex-1 flex flex-col min-h-0">
          {snapshotReferences.length > 0 && (
            <div className="mb-6 border border-slate-200 rounded-xl bg-slate-50/70 p-4">
              <p className="text-xs font-semibold text-slate-800 mb-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                AIが参照した投稿
              </p>
              <div className="flex flex-wrap gap-2">
                {snapshotReferences.map((reference) => (
                <button
                    key={reference.id}
                  type="button"
                  onClick={() => onSnapshotReferenceClick?.(reference.id)}
                  className={`text-[11px] px-3 py-1 rounded-full border transition-colors ${
                      reference.status === "gold"
                      ? "border-amber-300 bg-white text-amber-700 hover:bg-amber-50"
                        : reference.status === "negative"
                        ? "border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {reference.summary ||
                      `${reference.status === "gold" ? "ゴールド" : reference.status === "negative" ? "改善" : "参考"}投稿 | ER ${
                        reference.metrics?.engagementRate?.toFixed?.(1) ?? "-"
                      }% / 保存率 ${reference.metrics?.saveRate?.toFixed?.(1) ?? "-"}%`}
                </button>
                ))}
              </div>
            </div>
          )}


          {latestGeneration?.imageHints?.length ? (
            <div className="mb-6 border border-slate-200 rounded-xl bg-white p-4">
              <p className="text-xs font-semibold text-slate-700 mb-3">推奨ビジュアル</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {latestGeneration.imageHints.map((hint, index) => (
                  <div
                    key={`image-hint-${index}`}
                    className="border border-slate-100 rounded-lg bg-slate-50/70 p-3 text-xs text-slate-700"
                  >
                    <p className="font-semibold text-slate-900">{hint.label}</p>
                    {hint.description ? (
                      <p className="mt-1 text-slate-600 whitespace-pre-line">{hint.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* 投稿設定 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">投稿設定</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-black mb-1">投稿日</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => handleScheduledDateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-black mb-1">投稿時間</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => handleScheduledTimeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] text-sm"
                />
              </div>
            </div>
          </div>

          {/* タイトル入力 */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-800 mb-3">タイトル</label>
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange?.(e.target.value)}
              placeholder={`${postType === "reel" ? "リール" : postType === "story" ? "ストーリーズ" : "フィード"}のタイトルを入力してください...`}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] transition-all duration-200 bg-white/80"
            />
          </div>

          {/* 投稿文入力エリア */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-800 mb-3">投稿文</label>
            <div className="relative">
              <textarea
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                placeholder={`${postType === "reel" ? "リール" : postType === "story" ? "ストーリーズ" : "フィード"}の投稿文を入力してください...`}
                className="w-full h-32 p-4 border-2 border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] transition-all duration-200 bg-white/80 backdrop-blur-sm"
                style={{ fontFamily: "inherit" }}
              />
            </div>
          </div>

          {/* 動画構成セクション（リールのみ） */}
          {postType === "reel" && (
            <div className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🎬</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">動画構成</h3>
                    <p className="text-sm text-gray-600">リール動画の起承転結と構成の流れ</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (onVideoStructureGenerate && content.trim()) {
                      onVideoStructureGenerate(content);
                    } else {
                      showToast("投稿文を入力してから動画構成を生成してください");
                    }
                  }}
                  disabled={!content.trim() || !onVideoStructureGenerate}
                  className="px-4 py-2 bg-gradient-to-r from-orange-400 to-orange-500 text-white hover:from-orange-500 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
                >
                  <Sparkles size={16} />
                  <span>AIで動画構成生成</span>
                </button>
              </div>

              {/* 起承転結 */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-700 mb-3">起承転結</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-orange-800 mb-1">起（導入）</div>
                    <div className="text-sm text-orange-700">
                      {videoStructure?.introduction || "AI投稿文生成で自動生成されます"}
                    </div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-blue-800 mb-1">承（展開）</div>
                    <div className="text-sm text-blue-700">
                      {videoStructure?.development || "AI投稿文生成で自動生成されます"}
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-green-800 mb-1">転（転換）</div>
                    <div className="text-sm text-green-700">
                      {videoStructure?.twist || "AI投稿文生成で自動生成されます"}
                    </div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-purple-800 mb-1">結（結論）</div>
                    <div className="text-sm text-purple-700">
                      {videoStructure?.conclusion || "AI投稿文生成で自動生成されます"}
                    </div>
                  </div>
                </div>
              </div>

              {/* 動画構成の流れ */}
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-3">動画構成の流れ</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-700">
                    {videoFlow || "AI投稿文生成で自動生成されます"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AIヒントセクション（ストーリー・フィード） */}
          {(postType === "story" || postType === "feed") && (
            <div className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200 p-4">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3">💡</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">AIヒント</h3>
                  <p className="text-sm text-gray-600">
                    {postType === "story"
                      ? "投稿文に合う画像・動画のアイデアとストーリーのヒント"
                      : "投稿文に合う画像の枚数やサムネイルのアイデアとフィードのヒント"}
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-orange-100">
                {isGeneratingSuggestions ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mr-3"></div>
                    <span className="text-sm text-gray-600">AIヒントを生成中...</span>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm text-gray-700 whitespace-pre-line">
                      {imageVideoSuggestions?.content || "AI投稿文生成で自動提案されます"}
                    </div>
                    {imageVideoSuggestions?.rationale && (
                      <div className="mt-4 p-3 bg-orange-50 border-l-4 border-orange-300 rounded text-sm text-orange-800 whitespace-pre-line">
                        <p className="font-medium text-orange-900 mb-1">今回の提案理由</p>
                        {imageVideoSuggestions.rationale}
                      </div>
                    )}
                    {latestGeneration?.draft?.hashtagExplanations && latestGeneration.draft.hashtagExplanations.length > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-300 rounded">
                        <p className="font-medium text-blue-900 mb-2 text-sm">ハッシュタグ根拠</p>
                        <div className="space-y-2">
                          {latestGeneration.draft.hashtagExplanations.map((explanation, index) => {
                            const categoryLabel = explanation.category === "brand" ? "企業" : explanation.category === "trending" ? "トレンド" : "補助";
                            const hashtagWithoutHash = explanation.hashtag.replace(/^#+/, "");
                            // Markdown形式の装飾記号を除去
                            const cleanReason = explanation.reason.replace(/\*\*/g, "").replace(/\*/g, "").replace(/_/g, "").trim();
                            return (
                              <div key={index} className="text-xs text-blue-800">
                                <span className="font-medium">#{hashtagWithoutHash}</span>
                                <span className="mx-2 inline-block px-1.5 py-0.5 bg-blue-100 rounded text-blue-700">
                                  {categoryLabel}
                                </span>
                                <span>{cleanReason}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ハッシュタグ表示・編集 */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-800 mb-3">ハッシュタグ</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {hashtags.map((hashtag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 text-sm rounded-full border border-orange-200"
                >
                  <span className="text-orange-600 mr-1">#</span>
                  {hashtag.replace(/^#+/, "")}
                  <button
                    onClick={() => handleHashtagRemove(index)}
                    className="ml-2 text-orange-600 hover:text-orange-800 hover:bg-orange-200 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex space-x-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder={postType === "feed" || postType === "reel" ? "ハッシュタグを入力...（最大5個）" : "ハッシュタグを入力..."}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] transition-all duration-200 bg-white/80"
                  disabled={postType === "feed" || postType === "reel" ? hashtags.length >= 5 : false}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      const hashtag = e.currentTarget.value.trim().replace("#", "");
                      if (hashtag) {
                        handleHashtagAdd(hashtag);
                        e.currentTarget.value = "";
                      }
                    }
                  }}
                />
                {(postType === "feed" || postType === "reel") && hashtags.length >= 5 && (
                  <p className="text-xs text-gray-500 mt-1">ハッシュタグは最大5個までです</p>
                )}
              </div>
              <button
                onClick={() => {
                  const input = document.querySelector(
                    'input[placeholder="ハッシュタグを入力..."]'
                  ) as HTMLInputElement;
                  const hashtag = input.value.trim().replace("#", "");
                  if (hashtag) {
                    handleHashtagAdd(hashtag);
                    input.value = "";
                  }
                }}
                className="px-4 py-2 bg-gradient-to-r from-[#ff8a15] to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                追加
              </button>
            </div>
          </div>

          {/* AI投稿文生成 */}
          <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Sparkles className="mr-2 text-orange-600" size={20} />
              AI投稿文生成
            </h3>

            {/* テーマ入力 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                投稿テーマ（オプション）
              </label>
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={aiPromptPlaceholder}
                disabled={!planData}
                className={`w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] transition-all duration-200 bg-white/80 ${
                  !planData ? "opacity-50 cursor-not-allowed" : ""
                }`}
              />
              {!planData && (
                <p className="text-sm text-orange-600 mt-2">
                  運用計画を作成してからAI投稿文を生成できます
                </p>
              )}
            </div>

            {/* 生成ボタン */}
            <div className="space-y-3">
              {/* 自動生成ボタン */}
              <button
                onClick={handleAutoGenerate}
                disabled={isAutoGenerating || !planData}
                className={`w-full py-2 px-4 font-medium text-sm transition-all duration-200 flex items-center justify-center border-2 ${
                  isAutoGenerating || !planData
                    ? "bg-gray-100 text-black cursor-not-allowed border-gray-200"
                    : "bg-gradient-to-r from-orange-400 to-orange-500 text-white border-orange-500 hover:from-orange-500 hover:to-orange-600 hover:border-orange-600 shadow-lg hover:shadow-xl transform hover:scale-105"
                }`}
              >
                {isAutoGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    自動生成中...
                  </>
                ) : (
                  "自動生成（テーマも自動選択）"
                )}
              </button>

              {/* テーマ指定生成ボタン */}
              <button
                onClick={handleAIGenerate}
                disabled={isGenerating || !planData || !aiPrompt.trim()}
                className={`w-full py-2 px-4 font-medium text-sm transition-all duration-200 flex items-center justify-center border-2 ${
                  isGenerating || !planData || !aiPrompt.trim()
                    ? "bg-gray-100 text-black cursor-not-allowed border-gray-200"
                    : "bg-gradient-to-r from-[#ff8a15] to-orange-600 text-white border-[#ff8a15] hover:from-orange-600 hover:to-[#ff8a15] hover:border-orange-600 shadow-lg hover:shadow-xl transform hover:scale-105"
                }`}
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    生成中...
                  </>
                ) : (
                  "テーマ指定生成"
                )}
              </button>
            </div>
          </div>

          {/* 画像アップロード */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              画像（サムネイル）
            </label>

            {image ? (
              <div className="relative">
                <div className="w-full max-w-md mx-auto">
                  <Image
                    src={image}
                    alt="投稿画像プレビュー"
                    width={400}
                    height={192}
                    className="w-full h-48 object-cover rounded-xl border-2 border-gray-200"
                  />
                  <button
                    onClick={handleImageRemove}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="mt-2 text-center">
                  <button
                    onClick={() => document.getElementById("image-upload")?.click()}
                    className="text-sm text-orange-600 hover:text-orange-800 transition-colors"
                  >
                    別の画像を選択
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-400 transition-colors">
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer flex flex-col items-center space-y-3"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff8a15]"></div>
                      <span className="text-black">アップロード中...</span>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <Upload className="w-6 h-6 text-orange-400" />
                      </div>
                      <div>
                        <p className="text-black font-medium">画像をアップロード</p>
                        <p className="text-sm text-black">クリックしてファイルを選択（5MB以下）</p>
                      </div>
                    </>
                  )}
                </label>
              </div>
            )}
          </div>

          {/* プレビュー */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              プレビュー
            </h3>
            <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-100 shadow-sm">
              {/* 投稿情報ヘッダー */}
              <div className="mb-4 pb-3 border-b border-gray-200">
                <div className="flex items-center justify-between text-xs text-black">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium">
                      {postType === "feed"
                        ? "📸 フィード"
                        : postType === "reel"
                          ? "🎬 リール"
                          : "📱 ストーリーズ"}
                    </span>
                    {scheduledDate && scheduledTime && (
                      <span className="text-black">
                        📅 {new Date(scheduledDate).toLocaleDateString("ja-JP")} {scheduledTime}
                      </span>
                    )}
                  </div>
                  <div className="text-black">
                    {scheduledDate
                      ? new Date(scheduledDate).toLocaleDateString("ja-JP")
                      : new Date().toLocaleDateString("ja-JP")}
                  </div>
                </div>
              </div>

              {/* 投稿内容 */}
              {title && (
                <div className="text-lg font-semibold text-black mb-3">
                  {title
                    .replace(/^[\s#-]+|[\s#-]+$/g, "")
                    .replace(/^#+/g, "")
                    .trim()}
                </div>
              )}

              {/* 画像プレビュー */}
              {image && (
                <div className="mb-3">
                  <Image
                    src={image}
                    alt="投稿画像"
                    width={400}
                    height={192}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}

              {content ? (
                <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {content
                    .replace(/^[\s#-]+|[\s#-]+$/g, "")
                    .replace(/^#+/g, "")
                    .trim()}
                </div>
              ) : (
                <div className="text-black italic text-center py-4">
                  📝 投稿文を入力するとプレビューが表示されます
                </div>
              )}
              {hashtags.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="text-sm text-orange-600 flex flex-wrap gap-1">
                    {hashtags
                      .map((hashtag) => {
                        // ハッシュタグから先頭の#を全て削除してから表示時に#を追加
                        const cleanHashtag = hashtag.replace(/^#+/, "").trim();
                        return `#${cleanHashtag}`;
                      })
                      .join(" ")}
                  </div>
                </div>
              )}
            </div>

            {/* 文字数カウンター */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">文字数</span>
                <span
                  className={`text-sm font-semibold ${isOverLimit ? "text-red-600" : characterCount > maxCharacters * 0.9 ? "text-yellow-600" : "text-green-600"}`}
                >
                  {characterCount} / {maxCharacters}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    isOverLimit
                      ? "bg-gradient-to-r from-red-400 to-red-600"
                      : characterCount > maxCharacters * 0.9
                        ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                        : "bg-gradient-to-r from-green-400 to-blue-500"
                  }`}
                  style={{ width: `${Math.min((characterCount / maxCharacters) * 100, 100)}%` }}
                />
              </div>
              {isOverLimit && (
                <div className="mt-2 flex items-center text-red-600 text-xs">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                  文字数制限を超過しています
                </div>
              )}
            </div>
          </div>

          {/* 保存された投稿一覧 */}
          {savedPosts.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">保存された投稿</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {savedPosts.map((savedContent, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                  >
                    <span className="truncate flex-1">{savedContent.substring(0, 50)}...</span>
                    <button
                      onClick={() => handleLoad(savedContent)}
                      className="ml-2 px-2 py-1 text-orange-600 hover:text-orange-800"
                    >
                      読み込み
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex space-x-3 mt-6">
            <button
              onClick={handleSave}
              disabled={!content.trim() || isSaving}
              className="flex items-center space-x-2 px-4 py-2 bg-[#ff8a15] text-white hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>保存</span>
                </>
              )}
            </button>
            <button
              onClick={handleClear}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={14} />
              <span>クリア</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PostEditor;
