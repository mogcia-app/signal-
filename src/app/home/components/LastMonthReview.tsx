"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/auth-context";
import { authFetch } from "../../../utils/authFetch";
import { Loader2, TrendingUp, TrendingDown, Lightbulb, ArrowRight, Sparkles, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface LastMonthReviewData {
  month: string;
  monthName: string;
  hasData: boolean;
  message?: string;
  kpiSummary?: {
    totalReach: number;
    totalLikes: number;
    totalComments: number;
    totalSaves: number;
    totalFollowerIncrease: number;
    totalPosts: number;
  };
  whatWorkedWell?: {
    count: number;
    summary: string;
    keyThemes: string[];
    successFactors?: string[];
    suggestedAngles: string[];
    replicationActions?: string[];
    topPosts: Array<{
      postId: string;
      title: string;
      kpiScore: number;
      engagementRate: number;
      reach?: number;
      savesRate?: number;
      category?: string;
      hashtags?: string[];
      erLift?: number;
      reachLift?: number;
    }>;
  };
  whatDidntWork?: {
    count: number;
    summary: string;
    keyThemes: string[];
    failureFactors?: string[];
    hashtags?: string[];
    cautions: string[];
    topPosts: Array<{
      postId: string;
      title: string;
      kpiScore: number;
      engagementRate: number;
    }>;
  };
  whatToDoNext?: {
    actionPlans: Array<{
      title: string;
      description: string;
      action: string;
    }>;
    recommendations: string[];
    focusAreas: string[];
  };
}

export const LastMonthReview: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LastMonthReviewData | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await authFetch("/api/analytics/last-month-review");

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
          setData(result.data);
        } else {
          throw new Error(result.error || "データの取得に失敗しました");
        }
      } catch (err) {
        console.error("先月の振り返り取得エラー:", err);
        setError(err instanceof Error ? err.message : "データの取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.uid]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-3 sm:p-4 md:p-6 border border-gray-100 shadow-sm mt-4">
        <div className="flex items-center justify-center py-8 sm:py-12">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          <p className="ml-3 text-sm text-gray-500">先月の振り返りを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-3 sm:p-4 md:p-6 border border-gray-100 shadow-sm mt-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  if (!data.hasData) {
    return (
      <div className="bg-white rounded-xl p-3 sm:p-4 md:p-6 border border-gray-100 shadow-sm mt-4">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg flex items-center justify-center border border-orange-100 flex-shrink-0">
            <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900">先月の振り返り</h2>
            <p className="text-xs text-gray-500 mt-0.5">何が良かったか・悪かったかの根拠（{data.monthName}の分析結果）</p>
          </div>
        </div>
        <div className="text-center py-8 sm:py-12 text-gray-400">
          <p className="text-sm">{data.message || "先月の分析データがまだありません"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-3 sm:p-4 md:p-6 border border-gray-100 shadow-sm mt-4">
      <div className="flex items-center justify-between gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg flex items-center justify-center border border-orange-100 flex-shrink-0">
            <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900">先月の振り返り</h2>
            <p className="text-xs text-gray-500 mt-0.5">何が良かったか・悪かったかの根拠（{data.monthName}の分析結果）</p>
          </div>
        </div>
        <Link
          href="/instagram/report"
          className="text-xs text-gray-600 hover:text-orange-600 font-medium flex items-center gap-1 transition-colors"
        >
          詳細を見る
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* KPIサマリー */}
        {data.kpiSummary && (
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
            <h3 className="text-xs font-semibold text-gray-700 mb-2 sm:mb-3">先月のKPIサマリー</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 text-xs">
              <div>
                <p className="text-gray-500">投稿数</p>
                <p className="text-sm font-semibold text-gray-900">{data.kpiSummary.totalPosts}件</p>
              </div>
              <div>
                <p className="text-gray-500">リーチ</p>
                <p className="text-sm font-semibold text-gray-900">{data.kpiSummary.totalReach.toLocaleString()}人</p>
              </div>
              <div>
                <p className="text-gray-500">フォロワー増</p>
                <p className="text-sm font-semibold text-gray-900">
                  {data.kpiSummary.totalFollowerIncrease > 0 ? "+" : ""}
                  {data.kpiSummary.totalFollowerIncrease}人
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 何が良かったか */}
        {data.whatWorkedWell && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-3 sm:p-4 border border-amber-200">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900">何が良かったか</h3>
              {data.whatWorkedWell.count > 0 && (
                <span className="text-[10px] sm:text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  {data.whatWorkedWell.count}件の成功投稿
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-700 mb-3 sm:mb-4 leading-relaxed">{data.whatWorkedWell.summary}</p>
            
            {/* 成功投稿の詳細カード */}
            {data.whatWorkedWell.topPosts && data.whatWorkedWell.topPosts.length > 0 && (
              <div className="mb-3 sm:mb-4 space-y-2">
                <p className="text-[10px] sm:text-xs font-semibold text-amber-800 mb-2">🏆 トップ成功投稿</p>
                {data.whatWorkedWell.topPosts.map((post, idx) => (
                  <Link
                    key={`top-post-${post.postId}`}
                    href={`/instagram/posts/${post.postId}`}
                    className="block bg-white/80 rounded-lg p-2 sm:p-3 border border-amber-200 hover:border-amber-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-[11px] sm:text-xs font-semibold text-gray-900 flex-1 line-clamp-2">
                        {post.title || "タイトル未設定"}
                      </p>
                      <span className="text-[9px] sm:text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                        #{idx + 1}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-amber-600" />
                        ER {post.engagementRate.toFixed(1)}%
                        {post.erLift && post.erLift > 0 && (
                          <span className="text-emerald-600 font-semibold">+{post.erLift.toFixed(0)}%</span>
                        )}
                      </span>
                      {post.reach && (
                        <span className="flex items-center gap-1">
                          👁️ {Math.round(post.reach).toLocaleString()}人
                          {post.reachLift && post.reachLift > 0 && (
                            <span className="text-emerald-600 font-semibold">+{post.reachLift.toFixed(0)}%</span>
                          )}
                        </span>
                      )}
                      {post.savesRate !== undefined && post.savesRate > 0 && (
                        <span>💾 保存率 {(post.savesRate * 100).toFixed(1)}%</span>
                      )}
                      {post.category && (
                        <span className="text-[9px] sm:text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {post.category === "feed" ? "画像" : post.category === "reel" ? "リール" : "ストーリー"}
                        </span>
                      )}
                    </div>
                    {post.hashtags && post.hashtags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {post.hashtags.slice(0, 3).map((tag, tagIdx) => (
                          <span
                            key={`hashtag-${tagIdx}`}
                            className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}

            {/* 実際の成功要因（数値データ） */}
            {data.whatWorkedWell.successFactors && data.whatWorkedWell.successFactors.length > 0 && (
              <div className="mb-3 sm:mb-4 bg-white/60 rounded-lg p-2 sm:p-3 border border-amber-100">
                <p className="text-[10px] sm:text-xs font-semibold text-amber-800 mb-1.5">📊 成功要因（数値）</p>
                <ul className="list-disc list-inside text-[10px] sm:text-xs text-gray-700 space-y-1">
                  {data.whatWorkedWell.successFactors.map((factor, idx) => (
                    <li key={`success-factor-${idx}`}>{factor}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* 共通の成功要因（テーマ） */}
            {data.whatWorkedWell.keyThemes && data.whatWorkedWell.keyThemes.length > 0 && (
              <div className="mb-3 sm:mb-4">
                <p className="text-[10px] sm:text-xs font-semibold text-gray-600 mb-1.5">✨ 共通の成功要因</p>
                <ul className="list-disc list-inside text-[10px] sm:text-xs text-gray-700 space-y-0.5">
                  {data.whatWorkedWell.keyThemes.slice(0, 3).map((theme, idx) => (
                    <li key={`good-theme-${idx}`}>{theme}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 再現アクション */}
            {data.whatWorkedWell.replicationActions && data.whatWorkedWell.replicationActions.length > 0 && (
              <div className="mb-3 sm:mb-4 bg-gradient-to-r from-amber-100 to-orange-100 rounded-lg p-2 sm:p-3 border border-amber-200">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-700" />
                  <p className="text-[10px] sm:text-xs font-semibold text-amber-900">🎯 成功パターンの再現アクション</p>
                </div>
                <ul className="space-y-1.5">
                  {data.whatWorkedWell.replicationActions.map((action, idx) => (
                    <li key={`replication-action-${idx}`} className="flex items-start gap-2 text-[10px] sm:text-xs text-gray-800">
                      <span className="text-amber-600 mt-0.5">→</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 次の投稿に活かすポイント */}
            {data.whatWorkedWell.suggestedAngles && data.whatWorkedWell.suggestedAngles.length > 0 && (
              <div className="bg-white/60 rounded-lg p-2 sm:p-3 border border-amber-100">
                <p className="text-[10px] sm:text-xs font-semibold text-gray-600 mb-1.5">💡 次の投稿に活かすポイント</p>
                <ul className="list-disc list-inside text-[10px] sm:text-xs text-gray-700 space-y-0.5">
                  {data.whatWorkedWell.suggestedAngles.slice(0, 3).map((angle, idx) => (
                    <li key={`good-angle-${idx}`}>{angle}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 何が悪かったか */}
        {data.whatDidntWork && data.whatDidntWork.count > 0 && (
          <div className="bg-gradient-to-r from-rose-50 to-orange-50 rounded-lg p-3 sm:p-4 border border-rose-200">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900">何が悪かったか</h3>
              <span className="text-[10px] sm:text-xs text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                {data.whatDidntWork.count}件の改善が必要な投稿
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-700 mb-2 sm:mb-3 leading-relaxed">{data.whatDidntWork.summary}</p>
            
            {/* 実際の失敗要因（数値データ） */}
            {data.whatDidntWork.failureFactors && data.whatDidntWork.failureFactors.length > 0 && (
              <div className="mb-2 sm:mb-3 bg-white/60 rounded-lg p-2 sm:p-3 border border-rose-100">
                <p className="text-[10px] sm:text-xs font-semibold text-rose-800 mb-1.5">📊 失敗要因（数値）</p>
                <ul className="list-disc list-inside text-[10px] sm:text-xs text-gray-700 space-y-1">
                  {data.whatDidntWork.failureFactors.slice(0, 4).map((factor, idx) => (
                    <li key={`failure-factor-${idx}`}>{factor}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* 改善のヒントを最初に表示（より重要） */}
            {data.whatDidntWork.cautions && data.whatDidntWork.cautions.length > 0 && (
              <div className="mb-2 sm:mb-3 bg-white/60 rounded-lg p-2 sm:p-3 border border-rose-100">
                <p className="text-[10px] sm:text-xs font-semibold text-rose-800 mb-1.5">💡 改善のヒント</p>
                <ul className="list-disc list-inside text-[10px] sm:text-xs text-gray-700 space-y-1">
                  {data.whatDidntWork.cautions.slice(0, 3).map((caution, idx) => (
                    <li key={`bad-caution-${idx}`}>{caution}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* 共通の課題（ハッシュタグではない実際の課題） */}
            {data.whatDidntWork.keyThemes && data.whatDidntWork.keyThemes.length > 0 && (
              <div className="mb-2 sm:mb-3">
                <p className="text-[10px] sm:text-xs font-semibold text-gray-600 mb-1">共通の課題:</p>
                <ul className="list-disc list-inside text-[10px] sm:text-xs text-gray-700 space-y-0.5">
                  {data.whatDidntWork.keyThemes.slice(0, 3).map((theme, idx) => (
                    <li key={`bad-theme-${idx}`}>{theme}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* ハッシュタグ情報（参考程度に表示） */}
            {(data.whatDidntWork as any).hashtags && (data.whatDidntWork as any).hashtags.length > 0 && (
              <div className="text-[10px] sm:text-xs text-gray-500 italic">
                よく使われたハッシュタグ: {(data.whatDidntWork as any).hashtags[0].split(/\s+/).slice(0, 5).join("、")}...
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

