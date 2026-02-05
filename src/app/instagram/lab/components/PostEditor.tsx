"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { Save, RefreshCw, CheckCircle, Upload, X, Eye, Sparkles, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { postsApi } from "../../../../lib/api";
import { useAuth } from "../../../../contexts/auth-context";
import { notify } from "../../../../lib/ui/notifications";
import { authFetch } from "../../../../utils/authFetch";
import Image from "next/image";
// PlanData型をusePlanDataからインポート
import type { PlanData } from "../../../../hooks/usePlanData";
import type {
  AIGenerationResponse,
  AIReference,
  SnapshotReference as AISnapshotReference,
  AIInsightBlock,
} from "@/types/ai";
import { AIReferenceBadge } from "@/components/AIReferenceBadge";
import { PostEditorToast } from "./PostEditorToast";
import { PostEditorHeader } from "./PostEditorHeader";
import { PostEditorSuccessMessage } from "./PostEditorSuccessMessage";
import { PostEditorActions } from "./PostEditorActions";
import { PostEditorContentInput } from "./PostEditorContentInput";
import { PostEditorScheduleSettings } from "./PostEditorScheduleSettings";
import { PostEditorHashtags } from "./PostEditorHashtags";
import { PostEditorImageUpload } from "./PostEditorImageUpload";

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
  onImageVideoSuggestionsGenerate?: (content: string, feedOptions?: { feedPostType: "value" | "empathy" | "story" | "credibility" | "promo" | "brand"; textVolume: "short" | "medium" | "long"; imageCount: number }) => void; // AIヒント生成のコールバック
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
  const [aiGenerateFeedback, setAiGenerateFeedback] = useState<string | null>(null);
  // 後方互換性のため残す（非推奨）
  const [writingStyle, setWritingStyle] = useState<"casual" | "sincere" | null>(null);
  
  // フィード投稿オプション（新規）
  const [feedPostType, setFeedPostType] = useState<"value" | "empathy" | "story" | "credibility" | "promo" | "brand" | null>(null);
  const [textVolume, setTextVolume] = useState<"short" | "medium" | "long" | null>(null);
  const [imageCount, setImageCount] = useState<number>(1);
  
  // 開閉状態管理
  const [isPostTypeOpen, setIsPostTypeOpen] = useState(false);
  const [isTextVolumeOpen, setIsTextVolumeOpen] = useState(false);
  const [isImageCountOpen, setIsImageCountOpen] = useState(false);
  const [showAiAdminWarning, setShowAiAdminWarning] = useState(false);
  const aiFeedbackHistoryRef = useRef<Array<{ category: string; timestamp: number }>>([]);
  
  const [autoGenerateFeedback, setAutoGenerateFeedback] = useState<string | null>(null);
  const [showAutoAdminWarning, setShowAutoAdminWarning] = useState(false);
  const autoFeedbackHistoryRef = useRef<Array<{ category: string; timestamp: number }>>([]);

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
  const [maxCharacters, setMaxCharacters] = useState(2200);
  const [isOverLimit, setIsOverLimit] = useState(false);

  // バリデーションルールをバックエンドから取得
  useEffect(() => {
    const fetchValidationRules = async () => {
      try {
        const response = await authFetch(`/api/post-editor/validation?postType=${postType || "feed"}`);
        if (response.ok) {
          const data = await response.json();
          if (data.limits?.maxCharacters) {
            setMaxCharacters(data.limits.maxCharacters);
          }
        }
      } catch (error) {
        console.error("バリデーションルール取得エラー:", error);
      }
    };
    fetchValidationRules();
  }, [postType]);

  useEffect(() => {
    setIsOverLimit(characterCount > maxCharacters);
  }, [characterCount, maxCharacters]);

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

  // キーボードショートカット（Ctrl+S / Cmd+Sで保存）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (user?.uid && !isSaving && content.trim()) {
          handleSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, isSaving, content]);

  // 画像アップロード処理は PostEditorImageUpload コンポーネントに移動
  // ハッシュタグ処理は PostEditorHashtags コンポーネントに移動

  // 運用計画データを分析してフィードバックを生成
  const analyzePlanData = (plan: PlanData | null): { feedback: string | null; category: string } => {
    if (!plan) {
      return {
        feedback: "運用計画が設定されていません。運用計画ページで計画を作成してください。計画がないと、AIが適切な投稿文を生成できません。",
        category: "no_plan",
      };
    }

    // 目標が不明確
    if (!plan.targetAudience || plan.targetAudience.trim().length < 5) {
      return {
        feedback: `運用計画の「ターゲット層」が不明確です（現在: ${plan.targetAudience || "未設定"}）。具体的なターゲット層（例：「20代の女性、朝の時間にSNSをチェックする習慣がある」）を設定すると、より適切な投稿文が生成されます。運用計画ページでターゲット層を詳しく設定してください。`,
        category: "unclear_target",
      };
    }

    // 戦略が不足
    if (!plan.strategies || plan.strategies.length === 0) {
      return {
        feedback: `運用計画の「取り組みたいこと」が設定されていません。具体的な戦略（例：「写真をたくさん投稿する」「動画（リール）を中心に投稿する」）を設定すると、より効果的な投稿文が生成されます。運用計画ページで戦略を設定してください。`,
        category: "no_strategy",
      };
    }

    // カテゴリが不足
    if (!plan.category || plan.category.trim().length < 3) {
      return {
        feedback: `運用計画の「投稿したい内容」が設定されていません。具体的なカテゴリ（例：「興味を引く内容」「ブランドの世界観」）を設定すると、より魅力的な投稿文が生成されます。運用計画ページでカテゴリを設定してください。`,
        category: "no_category",
      };
    }

    // 問題なし
    return { feedback: null, category: "" };
  };

  // AI自動生成（テーマも自動選択）
  const handleAutoGenerate = async () => {
    // 運用計画データを分析
    const analysis = analyzePlanData(planData ?? null);
    setAutoGenerateFeedback(analysis.feedback);

    // 連続フィードバックの追跡
    if (analysis.feedback) {
      const now = Date.now();
      autoFeedbackHistoryRef.current.push({ category: analysis.category, timestamp: now });
      
      // 3分以内の同じカテゴリのフィードバックをカウント
      const recentSameCategory = autoFeedbackHistoryRef.current.filter(
        (f) => f.category === analysis.category && (now - f.timestamp) < 180000
      );

      if (recentSameCategory.length >= 3) {
        setShowAutoAdminWarning(true);
      } else {
        setShowAutoAdminWarning(false);
      }
    } else {
      // フィードバックがない場合は履歴をリセット
      autoFeedbackHistoryRef.current = [];
      setShowAutoAdminWarning(false);
    }

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
          // フィードの場合はfeedOptionsを使用、それ以外はwritingStyle（後方互換性）
          ...(postType === "feed" && feedPostType && textVolume
            ? {
                feedOptions: {
                  feedPostType,
                  textVolume,
                  imageCount,
                },
              }
            : {
                writingStyle: writingStyle || undefined,
              }),
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
        
        // 成功した場合は、同じカテゴリのフィードバックが続かなかった場合は履歴をクリア
        if (!autoGenerateFeedback) {
          autoFeedbackHistoryRef.current = [];
          setShowAutoAdminWarning(false);
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

  // プロンプト分析関数は utils/post-editor-utils.ts からインポート済み

  // AI投稿文生成（テーマ指定）
  const handleAIGenerate = async () => {
    const trimmedPrompt = aiPrompt.trim();
    
    if (!trimmedPrompt) {
      showToast("投稿のテーマを入力してください");
      return;
    }

    // プロンプト内容を分析（バックエンドAPI経由）
    let analysis = { feedback: null as string | null, category: "" };
    try {
      const response = await authFetch("/api/post-editor/validation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "prompt",
          prompt: trimmedPrompt,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        analysis = data.feedback || { feedback: null, category: "" };
      }
    } catch (error) {
      console.error("プロンプト分析エラー:", error);
    }
    setAiGenerateFeedback(analysis.feedback);

    // 連続フィードバックの追跡
    if (analysis.feedback) {
      const now = Date.now();
      aiFeedbackHistoryRef.current.push({ category: analysis.category, timestamp: now });
      
      // 3分以内の同じカテゴリのフィードバックをカウント
      const recentSameCategory = aiFeedbackHistoryRef.current.filter(
        (f) => f.category === analysis.category && (now - f.timestamp) < 180000
      );

      if (recentSameCategory.length >= 3) {
        setShowAiAdminWarning(true);
      } else {
        setShowAiAdminWarning(false);
      }
    } else {
      // フィードバックがない場合は履歴をリセット（成功したということ）
      aiFeedbackHistoryRef.current = [];
      setShowAiAdminWarning(false);
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
          // フィードの場合はfeedOptionsを使用、それ以外はwritingStyle（後方互換性）
          ...(postType === "feed" && feedPostType && textVolume
            ? {
                feedOptions: {
                  feedPostType,
                  textVolume,
                  imageCount,
                },
              }
            : {
                writingStyle: writingStyle || undefined,
              }),
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
        
        // 成功した場合は、同じカテゴリのフィードバックが続かなかった場合は履歴をクリア
        if (!aiGenerateFeedback) {
          aiFeedbackHistoryRef.current = [];
          setShowAiAdminWarning(false);
        }

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
        <PostEditorToast
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}

      <div className="bg-white border border-gray-200 flex flex-col">
        {/* ヘッダー */}
        <PostEditorHeader />

        {/* 成功メッセージ */}
        <PostEditorSuccessMessage show={showSuccessMessage} />

        <div className="p-6 flex-1 flex flex-col min-h-0 overflow-auto">
          {snapshotReferences.length > 0 && (
            <div className="mb-6 border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                AIが参照した投稿
              </p>
              <div className="flex flex-wrap gap-2">
                {snapshotReferences.map((reference) => (
                <button
                    key={reference.id}
                  type="button"
                  onClick={() => onSnapshotReferenceClick?.(reference.id)}
                  className={`text-[11px] px-3 py-1 border transition-colors ${
                      reference.status === "gold"
                      ? "border-amber-300 bg-white text-amber-700 hover:bg-amber-50"
                        : reference.status === "negative"
                        ? "border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  aria-label={`${reference.summary || `${reference.status === "gold" ? "ゴールド" : reference.status === "negative" ? "改善" : "参考"}投稿`}を参照`}
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
            <div className="mb-6 border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold text-slate-700 mb-3">推奨ビジュアル</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {latestGeneration.imageHints.map((hint, index) => (
                  <div
                    key={`image-hint-${index}`}
                    className="border border-slate-100 bg-slate-50/70 p-3 text-xs text-slate-700"
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

          {/* AI投稿文生成 */}
          <div className="mb-6 bg-white border border-gray-200 p-6">
            <div className="mb-6">
              <div className="flex items-center mb-2">
                  <div className="w-8 h-8 flex items-center justify-center mr-3" style={{ backgroundColor: "#ff8a15" }}>
                    <Sparkles size={18} className="text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 tracking-tight">AI投稿文生成</h3>
              </div>
              <p className="text-xs text-gray-500 ml-11">
                運用計画に基づいてAIが投稿文を自動生成します
              </p>
            </div>

            {/* テーマ入力 */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                投稿テーマ（オプション）
              </label>
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={aiPromptPlaceholder}
                disabled={!planData}
                className={`w-full px-4 py-2.5 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200 bg-white text-sm ${
                  !planData ? "opacity-40 cursor-not-allowed bg-gray-50" : ""
                }`}
              />
              {!planData && (
                <p className="text-xs text-gray-500 mt-2">
                  運用計画を作成してからAI投稿文を生成できます
                </p>
              )}
            </div>

            {/* フィード投稿オプション（フィードのみ） */}
            {postType === "feed" && (
              <div className="mb-4 space-y-2">
                {/* 投稿タイプ選択（開閉式） */}
                <div className="border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsPostTypeOpen(!isPostTypeOpen)}
                    disabled={!planData}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors ${
                      !planData ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <span>投稿の目的は？</span>
                    {feedPostType && (
                      <span className="text-xs text-gray-700 font-medium mr-2">
                        {[
                          { value: "value", label: "情報有益型" },
                          { value: "empathy", label: "共感型" },
                          { value: "story", label: "ストーリー型" },
                          { value: "credibility", label: "実績・信頼型" },
                          { value: "promo", label: "告知・CTA型" },
                          { value: "brand", label: "ブランド型" },
                        ].find((t) => t.value === feedPostType)?.label}
                      </span>
                    )}
                    {isPostTypeOpen ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isPostTypeOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="p-4 bg-gray-50">
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: "value", label: "情報有益型", desc: "ノウハウ・Tips" },
                          { value: "empathy", label: "共感型", desc: "悩み・あるある" },
                          { value: "story", label: "ストーリー型", desc: "体験・背景" },
                          { value: "credibility", label: "実績・信頼型", desc: "数字・事例" },
                          { value: "promo", label: "告知・CTA型", desc: "キャンペーン" },
                          { value: "brand", label: "ブランド型", desc: "世界観" },
                        ].map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => {
                              setFeedPostType(type.value as typeof feedPostType);
                              setIsPostTypeOpen(false);
                            }}
                            disabled={!planData}
                            className={`py-2 px-3 text-xs font-medium border transition-all duration-200 ${
                              feedPostType === type.value
                                ? "bg-gray-900 border-gray-900 text-white"
                                : "bg-white border-gray-300 text-gray-700 hover:border-gray-900 hover:bg-gray-50"
                            } ${!planData ? "opacity-40 cursor-not-allowed" : ""}`}
                            aria-label={`${type.label}を選択`}
                            aria-pressed={feedPostType === type.value}
                          >
                            <div className="font-semibold">{type.label}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{type.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 文字量選択（開閉式） */}
                <div className="border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsTextVolumeOpen(!isTextVolumeOpen)}
                    disabled={!planData}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors ${
                      !planData ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <span>文章量は？</span>
                    {textVolume && (
                      <span className="text-xs text-gray-700 font-medium mr-2">
                        {[
                          { value: "short", label: "軽め" },
                          { value: "medium", label: "ふつう" },
                          { value: "long", label: "しっかり" },
                        ].find((v) => v.value === textVolume)?.label}
                      </span>
                    )}
                    {isTextVolumeOpen ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isTextVolumeOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="p-4 bg-gray-50">
                      <div className="flex gap-2">
                        {[
                          { value: "short", label: "軽め", desc: "80-120文字" },
                          { value: "medium", label: "ふつう", desc: "150-200文字" },
                          { value: "long", label: "しっかり", desc: "250-400文字" },
                        ].map((volume) => (
                          <button
                            key={volume.value}
                            type="button"
                            onClick={() => {
                              setTextVolume(volume.value as typeof textVolume);
                              setIsTextVolumeOpen(false);
                            }}
                            disabled={!planData}
                            className={`flex-1 py-2 px-4 text-sm font-medium border transition-all duration-200 ${
                              textVolume === volume.value
                                ? "bg-gray-900 border-gray-900 text-white"
                                : "bg-white border-gray-300 text-gray-700 hover:border-gray-900 hover:bg-gray-50"
                            } ${!planData ? "opacity-40 cursor-not-allowed" : ""}`}
                            aria-label={`${volume.label}を選択`}
                            aria-pressed={textVolume === volume.value}
                          >
                            {volume.label}
                            <span className="block text-xs mt-1 text-gray-500">{volume.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 画像枚数選択（開閉式） */}
                <div className="border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsImageCountOpen(!isImageCountOpen)}
                    disabled={!planData}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors ${
                      !planData ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <span>使用する画像の枚数</span>
                    {imageCount && (
                      <span className="text-xs text-gray-700 font-medium mr-2">{imageCount}枚</span>
                    )}
                    {isImageCountOpen ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isImageCountOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="p-4 bg-gray-50">
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((count) => (
                          <button
                            key={count}
                            type="button"
                            onClick={() => {
                              setImageCount(count);
                              setIsImageCountOpen(false);
                            }}
                            disabled={!planData}
                            className={`flex-1 py-2 px-4 text-sm font-medium border transition-all duration-200 ${
                              imageCount === count
                                ? "bg-gray-900 border-gray-900 text-white"
                                : "bg-white border-gray-300 text-gray-700 hover:border-gray-900 hover:bg-gray-50"
                            } ${!planData ? "opacity-40 cursor-not-allowed" : ""}`}
                            aria-label={`${count}枚を選択`}
                            aria-pressed={imageCount === count}
                          >
                            {count}枚
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 生成ボタン */}
            <div className="space-y-3">
              {/* 自動生成ボタン */}
              <button
                onClick={handleAutoGenerate}
                disabled={isAutoGenerating || !planData}
                className={`w-full py-2.5 px-4 font-medium text-sm transition-colors duration-200 flex items-center justify-center text-white ${
                  isAutoGenerating || !planData
                    ? "cursor-not-allowed"
                    : ""
                }`}
                style={{
                  backgroundColor: isAutoGenerating || !planData ? "#d1d5db" : "#ff8a15",
                }}
                onMouseEnter={(e) => {
                  if (!isAutoGenerating && planData) {
                    e.currentTarget.style.backgroundColor = "#e67a0f";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isAutoGenerating && planData) {
                    e.currentTarget.style.backgroundColor = "#ff8a15";
                  }
                }}
                aria-label="投稿文を自動生成（テーマも自動選択）"
              >
                {isAutoGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="mr-2" />
                    <span>自動生成</span>
                  </>
                )}
              </button>

              {/* テーマ指定生成ボタン */}
              <button
                onClick={handleAIGenerate}
                disabled={isGenerating || !planData || !aiPrompt.trim()}
                className={`w-full py-2.5 px-4 font-medium text-sm transition-colors duration-200 flex items-center justify-center text-white ${
                  isGenerating || !planData || !aiPrompt.trim()
                    ? "cursor-not-allowed"
                    : ""
                }`}
                style={{
                  backgroundColor: isGenerating || !planData || !aiPrompt.trim() ? "#d1d5db" : "#ff8a15",
                }}
                onMouseEnter={(e) => {
                  if (!isGenerating && planData && aiPrompt.trim()) {
                    e.currentTarget.style.backgroundColor = "#e67a0f";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isGenerating && planData && aiPrompt.trim()) {
                    e.currentTarget.style.backgroundColor = "#ff8a15";
                  }
                }}
                aria-label="テーマを指定して投稿文を生成"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="mr-2" />
                    <span>テーマ指定生成</span>
                  </>
                )}
              </button>
            </div>

            {/* フィードバック表示 */}
            {aiGenerateFeedback && (
              <div className="mt-4 p-3 bg-amber-50 border-l-4 border-amber-400 text-sm text-amber-800">
                {aiGenerateFeedback}
              </div>
            )}

            {/* 管理者警告 */}
            {showAiAdminWarning && (
              <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-400 text-sm text-red-800 flex items-start">
                <AlertTriangle className="mr-2 mt-0.5 flex-shrink-0" size={16} />
                <div>
                  <p className="font-medium">連続して同じフィードバックが表示されています</p>
                  <p className="mt-1 text-xs">
                    プロンプトの内容を見直すか、しばらく時間をおいてから再度お試しください。
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* AIヒントセクション（ストーリー・フィード） */}
          {(postType === "story" || postType === "feed") && (
            <div className="mb-6 bg-white border border-gray-200 p-6">
              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 flex items-center justify-center mr-3" style={{ backgroundColor: "#ff8a15" }}>
                    <Sparkles size={18} className="text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 tracking-tight">AIヒント</h3>
                </div>
                <p className="text-xs text-gray-500 ml-11">
                  {postType === "story"
                    ? "投稿文に合う画像・動画のアイデアとストーリーのヒント"
                    : "投稿文に合う画像の枚数やサムネイルのアイデアとフィードのヒント"}
                </p>
                <p className="text-xs text-gray-500 ml-11 mt-1">
                  AI投稿文生成で自動生成されます
                </p>
              </div>
              {isGeneratingSuggestions ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-gray-900 mx-auto mb-2"></div>
                    <span className="text-xs text-gray-500">AIが分析中です...</span>
                  </div>
                </div>
              ) : (
                <div>
                  {imageVideoSuggestions?.content ? (
                    <div className="bg-gray-50 border border-gray-200 p-4">
                      <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                        {imageVideoSuggestions.content}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 p-4">
                      <p className="text-sm text-gray-400 text-center">AI投稿文生成で自動提案されます</p>
                    </div>
                  )}
                  {imageVideoSuggestions?.rationale && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">提案理由</p>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                        {imageVideoSuggestions.rationale}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 動画構成セクション（リールのみ） */}
          {postType === "reel" && (
            <div className="mb-6 bg-white border border-gray-200 p-6">
              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 flex items-center justify-center mr-3" style={{ backgroundColor: "#ff8a15" }}>
                    <Sparkles size={18} className="text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 tracking-tight">動画構成</h3>
                </div>
                <p className="text-xs text-gray-500 ml-11">
                  AI投稿文生成で自動生成されます
                </p>
              </div>

              {/* 起承転結 */}
              <div className="mb-6">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">起承転結</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 border border-gray-200 p-3">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">起（導入）</div>
                    <div className="text-sm text-gray-800 leading-relaxed">
                      {videoStructure?.introduction || "AI投稿文生成で自動生成されます"}
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 p-3">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">承（展開）</div>
                    <div className="text-sm text-gray-800 leading-relaxed">
                      {videoStructure?.development || "AI投稿文生成で自動生成されます"}
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 p-3">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">転（転換）</div>
                    <div className="text-sm text-gray-800 leading-relaxed">
                      {videoStructure?.twist || "AI投稿文生成で自動生成されます"}
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 p-3">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">結（結論）</div>
                    <div className="text-sm text-gray-800 leading-relaxed">
                      {videoStructure?.conclusion || "AI投稿文生成で自動生成されます"}
                    </div>
                  </div>
                </div>
              </div>

              {/* 動画構成の流れ */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">動画構成の流れ</h4>
                <div className="bg-gray-50 border border-gray-200 p-4">
                  <div className="text-sm text-gray-800 leading-relaxed">
                    {videoFlow || "AI投稿文生成で自動生成されます"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 投稿設定 */}
          <PostEditorScheduleSettings
            scheduledDate={scheduledDate}
            onScheduledDateChange={handleScheduledDateChange}
            scheduledTime={scheduledTime}
            onScheduledTimeChange={handleScheduledTimeChange}
          />

          {/* タイトル・投稿文入力 */}
          <PostEditorContentInput
            title={title}
            onTitleChange={onTitleChange}
            content={content}
            onContentChange={onContentChange}
            postType={postType}
          />

          {/* ハッシュタグ表示・編集 */}
          <PostEditorHashtags
            hashtags={hashtags}
            onHashtagsChange={onHashtagsChange}
            postType={postType}
          />

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
                      className="ml-2 px-2 py-1 text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                      aria-label={`保存された投稿「${savedContent.substring(0, 30)}...」を読み込む`}
                    >
                      読み込み
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* アクションボタン */}
          <PostEditorActions
            onSave={handleSave}
            onClear={handleClear}
            isSaving={isSaving}
            canSave={!!content.trim()}
          />
        </div>
      </div>
    </>
  );
};

export default PostEditor;
