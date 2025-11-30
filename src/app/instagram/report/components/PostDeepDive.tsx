"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { BarChart3, Loader2, Sparkles, TrendingDown } from "lucide-react";
import { useAuth } from "../../../../contexts/auth-context";
import { authFetch } from "../../../../utils/authFetch";

interface PostDeepDiveProps {
  selectedMonth: string;
}

interface PostDeepDiveData {
  id: string;
  title: string;
  postType: "feed" | "reel" | "story" | "carousel" | "video";
  createdAt: Date | string;
  analyticsSummary?: {
    likes: number;
    comments: number;
    saves: number;
    reach: number;
    followerIncrease: number;
    engagementRate: number;
  };
  snapshotReferences?: Array<{
    id: string;
    status: "gold" | "negative" | "normal";
    summary?: string;
  }>;
}

interface PatternHighlights {
  gold?: Array<{
    id: string;
    status: "gold";
    summary?: string;
  }>;
  negative?: Array<{
    id: string;
    status: "negative";
    summary?: string;
  }>;
}

const postTypeLabel: Record<PostDeepDiveData["postType"], string> = {
  feed: "フィード",
  reel: "リール",
  story: "ストーリーズ",
  carousel: "カルーセル",
  video: "動画",
};

const badgeConfig: Record<
  "gold" | "negative" | "normal",
  { label: string; className: string; icon: React.ReactNode }
> = {
  gold: {
    label: "ゴールド",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: <Sparkles className="w-3.5 h-3.5 text-amber-500" />,
  },
  negative: {
    label: "改善",
    className: "bg-rose-50 text-rose-700 border border-rose-200",
    icon: <TrendingDown className="w-3.5 h-3.5 text-rose-500" />,
  },
  normal: {
    label: "参考",
    className: "bg-slate-50 text-slate-600 border border-slate-200",
    icon: <BarChart3 className="w-3.5 h-3.5 text-slate-500" />,
  },
};

function formatDateLabel(value?: Date | string) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("ja-JP");
}

function MetricCell({ label, value }: { label: string; value?: number }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900">
        {typeof value === "number" && !Number.isNaN(value) ? value.toLocaleString("ja-JP") : "-"}
      </p>
    </div>
  );
}

export const PostDeepDive: React.FC<PostDeepDiveProps> = ({ selectedMonth }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<PostDeepDiveData[]>([]);

  const fetchPostDeepDive = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await authFetch(`/api/analytics/post-deep-dive?date=${selectedMonth}`);

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setPosts(result.data.posts || []);
        } else {
          setError("データの取得に失敗しました");
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || "データの取得に失敗しました");
      }
    } catch (err) {
      console.error("投稿ディープダイブ取得エラー:", err);
      setError("データの取得中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedMonth]);

  // ページ読み込み時に自動的にデータを取得
  React.useEffect(() => {
    if (user && selectedMonth) {
      fetchPostDeepDive();
    }
  }, [user, selectedMonth, fetchPostDeepDive]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4">
      {/* ヘッダー */}
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0 shadow-sm">
          <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">投稿ディープダイブ</h2>
          <p className="text-xs text-gray-600 mt-0.5">
            投稿実績・AI参照元・主要KPIをワンビューで確認できます
          </p>
        </div>
      </div>

      {/* コンテンツ */}
      <div>
        <div className="mt-4 pt-4 border-t border-gray-200 animate-in fade-in duration-300">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-orange-600 mr-2" />
              <span className="text-sm text-gray-700">データを読み込み中...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
              <div className="flex items-start">
                <div className="w-4 h-4 text-red-600 mr-2 mt-0.5 flex-shrink-0">⚠️</div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-red-800 mb-1.5">{error}</p>
                  <button
                    onClick={fetchPostDeepDive}
                    className="text-xs text-red-600 hover:text-red-800 underline font-medium"
                  >
                    再試行
                  </button>
                </div>
              </div>
            </div>
          ) : posts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {posts.map((post) => {
                const analytics = post.analyticsSummary;
                const snapshotRefs = post.snapshotReferences || [];
                return (
                  <div key={post.id} className="border border-gray-200 rounded-lg p-2.5 sm:p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">
                          {postTypeLabel[post.postType]}・{formatDateLabel(post.createdAt)}
                        </p>
                        <p className="text-xs font-semibold text-gray-900 mt-0.5">{post.title}</p>
                      </div>
                      {snapshotRefs.length > 0 && (
                        <div className="flex flex-wrap justify-end gap-1">
                          {snapshotRefs.slice(0, 3).map((reference) => {
                            const config = badgeConfig[reference.status];
                            return (
                              <span
                                key={`${post.id}-${reference.id}`}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}
                              >
                                {config.icon}
                                <span>{config.label}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {analytics ? (
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <MetricCell label="いいね" value={analytics.likes} />
                        <MetricCell label="保存" value={analytics.saves} />
                        <MetricCell label="リーチ" value={analytics.reach} />
                        <MetricCell label="フォロワー増加" value={analytics.followerIncrease} />
                        <div>
                          <p className="text-xs text-gray-500">エンゲージメント率</p>
                          <p className="text-xs sm:text-sm font-semibold text-gray-900">
                            {typeof analytics.engagementRate === "number"
                              ? `${analytics.engagementRate.toFixed(1)}%`
                              : "-"}
                          </p>
                        </div>
                        <MetricCell label="コメント" value={analytics.comments} />
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 bg-gray-50 border border-dashed border-gray-200 px-3 py-2 rounded">
                        まだ分析データが紐付いていません。分析ページから登録すると実績が表示されます。
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link
                        href={`/instagram/posts/${post.id}`}
                        className="text-xs font-semibold text-gray-700 border border-gray-300 bg-white px-3 py-1 rounded hover:bg-gray-100 transition-colors"
                      >
                        投稿詳細
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-xs">投稿データがありません</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

