"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import SNSLayout from "../../../../components/sns-layout";
import PostEditor, { AIHintSuggestion, SnapshotReference } from "../components/PostEditor";
import ToolPanel from "../components/ToolPanel";
import PostPreview from "../components/PostPreview";
import { usePlanData } from "../../../../hooks/usePlanData";
import { useAuth } from "../../../../contexts/auth-context";
import { authFetch } from "../../../../utils/authFetch";
import { useScheduleGeneration } from "../../../../hooks/useScheduleGeneration";
import { useBusinessInfo } from "../../../../hooks/useBusinessInfo";
import ABTestSidebarSection from "../components/ABTestSidebarSection";
import { notify } from "../../../../lib/ui/notifications";
import { AlertTriangle } from "lucide-react";

export default function FeedLabPage() {
  const [postContent, setPostContent] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [postType] = useState<"feed" | "reel" | "story">("feed");
  const [postImage, setPostImage] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isAIGenerated] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  // スケジュール関連の状態
  const [monthlyPosts, setMonthlyPosts] = useState(8);
  const [dailyPosts, setDailyPosts] = useState(1);
  const [generatedSchedule, setGeneratedSchedule] = useState<
    Array<{
      day: string;
      dayName: string;
      posts: Array<{
        title: string;
        description: string;
        emoji: string;
        category: string;
      }>;
    }>
  >([]);

  // AIヒント関連の状態
  const [imageVideoSuggestions, setImageVideoSuggestions] = useState<AIHintSuggestion | null>(null);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [snapshotReferences, setSnapshotReferences] = useState<SnapshotReference[]>([]);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  // フィードバック関連の状態
  const [scheduleFeedback, setScheduleFeedback] = useState<string | null>(null);
  const [showScheduleAdminWarning, setShowScheduleAdminWarning] = useState(false);
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  
  const [suggestionsFeedback, setSuggestionsFeedback] = useState<string | null>(null);
  const suggestionsFeedbackHistoryRef = useRef<Array<{ category: string; timestamp: number }>>([]);
  const [showSuggestionsAdminWarning, setShowSuggestionsAdminWarning] = useState(false);

  // 計画データを取得
  const { planData } = usePlanData("instagram");
  const { user } = useAuth();
  const isAuthReady = useMemo(() => Boolean(user), [user]);
  const { fetchBusinessInfo } = useBusinessInfo();

  // 投稿データを取得する関数
  const fetchPostData = useCallback(
    async (postId: string) => {
      if (!isAuthReady) {return;}

      try {
        const response = await authFetch("/api/posts");

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log("API Response:", result);

        if (result.posts && Array.isArray(result.posts)) {
          const post = result.posts.find((p: { id: string }) => p.id === postId);
          console.log("Found post for editing:", post);

          if (post) {
            // 投稿データをフォームに設定
            console.log("Setting form data:", {
              title: post.title,
              content: post.content,
              hashtags: post.hashtags,
              scheduledDate: post.scheduledDate,
              scheduledTime: post.scheduledTime,
              imageData: post.imageData ? "exists" : "none",
            });

            setPostTitle(post.title || "");
            setPostContent(post.content || "");

            // ハッシュタグを配列に変換
            const hashtags = Array.isArray(post.hashtags)
              ? post.hashtags
              : typeof post.hashtags === "string"
                ? post.hashtags
                    .split(" ")
                    .filter((tag: string) => tag.trim() !== "")
                    .map((tag: string) => tag.replace("#", ""))
                : [];
            setSelectedHashtags(hashtags);

            // スケジュール情報を設定
            if (post.scheduledDate) {
              const scheduledDate =
                post.scheduledDate instanceof Date
                  ? post.scheduledDate
                  : typeof post.scheduledDate === "string"
                    ? new Date(post.scheduledDate)
                    : post.scheduledDate?.toDate
                      ? post.scheduledDate.toDate()
                      : null;
              if (scheduledDate) {
                setScheduledDate(scheduledDate.toISOString().split("T")[0]);
              }
            }

            if (post.scheduledTime) {
              setScheduledTime(post.scheduledTime);
            }

            // 画像データを設定（imageDataまたはimageUrl）
            if (post.imageData) {
              setPostImage(post.imageData);
            } else if (post.imageUrl) {
              // imageUrlがある場合は、Base64に変換するか、そのまま使用
              // 注意: imageUrlは外部URLの可能性があるため、そのまま使用
              setPostImage(post.imageUrl);
            }

          setSnapshotReferences(post.snapshotReferences || []);

            console.log("Form data set successfully");
          } else {
            console.error("Post not found with ID:", postId);
          }
        } else {
          console.error("Invalid API response structure:", result);
        }
      } catch (error) {
        console.error("投稿データ取得エラー:", error);
      }
    },
    [isAuthReady]
  );

  // ログイン後のトースト表示（初回マウント時のみ）
  useEffect(() => {
    if (isAuthReady && isMounted) {
      // URLパラメータでログイン成功フラグをチェック
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("login") === "success") {
        notify({ type: "success", message: "ログインしました" });
        // URLパラメータを削除（ブラウザ履歴をクリーンに保つ）
        urlParams.delete("login");
        const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : "");
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, [isAuthReady, isMounted]);

  // URLパラメータの変更を監視
  useEffect(() => {
    const handleUrlChange = () => {
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get("edit");
        const postId = urlParams.get("postId");

        console.log("URL changed, parameters:", { editId, postId });

        const targetId = editId || postId;
        if (targetId && isAuthReady) {
          console.log("URL change detected, loading post data for ID:", targetId);
          setEditingPostId(targetId);
          fetchPostData(targetId);
        } else {
          setEditingPostId(null);
        }
      }
    };

    // 初回読み込み
    handleUrlChange();

    // popstateイベント（ブラウザの戻る/進むボタン）を監視
    window.addEventListener("popstate", handleUrlChange);

    return () => {
      window.removeEventListener("popstate", handleUrlChange);
    };
  }, [isAuthReady, fetchPostData]);

  // スケジュール設定を分析してフィードバックを生成
  const analyzeScheduleSettings = (): { feedback: string | null; category: string } => {
    // 投稿頻度が低すぎる
    if (monthlyPosts < 4) {
      return {
        feedback: `投稿頻度が低すぎるようです（月${monthlyPosts}回）。週1回（月4回）以上に設定すると、より効果的なスケジュールが生成されます。継続的な投稿がフォロワー獲得には重要です。`,
        category: "low_frequency",
      };
    }

    // 1日の投稿回数が多すぎる
    if (dailyPosts > 3) {
      return {
        feedback: `1日の投稿回数が多すぎるようです（${dailyPosts}回）。1日1-2回程度が推奨です。投稿の質を保つためにも、無理のない頻度に設定してください。`,
        category: "too_many_daily",
      };
    }

    // 問題なし
    return { feedback: null, category: "" };
  };

  // スケジュール生成フックを使用
  const { generateSchedule } = useScheduleGeneration({
    postType: "feed",
    monthlyPosts,
    dailyPosts,
    analyzeScheduleSettings,
    scheduleFeedback,
    setGeneratedSchedule,
    setScheduleFeedback,
    setShowScheduleAdminWarning,
    setIsGeneratingSchedule,
    setSaveMessage,
    isAuthReady,
  });

  // スケジュール保存関数
  const saveSchedule = useCallback(async () => {
    if (!isAuthReady || generatedSchedule.length === 0) {
      setSaveMessage("スケジュールが生成されていません");
      return;
    }

    setIsSavingSchedule(true);
    setSaveMessage("");

    try {
      // ビジネス情報を取得（キャッシュ付き）
      const businessInfo = await fetchBusinessInfo();
      if (!businessInfo) {
        throw new Error("ビジネス情報の取得に失敗しました");
      }

      // スケジュール保存APIを呼び出し
      const saveResponse = await authFetch("/api/instagram/schedule-save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scheduleType: "feed",
          scheduleData: generatedSchedule,
          monthlyPosts,
          dailyPosts,
          businessInfo: businessInfo.businessInfo,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error("スケジュール保存に失敗しました");
      }

      await saveResponse.json();
      setSaveMessage("✅ スケジュールが保存されました！");
    } catch (error) {
      console.error("スケジュール保存エラー:", error);
      setSaveMessage("❌ スケジュール保存に失敗しました");
    } finally {
      setIsSavingSchedule(false);
    }
  }, [isAuthReady, generatedSchedule, monthlyPosts, dailyPosts, fetchBusinessInfo]);

  // 保存されたスケジュールを読み込む関数
  const loadSavedSchedule = useCallback(async () => {
    if (!isAuthReady) {return;}

    try {
      const response = await authFetch(`/api/instagram/schedule-save?scheduleType=feed`);

      if (response.ok) {
        const result = await response.json();
        if (result.schedule) {
          setGeneratedSchedule(result.schedule.schedule || []);
          setMonthlyPosts(result.schedule.monthlyPosts || 8);
          setDailyPosts(result.schedule.dailyPosts || 1);
          notify({ type: "success", message: "保存されたスケジュールを読み込みました" });
        }
      }
    } catch (error) {
      console.error("スケジュール読み込みエラー:", error);
    }
  }, [isAuthReady]);


  // コンテンツを分析してフィードバックを生成
  const analyzeContent = (content: string): { feedback: string | null; category: string } => {
    const trimmed = content.trim();
    const length = trimmed.length;

    if (length === 0) {
      return {
        feedback: "投稿文が入力されていません。AIヒントを生成するには、まず投稿文を作成してください。",
        category: "no_content",
      };
    }

    // 短すぎる場合
    if (length < 20) {
      return {
        feedback: `投稿文が短すぎるようです（${length}文字）。もう少し詳しい内容（商品の特徴、イベントの詳細、伝えたいメッセージなど）を含めると、より具体的で効果的な画像・動画の提案が生成されます。`,
        category: "too_short",
      };
    }

    // 問題なし
    return { feedback: null, category: "" };
  };

  // AIヒント生成関数
  const generateImageVideoSuggestions = useCallback(
    async (content: string) => {
      if (!isAuthReady) {return;}

      // コンテンツを分析
      const analysis = analyzeContent(content);
      setSuggestionsFeedback(analysis.feedback);

      // 連続フィードバックの追跡
      if (analysis.feedback) {
        const now = Date.now();
        suggestionsFeedbackHistoryRef.current.push({ category: analysis.category, timestamp: now });
        
        // 3分以内の同じカテゴリのフィードバックをカウント
        const recentSameCategory = suggestionsFeedbackHistoryRef.current.filter(
          (f) => f.category === analysis.category && (now - f.timestamp) < 180000
        );

        if (recentSameCategory.length >= 3) {
          setShowSuggestionsAdminWarning(true);
        } else {
          setShowSuggestionsAdminWarning(false);
        }
      } else {
        // フィードバックがない場合は履歴をリセット
        suggestionsFeedbackHistoryRef.current = [];
        setShowSuggestionsAdminWarning(false);
      }

      setIsGeneratingSuggestions(true);
      try {
        // ビジネス情報を取得（キャッシュ付き）
        const businessInfo = await fetchBusinessInfo();
        if (!businessInfo) {
          throw new Error("ビジネス情報の取得に失敗しました");
        }

        // AIヒントを生成
        const suggestionsResponse = await authFetch("/api/instagram/feed-suggestions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content,
            businessInfo: businessInfo.businessInfo,
          }),
        });

        if (!suggestionsResponse.ok) {
          throw new Error("AIヒントの生成に失敗しました");
        }

        const suggestionsData = await suggestionsResponse.json();
        setImageVideoSuggestions({
          content: suggestionsData.suggestions,
          rationale: typeof suggestionsData.rationale === "string" && suggestionsData.rationale.trim().length > 0
            ? suggestionsData.rationale
            : undefined,
        });
        
        // 成功した場合は、同じカテゴリのフィードバックが続かなかった場合は履歴をクリア
        if (!suggestionsFeedback) {
          suggestionsFeedbackHistoryRef.current = [];
          setShowSuggestionsAdminWarning(false);
        }
      } catch (error) {
        console.error("AIヒント生成エラー:", error);
      } finally {
        setIsGeneratingSuggestions(false);
      }
    },
    [isAuthReady, suggestionsFeedback, fetchBusinessInfo]
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isAuthReady) {
      loadSavedSchedule(); // 保存されたスケジュールを読み込み
    }
  }, [isAuthReady, loadSavedSchedule]);

  if (!isMounted) {
    return null;
  }


  return (
    <SNSLayout
      customTitle="フィードラボ"
      customDescription="Instagramフィード投稿の作成・編集"
      contentClassName="py-0 sm:py-0"
    >
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 bg-white min-h-screen pt-4 pb-0">
        {/* 2カラムレイアウト */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 [&>*:last-child]:mb-0" style={{ alignItems: 'stretch' }}>
          {/* 左カラム: フィード投稿エディター */}
          <div className="flex flex-col">
            <PostEditor
              content={postContent}
              onContentChange={setPostContent}
              title={postTitle}
              onTitleChange={setPostTitle}
              hashtags={selectedHashtags}
              onHashtagsChange={setSelectedHashtags}
              postType={postType}
              image={postImage}
              onImageChange={setPostImage}
              scheduledDate={scheduledDate}
              onScheduledDateChange={setScheduledDate}
              scheduledTime={scheduledTime}
              onScheduledTimeChange={setScheduledTime}
              isAIGenerated={isAIGenerated}
              planData={planData}
              aiPromptPlaceholder="例: 新商品の紹介、ブランドストーリー、お客様の声、会社の取り組みなど..."
              imageVideoSuggestions={imageVideoSuggestions}
              onImageVideoSuggestionsGenerate={generateImageVideoSuggestions}
              isGeneratingSuggestions={isGeneratingSuggestions}
              initialSnapshotReferences={snapshotReferences}
              onSnapshotReferencesChange={setSnapshotReferences}
              editingPostId={editingPostId}
            />
          </div>

          {/* 右カラム: プレビューとツールパネル */}
          <div className="flex flex-col">
            {/* プレビュー */}
            <div className="mb-6 flex-shrink-0">
              <PostPreview
                title={postTitle}
                content={postContent}
                image={postImage}
                hashtags={selectedHashtags}
                postType={postType}
                scheduledDate={scheduledDate}
                scheduledTime={scheduledTime}
                onImageChange={setPostImage}
              />
            </div>
            <div className="flex-shrink-0">
              <ABTestSidebarSection currentPostTitle={postTitle} />
            </div>
            <div className="mt-6 flex-shrink-0">
              <ToolPanel
                onTemplateSelect={(template) => setPostContent(template)}
                onHashtagSelect={(hashtag) => {
                  if (!selectedHashtags.includes(hashtag)) {
                    setSelectedHashtags([...selectedHashtags, hashtag]);
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </SNSLayout>
  );
}
