"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import SNSLayout from "../../../components/sns-layout";
import PostEditor, { AIHintSuggestion, SnapshotReference } from "./components/PostEditor";
import ToolPanel from "./components/ToolPanel";
import PostPreview from "./components/PostPreview";
import { useAuth } from "../../../contexts/auth-context";
import { authFetch } from "../../../utils/authFetch";
import { useBusinessInfo } from "../../../hooks/useBusinessInfo";
import { notify } from "../../../lib/ui/notifications";
import { ChevronDown, ChevronUp } from "lucide-react";

type LabPostType = "feed" | "reel" | "story";

const TYPE_CONFIG: Record<
  LabPostType,
  {
    label: string;
    description: string;
    placeholder: string;
  }
> = {
  feed: {
    label: "フィード",
    description: "Instagramフィード投稿の作成・編集",
    placeholder: "例: 新商品の紹介、ブランドストーリー、お客様の声、会社の取り組みなど...",
  },
  reel: {
    label: "リール",
    description: "Instagramリール動画の作成・編集",
    placeholder: "例: 商品の使い方、おすすめポイント、バックステージ、チュートリアル、トレンド動画など...",
  },
  story: {
    label: "ストーリーズ",
    description: "Instagramストーリーの作成・編集",
    placeholder: "例: お店の雰囲気、スタッフ紹介、限定情報など...",
  },
};

const parsePostType = (value: string | null): LabPostType => {
  if (value === "feed" || value === "reel" || value === "story") {
    return value;
  }
  return "feed";
};

