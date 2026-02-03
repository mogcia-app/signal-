"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import SNSLayout from "../../../../components/sns-layout";
import PostEditor from "../components/PostEditor";
import ToolPanel from "../components/ToolPanel";
import PostPreview from "../components/PostPreview";
import ABTestSidebarSection from "../components/ABTestSidebarSection";
import { usePlanData, type PlanData } from "../../../../hooks/usePlanData";
import { useAuth } from "../../../../contexts/auth-context";
import { authFetch } from "../../../../utils/authFetch";
import { useScheduleGeneration } from "../../../../hooks/useScheduleGeneration";
import { useBusinessInfo } from "../../../../hooks/useBusinessInfo";
import { notify } from "../../../../lib/ui/notifications";
import { AlertTriangle } from "lucide-react";

export default function ReelLabPage() {
  const [postContent, setPostContent] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [postType] = useState<"feed" | "reel" | "story">("reel");
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
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  // フィードバック関連の状態
  const [scheduleFeedback, setScheduleFeedback] = useState<string | null>(null);
  const [showScheduleAdminWarning, setShowScheduleAdminWarning] = useState(false);

  // 動画構成関連の状態
  const [videoStructure, setVideoStructure] = useState({
    introduction: "", // 起
    development: "", // 承
    twist: "", // 転
    conclusion: "", // 結
  });
  const [videoFlow, setVideoFlow] = useState(""); // 動画構成の流れ

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

  // スケジュール生成フックを使用
  const { generateSchedule } = useScheduleGeneration({
    postType: "reel",
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
          scheduleType: "reel",
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
      const response = await authFetch(`/api/instagram/schedule-save?scheduleType=reel`);

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

  // 動画構成生成関数
  const generateVideoStructure = useCallback(
    async (prompt: string) => {
      if (!isAuthReady || !prompt.trim()) {return;}

      try {
        const response = await authFetch("/api/instagram/reel-structure", {
          method: "POST",
          body: JSON.stringify({
            prompt,
            businessInfo: planData,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          setVideoStructure(
            result.structure || {
              introduction: "",
              development: "",
              twist: "",
              conclusion: "",
            },
          );
          setVideoFlow(result.flow || "");
        }
      } catch (error) {
        console.error("動画構成生成エラー:", error);
      }
    },
    [isAuthReady, planData],
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
      customTitle="リールラボ"
      customDescription="Instagramリール動画の作成・編集"
      contentClassName="py-0 sm:py-0"
    >
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 bg-white min-h-screen pt-4 pb-0">
        {/* 2カラムレイアウト */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 [&>*:last-child]:mb-0" style={{ alignItems: 'stretch' }}>
          {/* 左カラム: リール投稿エディター */}
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
              aiPromptPlaceholder="例: 商品の使い方、おすすめポイント、バックステージ、チュートリアル、トレンド動画など..."
              onVideoStructureGenerate={generateVideoStructure}
              videoStructure={videoStructure}
              videoFlow={videoFlow}
              editingPostId={editingPostId}
            />
          </div>

          {/* 右カラム: プレビューとツールパネル */}
          <div className="flex flex-col h-full">
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
