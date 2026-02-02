/**
 * 今日やることセクションコンポーネント
 */

import React from "react";
import { Loader2, Copy, Check, Save } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context";
import { authFetch } from "@/utils/authFetch";
import { useHomeStore, type AISection } from "@/stores/home-store";

type TodayTask = AISection["todayTasks"][number];

export function TodayTasksSection() {
  const { user } = useAuth();
  const isLoadingAiSections = useHomeStore((state) => state.isLoadingAiSections);
  const isLoadingDashboard = useHomeStore((state) => state.isLoadingDashboard);
  const aiSections = useHomeStore((state) => state.aiSections);
  const copiedTaskIndex = useHomeStore((state) => state.copiedTaskIndex);
  const savingTaskIndex = useHomeStore((state) => state.savingTaskIndex);
  const setCopiedTaskIndex = useHomeStore((state) => state.setCopiedTaskIndex);
  const setSavingTaskIndex = useHomeStore((state) => state.setSavingTaskIndex);

  const typeLabels: Record<string, string> = {
    feed: "フィード投稿",
    reel: "リール",
    story: "ストーリーズ",
  };

  const handleCopy = async (task: TodayTask, index: number) => {
    const content = task.generatedContent || "";
    const hashtags = task.generatedHashtags?.map((tag) => `#${tag}`).join(" ") || "";
    const copyText = `${content}${hashtags ? `\n\n${hashtags}` : ""}`;

    try {
      await navigator.clipboard.writeText(copyText);
      setCopiedTaskIndex(index);
      setTimeout(() => setCopiedTaskIndex(null), 2000);
      toast.success("コピーしました");
    } catch (error) {
      console.error("コピーに失敗しました:", error);
      toast.error("コピーに失敗しました");
    }
  };

  const handleSave = async (task: TodayTask, index: number) => {
    if (!user?.uid) {
      toast.error("ログインが必要です");
      return;
    }

    setSavingTaskIndex(index);
    try {
      const postData = {
        userId: user.uid,
        title: task.description || "投稿",
        content: task.generatedContent || "",
        hashtags: task.generatedHashtags || [],
        postType: task.type as "feed" | "reel" | "story",
        status: "draft",
        scheduledDate: new Date().toISOString().split("T")[0],
        scheduledTime: task.time || new Date().toTimeString().slice(0, 5),
      };

      const response = await authFetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      });

      if (response.ok) {
        toast.success("投稿を保存しました！投稿一覧で確認できます。");
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "投稿の保存に失敗しました");
      }
    } catch (error) {
      console.error("投稿保存エラー:", error);
      toast.error("投稿の保存に失敗しました");
    } finally {
      setSavingTaskIndex(null);
    }
  };

  if (isLoadingAiSections || isLoadingDashboard) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
          <span>📅</span>
          今日やること
        </h2>
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-[#FF8A15] mb-2" />
          <p className="text-xs text-gray-500 font-light">AIが計画を生成中...</p>
        </div>
      </div>
    );
  }

  if (!aiSections || aiSections.todayTasks.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
          <span>📅</span>
          今日やること
        </h2>
        <div className="space-y-4">
          <div className="border-l-2 border-[#FF8A15] pl-4">
            <div className="flex items-start gap-2 mb-2">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 mb-1">【分析・確認】</div>
                <p className="text-sm font-light text-gray-700 mb-2">
                  「投稿後の分析はできていますか？見直してみましょう！」
                </p>
              </div>
            </div>
          </div>
          <div className="border-l-2 border-[#FF8A15] pl-4">
            <div className="flex items-start gap-2 mb-2">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 mb-1">【エンゲージメント】</div>
                <p className="text-sm font-light text-gray-700 mb-2">
                  「コメントには返信を忘れずに！」
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
        <span>📅</span>
        今日やること
      </h2>
      <div className="space-y-4">
        {aiSections.todayTasks.map((task, index) => (
          <div key={index} className="border-l-2 border-[#FF8A15] pl-4">
            <div className="flex items-start gap-2 mb-2">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 mb-1">
                  {typeLabels[task.type] || task.type}
                  {task.time && (
                    <span className="text-xs font-light text-gray-500 ml-2">({task.time})</span>
                  )}
                </div>
                <p className="text-sm font-light text-gray-700 mb-2">「{task.description}」</p>
                {(task.generatedContent ||
                  (task.generatedHashtags && task.generatedHashtags.length > 0)) && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-2 relative">
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        onClick={() => handleSave(task, index)}
                        className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
                        title="投稿一覧に保存"
                        disabled={savingTaskIndex === index}
                      >
                        {savingTaskIndex === index ? (
                          <Loader2 className="w-4 h-4 text-orange-600 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 text-orange-600" />
                        )}
                      </button>
                      <button
                        onClick={() => handleCopy(task, index)}
                        className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
                        title="投稿文とハッシュタグをコピー"
                      >
                        {copiedTaskIndex === index ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-600" />
                        )}
                      </button>
                    </div>
                    {task.generatedContent && (
                      <div className="mb-2 pr-20">
                        <div className="text-xs font-medium text-gray-700 mb-1">
                          📝 生成された投稿文:
                        </div>
                        <pre className="text-xs font-light text-gray-800 whitespace-pre-wrap font-sans">
                          {task.generatedContent}
                        </pre>
                      </div>
                    )}
                    {task.generatedHashtags && task.generatedHashtags.length > 0 && (
                      <div className="pr-20">
                        <div className="text-xs font-medium text-gray-700 mb-1">🏷️ ハッシュタグ:</div>
                        <div className="flex flex-wrap gap-1">
                          {task.generatedHashtags.map((tag, tagIndex) => (
                            <span key={tagIndex} className="text-xs text-[#FF8A15] font-light">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {task.tip && (
                  <p className="text-xs text-gray-500 font-light">→ {task.tip}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

