"use client";

import React, { useEffect, useMemo } from "react";
import SNSLayout from "../../../../components/sns-layout";
import PostEditor from "../components/PostEditor";
import ToolPanel from "../components/ToolPanel";
import PostPreview from "../components/PostPreview";
import ABTestSidebarSection from "../components/ABTestSidebarSection";
import { usePlanData } from "../../../../hooks/usePlanData";
import { useAuth } from "../../../../contexts/auth-context";
import { useReelLabStore } from "@/stores/reel-lab-store";

export default function ReelLabPage() {
  const postType: "feed" | "reel" | "story" = "reel";
  const isAIGenerated = false;

  // 計画データを取得
  const { planData } = usePlanData("instagram");
  const { user } = useAuth();
  const isAuthReady = useMemo(() => Boolean(user), [user]);

  // Zustandストアから状態を取得
  const postContent = useReelLabStore((state) => state.postContent);
  const postTitle = useReelLabStore((state) => state.postTitle);
  const selectedHashtags = useReelLabStore((state) => state.selectedHashtags);
  const postImage = useReelLabStore((state) => state.postImage);
  const scheduledDate = useReelLabStore((state) => state.scheduledDate);
  const scheduledTime = useReelLabStore((state) => state.scheduledTime);
  const editingPostId = useReelLabStore((state) => state.editingPostId);
  const videoStructure = useReelLabStore((state) => state.videoStructure);
  const videoFlow = useReelLabStore((state) => state.videoFlow);
  const isMounted = useReelLabStore((state) => state.isMounted);

  // セッター
  const setPostContent = useReelLabStore((state) => state.setPostContent);
  const setPostTitle = useReelLabStore((state) => state.setPostTitle);
  const setSelectedHashtags = useReelLabStore((state) => state.setSelectedHashtags);
  const setPostImage = useReelLabStore((state) => state.setPostImage);
  const setScheduledDate = useReelLabStore((state) => state.setScheduledDate);
  const setScheduledTime = useReelLabStore((state) => state.setScheduledTime);
  const setIsMounted = useReelLabStore((state) => state.setIsMounted);

  // データ取得・操作関数
  const fetchPostData = useReelLabStore((state) => state.fetchPostData);
  const generateVideoStructure = useReelLabStore((state) => state.generateVideoStructure);
  const loadSavedSchedule = useReelLabStore((state) => state.loadSavedSchedule);

  // URLパラメータから投稿IDを取得して投稿データを読み込む
  useEffect(() => {
    const setEditingPostId = useReelLabStore.getState().setEditingPostId;
    
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
              onVideoStructureGenerate={(prompt) => generateVideoStructure(prompt, isAuthReady, planData)}
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
