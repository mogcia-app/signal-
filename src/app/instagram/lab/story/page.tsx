"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import SNSLayout from "../../../../components/sns-layout";
import PostEditor, { AIHintSuggestion } from "../components/PostEditor";
import ToolPanel from "../components/ToolPanel";
import CommentReplyAssistant from "../components/CommentReplyAssistant";
import ABTestSidebarSection from "../components/ABTestSidebarSection";
import { usePlanData } from "../../../../hooks/usePlanData";
import { useAuth } from "../../../../contexts/auth-context";
import { authFetch } from "../../../../utils/authFetch";
import { notify } from "../../../../lib/ui/notifications";
import { AlertTriangle } from "lucide-react";

export default function StoryLabPage() {
  const [postContent, setPostContent] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [postType] = useState<"feed" | "reel" | "story">("story");
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
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  // AIヒント関連の状態
  const [imageVideoSuggestions, setImageVideoSuggestions] = useState<AIHintSuggestion | null>(null);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

  // フィードバック関連の状態
  const [scheduleFeedback, setScheduleFeedback] = useState<string | null>(null);
  const [showScheduleAdminWarning, setShowScheduleAdminWarning] = useState(false);
  const scheduleFeedbackHistoryRef = useRef<Array<{ category: string; timestamp: number }>>([]);
  const [suggestionsFeedback, setSuggestionsFeedback] = useState<string | null>(null);
  const [showSuggestionsAdminWarning, setShowSuggestionsAdminWarning] = useState(false);
  const suggestionsFeedbackHistoryRef = useRef<Array<{ category: string; timestamp: number }>>([]);

  // 計画データを取得
  const { planData } = usePlanData("instagram");
  const { user } = useAuth();
  const isAuthReady = useMemo(() => Boolean(user), [user]);

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

  // URLパラメータから投稿IDを取得して投稿データを読み込む
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const editId = urlParams.get("edit");
      const postId = urlParams.get("postId");

      console.log("URL parameters:", { editId, postId });

      // editまたはpostIdパラメータがある場合に投稿データを取得
      const targetId = editId || postId;
      if (targetId && isAuthReady) {
        console.log("Loading post data for ID:", targetId);
        setEditingPostId(targetId);
        fetchPostData(targetId);
      } else {
        setEditingPostId(null);
      }
    }
  }, [isAuthReady, fetchPostData]);

  // 分析データを取得
  // スケジュール設定を分析してフィードバックを生成
  const analyzeScheduleSettings = (): { feedback: string | null; category: string } => {
    if (monthlyPosts < 4) {
      return {
        feedback: `投稿頻度が低すぎるようです（月${monthlyPosts}回）。週1回（月4回）以上に設定すると、より効果的なスケジュールが生成されます。継続的な投稿がフォロワー獲得には重要です。`,
        category: "low_frequency",
      };
    }
    if (dailyPosts > 3) {
      return {
        feedback: `1日の投稿回数が多すぎるようです（${dailyPosts}回）。1日1-2回程度が推奨です。投稿の質を保つためにも、無理のない頻度に設定してください。`,
        category: "too_many_daily",
      };
    }
    return { feedback: null, category: "" };
  };

  // スケジュール生成関数
  const generateSchedule = useCallback(async () => {
    if (!isAuthReady) {return;}

    // スケジュール設定を分析
    const analysis = analyzeScheduleSettings();
    setScheduleFeedback(analysis.feedback);

    // 連続フィードバックの追跡
    if (analysis.feedback) {
      const now = Date.now();
      scheduleFeedbackHistoryRef.current.push({ category: analysis.category, timestamp: now });
      const recentSameCategory = scheduleFeedbackHistoryRef.current.filter(
        (f) => f.category === analysis.category && (now - f.timestamp) < 180000
      );
      if (recentSameCategory.length >= 3) {
        setShowScheduleAdminWarning(true);
      } else {
        setShowScheduleAdminWarning(false);
      }
    } else {
      scheduleFeedbackHistoryRef.current = [];
      setShowScheduleAdminWarning(false);
    }

    setIsGeneratingSchedule(true);
    setScheduleError("");

    try {
      // ビジネス情報を取得
      const businessResponse = await authFetch("/api/user/business-info");

      if (!businessResponse.ok) {
        throw new Error("ビジネス情報の取得に失敗しました");
      }

      const businessData = await businessResponse.json();

      // スケジュール生成APIを呼び出し
      const scheduleResponse = await authFetch("/api/instagram/story-schedule", {
        method: "POST",
        body: JSON.stringify({
          monthlyPosts,
          dailyPosts,
          businessInfo: businessData.businessInfo,
        }),
      });

      if (!scheduleResponse.ok) {
        throw new Error("スケジュール生成に失敗しました");
      }

      const scheduleData = await scheduleResponse.json();
      setGeneratedSchedule(scheduleData.schedule || []);
      
      // 成功した場合は、同じカテゴリのフィードバックが続かなかった場合は履歴をクリア
      if (!scheduleFeedback) {
        scheduleFeedbackHistoryRef.current = [];
        setShowScheduleAdminWarning(false);
      }
    } catch (error) {
      console.error("スケジュール生成エラー:", error);
      setScheduleError(error instanceof Error ? error.message : "スケジュール生成に失敗しました");
    } finally {
      setIsGeneratingSchedule(false);
    }
  }, [isAuthReady, monthlyPosts, dailyPosts, analyzeScheduleSettings, scheduleFeedback]);

  // スケジュール保存関数
  const saveSchedule = useCallback(async () => {
    if (!isAuthReady || generatedSchedule.length === 0) {
      setSaveMessage("スケジュールが生成されていません");
      return;
    }

    setIsSavingSchedule(true);
    setSaveMessage("");

    try {
      // ビジネス情報を取得
      const businessResponse = await authFetch("/api/user/business-info");

      if (!businessResponse.ok) {
        throw new Error("ビジネス情報の取得に失敗しました");
      }

      const businessData = await businessResponse.json();

      // スケジュール保存APIを呼び出し
      const saveResponse = await authFetch("/api/instagram/schedule-save", {
        method: "POST",
        body: JSON.stringify({
          scheduleType: "story",
          scheduleData: generatedSchedule,
          monthlyPosts,
          dailyPosts,
          businessInfo: businessData.businessInfo,
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
  }, [isAuthReady, generatedSchedule, monthlyPosts, dailyPosts]);

  // 保存されたスケジュールを読み込む関数
  const loadSavedSchedule = useCallback(async () => {
    if (!isAuthReady) {return;}

    try {
      const response = await authFetch(`/api/instagram/schedule-save?scheduleType=story`);

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

  // コンテンツを分析してフィードバックを生成（feedページと同じ）
  const analyzeContent = (content: string): { feedback: string | null; category: string } => {
    const trimmed = content.trim();
    const length = trimmed.length;

    if (length === 0) {
      return {
        feedback: "投稿文が入力されていません。AIヒントを生成するには、まず投稿文を作成してください。",
        category: "no_content",
      };
    }

    if (length < 20) {
      return {
        feedback: `投稿文が短すぎるようです（${length}文字）。もう少し詳しい内容（商品の特徴、イベントの詳細、伝えたいメッセージなど）を含めると、より具体的で効果的な画像・動画の提案が生成されます。`,
        category: "too_short",
      };
    }

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
        const recentSameCategory = suggestionsFeedbackHistoryRef.current.filter(
          (f) => f.category === analysis.category && (now - f.timestamp) < 180000
        );
        if (recentSameCategory.length >= 3) {
          setShowSuggestionsAdminWarning(true);
        } else {
          setShowSuggestionsAdminWarning(false);
        }
      } else {
        suggestionsFeedbackHistoryRef.current = [];
        setShowSuggestionsAdminWarning(false);
      }

      setIsGeneratingSuggestions(true);
      try {
        // ビジネス情報を取得
        const businessResponse = await authFetch("/api/user/business-info");

        if (!businessResponse.ok) {
          throw new Error("ビジネス情報の取得に失敗しました");
        }

        const businessData = await businessResponse.json();

        // AIヒントを生成
        const suggestionsResponse = await authFetch("/api/instagram/story-suggestions", {
          method: "POST",
          body: JSON.stringify({
            content,
            businessInfo: businessData.businessInfo,
          }),
        });

        if (!suggestionsResponse.ok) {
          throw new Error("AIヒントの生成に失敗しました");
        }

        const suggestionsData = await suggestionsResponse.json();
        setImageVideoSuggestions({
          content: suggestionsData.suggestions,
          rationale:
            typeof suggestionsData.rationale === "string" && suggestionsData.rationale.trim().length > 0
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
    [isAuthReady, suggestionsFeedback]
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
      customTitle="ストーリーラボ"
      customDescription="Instagramストーリーの作成・編集"
      contentClassName="py-0 sm:py-0"
    >
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 bg-white min-h-screen pt-4 pb-0">
        {/* ストーリー投稿計画提案 */}
        <div className="bg-white border border-gray-200 p-6 mb-4">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">ストーリー投稿計画</h2>
            <p className="text-sm text-gray-700 mt-1">1ヶ月のストーリー投稿スケジュールを提案します</p>
          </div>

          {/* 投稿頻度設定 */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">投稿頻度設定</h3>

            {/* 投稿頻度の概要表示 */}
            <div className="mb-6 p-4 bg-white border border-gray-200">
              <div className="mb-2">
                <span className="text-sm font-bold text-gray-900">投稿スケジュール概要</span>
              </div>
              <div className="text-sm text-gray-700">
                <p>
                  週の投稿回数:{" "}
                  <span className="font-bold">{Math.round(monthlyPosts / 4)}回</span>（月
                  {monthlyPosts}回）
                </p>
                <p>
                  1日の投稿回数: <span className="font-bold">{dailyPosts}回</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 p-4">
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  1ヶ月の投稿回数
                </label>
                <select
                  value={monthlyPosts}
                  onChange={(e) => setMonthlyPosts(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 bg-white focus:outline-none focus:border-[#ff8a15]"
                >
                  <option value="4">4回（週1回）</option>
                  <option value="8">8回（週2回）</option>
                  <option value="12">12回（週3回）</option>
                  <option value="16">16回（週4回）</option>
                  <option value="20">20回（週5回）</option>
                  <option value="24">24回（週6回）</option>
                  <option value="28">28回（毎日）</option>
                </select>
              </div>
              <div className="bg-white border border-gray-200 p-4">
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  1日の投稿回数
                </label>
                <select
                  value={dailyPosts}
                  onChange={(e) => setDailyPosts(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 bg-white focus:outline-none focus:border-[#ff8a15]"
                >
                  <option value="1">1回</option>
                  <option value="2">2回</option>
                  <option value="3">3回</option>
                  <option value="4">4回</option>
                </select>
              </div>
            </div>
          </div>

          {/* 曜日別投稿提案カード */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">週間投稿スケジュール</h3>
            {generatedSchedule.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {generatedSchedule
                  .filter((daySchedule) => daySchedule.posts && daySchedule.posts.length > 0)
                  .map((daySchedule) => (
                    <div
                      key={daySchedule.day}
                      className="border border-gray-200 p-4 bg-white"
                    >
                      <div className="space-y-2">
                        {daySchedule.posts.map((post, postIndex: number) => (
                          <div
                            key={postIndex}
                            className="bg-white border border-gray-100 p-2 text-sm text-gray-900"
                          >
                            {post.emoji} {post.title}
                            <div className="text-xs text-gray-600 mt-1">{post.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-700">
                <button
                  onClick={generateSchedule}
                  disabled={isGeneratingSchedule}
                  className="px-6 py-3 bg-[#ff8a15] text-white hover:bg-[#e67a0f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-4 flex items-center justify-center gap-2 mx-auto font-medium"
                >
                  {isGeneratingSchedule && (
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  )}
                  <span>{isGeneratingSchedule ? "生成中..." : "AIでスケジュールを生成"}</span>
                </button>
                <p className="text-sm">あなたに最適な投稿スケジュールを作成しましょう</p>
                
                {showScheduleAdminWarning ? (
                  <div className="mt-4 p-3 border border-orange-300 bg-orange-50 text-orange-800 text-xs">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold mb-1">同じような改善提案が3回続いています</p>
                        <p>投稿頻度設定を改善しても、期待するスケジュールが得られない場合は、ビジネス情報やAI設定が適切でない可能性があります。マイアカウントページで設定を確認するか、管理者にお問い合わせください。</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {scheduleFeedback ? (
                  <div className="mt-4 p-3 border border-blue-200 bg-blue-50 text-blue-800 text-xs">
                    <p className="font-bold mb-1">💡 より良いスケジュールを得るために</p>
                    <p className="whitespace-pre-wrap">{scheduleFeedback}</p>
                    <p className="mt-2 text-blue-700">このフィードバックを参考に、投稿頻度設定を調整してみてください。</p>
                  </div>
                ) : null}

                {scheduleError && (
                  <div className="mt-4 p-3 bg-white border border-red-200 text-red-700 text-sm">
                    {scheduleError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* アクションボタン */}
          <div className="flex space-x-3">
            <button
              onClick={saveSchedule}
              disabled={isSavingSchedule || generatedSchedule.length === 0}
              className="px-4 py-2 bg-[#ff8a15] text-white hover:bg-[#e67a0f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
            >
              {isSavingSchedule && (
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              <span>{isSavingSchedule ? "保存中..." : "スケジュールを保存"}</span>
            </button>
            <button
              onClick={generateSchedule}
              disabled={isGeneratingSchedule}
              className="px-4 py-2 text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isGeneratingSchedule && (
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              <span>{isGeneratingSchedule ? "生成中..." : "再生成"}</span>
            </button>
            <button
              onClick={loadSavedSchedule}
              className="px-4 py-2 text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 transition-colors font-medium"
            >
              保存済みを読み込み
            </button>
          </div>

          {/* 保存メッセージ */}
          {saveMessage && !saveMessage.includes("保存されたスケジュールを読み込みました") && (
            <div
              className={`mt-3 p-3 border text-sm ${
                saveMessage.includes("✅")
                  ? "bg-white border-green-200 text-green-700"
                  : "bg-white border-red-200 text-red-700"
              }`}
            >
              {saveMessage}
            </div>
          )}
        </div>

        {/* ストーリー投稿エディター */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 [&>*:last-child]:mb-0" style={{ alignItems: 'stretch' }}>
          {/* 左カラム: ストーリー投稿エディター */}
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
              aiPromptPlaceholder="例:お店の雰囲気✨、スタッフ紹介👋、限定情報💫など..."
              imageVideoSuggestions={imageVideoSuggestions}
              onImageVideoSuggestionsGenerate={generateImageVideoSuggestions}
              isGeneratingSuggestions={isGeneratingSuggestions}
              editingPostId={editingPostId}
            />
          </div>

          {/* 右カラム: ツールパネル */}
          <div className="flex flex-col h-full">
            <div className="flex-shrink-0">
              <ABTestSidebarSection currentPostTitle={postTitle} />
            </div>
            <div className="flex-1 flex flex-col min-h-0">
              <CommentReplyAssistant
                postTitle={postTitle}
                postContent={postContent}
                postType={postType}
                hashtags={selectedHashtags}
              />
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
