"use client";

import React, { useEffect, useMemo } from "react";
import SNSLayout from "../../../../components/sns-layout";
import PostEditor from "../components/PostEditor";
import ToolPanel from "../components/ToolPanel";
import PostPreview from "../components/PostPreview";
import { usePlanData } from "../../../../hooks/usePlanData";
import { useAuth } from "../../../../contexts/auth-context";
import ABTestSidebarSection from "../components/ABTestSidebarSection";
import { notify } from "../../../../lib/ui/notifications";
import { useFeedLabStore } from "@/stores/feed-lab-store";

export default function FeedLabPage() {
  const postType: "feed" | "reel" | "story" = "feed";
  const isAIGenerated = false;

  // 計画データを取得
  const { planData } = usePlanData("instagram");
  const { user } = useAuth();
  const isAuthReady = useMemo(() => Boolean(user), [user]);

  // Zustandストアから状態を取得
  const postContent = useFeedLabStore((state) => state.postContent);
  const postTitle = useFeedLabStore((state) => state.postTitle);
  const selectedHashtags = useFeedLabStore((state) => state.selectedHashtags);
  const postImage = useFeedLabStore((state) => state.postImage);
  const scheduledDate = useFeedLabStore((state) => state.scheduledDate);
  const scheduledTime = useFeedLabStore((state) => state.scheduledTime);
  const editingPostId = useFeedLabStore((state) => state.editingPostId);
  const imageVideoSuggestions = useFeedLabStore((state) => state.imageVideoSuggestions);
  const isGeneratingSuggestions = useFeedLabStore((state) => state.isGeneratingSuggestions);
  const snapshotReferences = useFeedLabStore((state) => state.snapshotReferences);
  const scheduleFeedback = useFeedLabStore((state) => state.scheduleFeedback);
  const showScheduleAdminWarning = useFeedLabStore((state) => state.showScheduleAdminWarning);
  const suggestionsFeedback = useFeedLabStore((state) => state.suggestionsFeedback);
  const showSuggestionsAdminWarning = useFeedLabStore((state) => state.showSuggestionsAdminWarning);
  const isMounted = useFeedLabStore((state) => state.isMounted);

  // セッター
  const setPostContent = useFeedLabStore((state) => state.setPostContent);
  const setPostTitle = useFeedLabStore((state) => state.setPostTitle);
  const setSelectedHashtags = useFeedLabStore((state) => state.setSelectedHashtags);
  const setPostImage = useFeedLabStore((state) => state.setPostImage);
  const setScheduledDate = useFeedLabStore((state) => state.setScheduledDate);
  const setScheduledTime = useFeedLabStore((state) => state.setScheduledTime);
  const setSnapshotReferences = useFeedLabStore((state) => state.setSnapshotReferences);
  const setIsMounted = useFeedLabStore((state) => state.setIsMounted);

  // データ取得・操作関数
  const fetchPostData = useFeedLabStore((state) => state.fetchPostData);
  const generateImageVideoSuggestions = useFeedLabStore((state) => state.generateImageVideoSuggestions);
  const loadSavedSchedule = useFeedLabStore((state) => state.loadSavedSchedule);


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
    const setEditingPostId = useFeedLabStore.getState().setEditingPostId;
    
    const handleUrlChange = () => {
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get("edit");
        const postId = urlParams.get("postId");

        const targetId = editId || postId;
        if (targetId && isAuthReady) {
          setEditingPostId(targetId);
          fetchPostData(targetId, isAuthReady);
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


  useEffect(() => {
    setIsMounted(true);
  }, [setIsMounted]);

  useEffect(() => {
    if (isAuthReady) {
      loadSavedSchedule(isAuthReady); // 保存されたスケジュールを読み込み
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
              onImageVideoSuggestionsGenerate={(content) => generateImageVideoSuggestions(content, isAuthReady)}
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