export default function InstagramLabPage() {
  const [postType, setPostType] = useState<LabPostType>("feed");
  const [isTypeSelectorOpen, setIsTypeSelectorOpen] = useState(false);

  const [postContent, setPostContent] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [postImage, setPostImage] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isAIGenerated] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [snapshotReferences, setSnapshotReferences] = useState<SnapshotReference[]>([]);

  const [imageVideoSuggestions, setImageVideoSuggestions] = useState<AIHintSuggestion | null>(null);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

  const { user } = useAuth();
  const isAuthReady = useMemo(() => Boolean(user), [user]);
  const { businessInfo } = useBusinessInfo();

  const syncPostTypeFromUrl = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const nextType = parsePostType(params.get("type"));
    setPostType(nextType);
  }, []);

  const updateTypeInUrl = useCallback((nextType: LabPostType) => {
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    params.set("type", nextType);
    const query = params.toString();
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState({}, "", nextUrl);
  }, []);

  const fetchPostData = useCallback(
    async (postId: string) => {
      if (!isAuthReady) {
        return;
      }

      try {
        const response = await authFetch("/api/posts");

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (!result.posts || !Array.isArray(result.posts)) {
          return;
        }

        const post = result.posts.find((p: { id: string }) => p.id === postId);
        if (!post) {
          return;
        }

        setPostTitle(post.title || "");
        setPostContent(post.content || "");

        const hashtags = Array.isArray(post.hashtags)
          ? post.hashtags
          : typeof post.hashtags === "string"
            ? post.hashtags
                .split(" ")
                .filter((tag: string) => tag.trim() !== "")
                .map((tag: string) => tag.replace("#", ""))
            : [];
        setSelectedHashtags(hashtags);

        if (post.scheduledDate) {
          const parsedDate =
            post.scheduledDate instanceof Date
              ? post.scheduledDate
              : typeof post.scheduledDate === "string"
                ? new Date(post.scheduledDate)
                : post.scheduledDate?.toDate
                  ? post.scheduledDate.toDate()
                  : null;
          if (parsedDate) {
            setScheduledDate(parsedDate.toISOString().split("T")[0]);
          }
        }

        if (post.scheduledTime) {
          setScheduledTime(post.scheduledTime);
        }

        if (post.imageData) {
          setPostImage(post.imageData);
        } else if (post.imageUrl) {
          setPostImage(post.imageUrl);
        }

        setSnapshotReferences(post.snapshotReferences || []);
      } catch (error) {
        console.error("投稿データ取得エラー:", error);
      }
    },
    [isAuthReady]
  );

  useEffect(() => {
    setIsMounted(true);
    syncPostTypeFromUrl();
  }, [syncPostTypeFromUrl]);

  useEffect(() => {
    const handlePopstate = () => {
      syncPostTypeFromUrl();
    };
    window.addEventListener("popstate", handlePopstate);
    return () => window.removeEventListener("popstate", handlePopstate);
  }, [syncPostTypeFromUrl]);

  useEffect(() => {
    if (isAuthReady && isMounted) {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("login") === "success") {
        notify({ type: "success", message: "ログインしました" });
        urlParams.delete("login");
        const cleaned = urlParams.toString();
        const nextUrl = cleaned ? `${window.location.pathname}?${cleaned}` : window.location.pathname;
        window.history.replaceState({}, "", nextUrl);
      }
    }
  }, [isAuthReady, isMounted]);

  useEffect(() => {
    const handleUrlData = () => {
      if (typeof window === "undefined") {
        return;
      }
      const urlParams = new URLSearchParams(window.location.search);

      const editId = urlParams.get("edit");
      const postId = urlParams.get("postId");
      const draftTitle = urlParams.get("draftTitle");
      const draftContent = urlParams.get("draftContent");
      const draftHashtags = urlParams.get("draftHashtags");
      const draftTime = urlParams.get("draftTime");

      const targetId = editId || postId;
      if (targetId && isAuthReady) {
        setEditingPostId(targetId);
        fetchPostData(targetId);
      } else {
        setEditingPostId(null);
        if (draftTitle || draftContent || draftHashtags || draftTime) {
          if (draftTitle) {
            setPostTitle(draftTitle);
          }
          if (draftContent) {
            setPostContent(draftContent);
          }
          if (draftHashtags) {
            setSelectedHashtags(
              draftHashtags
                .split(",")
                .map((tag) => tag.trim().replace(/^#+/, ""))
                .filter(Boolean)
            );
          }
          if (draftTime) {
            setScheduledTime(draftTime);
          }
        }
      }
    };

    handleUrlData();
    window.addEventListener("popstate", handleUrlData);
    return () => window.removeEventListener("popstate", handleUrlData);
  }, [isAuthReady, fetchPostData]);

  useEffect(() => {
    if (postType !== "story") {
      setImageVideoSuggestions(null);
      setIsGeneratingSuggestions(false);
    }
  }, [postType]);

  const analyzeContent = (content: string): { feedback: string | null; category: string } => {
    const trimmed = content.trim();
    if (!trimmed) {
      return {
        feedback: "投稿文が入力されていません。AIヒントを生成するには、まず投稿文を作成してください。",
        category: "no_content",
      };
    }
    if (trimmed.length < 20) {
      return {
        feedback:
          "投稿文が短すぎます。もう少し詳しい内容を含めると、より効果的な提案が生成されます。",
        category: "too_short",
      };
    }
    return { feedback: null, category: "" };
  };

  const generateImageVideoSuggestions = useCallback(
    async (content: string) => {
      if (!isAuthReady || postType !== "story") {
        return;
      }

      const analysis = analyzeContent(content);
      if (analysis.feedback) {
        return;
      }

      setIsGeneratingSuggestions(true);
      try {
        if (!businessInfo) {
          throw new Error("ビジネス情報の取得に失敗しました");
        }

        const suggestionsResponse = await authFetch("/api/instagram/story-suggestions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content,
            businessInfo,
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
      } catch (error) {
        console.error("AIヒント生成エラー:", error);
      } finally {
        setIsGeneratingSuggestions(false);
      }
    },
    [businessInfo, isAuthReady, postType]
  );

  const selectPostType = (nextType: LabPostType) => {
    setPostType(nextType);
    updateTypeInUrl(nextType);
    setIsTypeSelectorOpen(false);
  };

  if (!isMounted) {
    return null;
  }

  const typeConfig = TYPE_CONFIG[postType];

  return (
    <SNSLayout customTitle="投稿ラボ" customDescription={typeConfig.description} contentClassName="py-0 sm:py-0">
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 bg-white min-h-screen pt-4 pb-0">
        <div className="mb-4 border border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => setIsTypeSelectorOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div>
              <p className="text-xs text-gray-500">投稿タイプ</p>
              <p className="text-sm font-semibold text-gray-900">{typeConfig.label}</p>
            </div>
            {isTypeSelectorOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {isTypeSelectorOpen && (
            <div className="border-t border-gray-200">
              {(["feed", "reel", "story"] as LabPostType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => selectPostType(type)}
                  className={`w-full px-4 py-3 text-left text-sm border-b last:border-b-0 ${
                    postType === type ? "bg-orange-50 text-orange-700" : "bg-white text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  {TYPE_CONFIG[type].label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 [&>*:last-child]:mb-0" style={{ alignItems: "stretch" }}>
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
              aiPromptPlaceholder={typeConfig.placeholder}
              initialSnapshotReferences={snapshotReferences}
              onSnapshotReferencesChange={setSnapshotReferences}
              imageVideoSuggestions={postType === "story" ? imageVideoSuggestions : null}
              onImageVideoSuggestionsGenerate={postType === "story" ? generateImageVideoSuggestions : undefined}
              isGeneratingSuggestions={postType === "story" ? isGeneratingSuggestions : false}
              editingPostId={editingPostId}
            />
          </div>

          <div className="flex flex-col">
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
