"use client";

import React, { useMemo } from "react";
import { Sparkles, Target, TrendingDown } from "lucide-react";

type SnapshotReference = {
  id: string;
  status: "gold" | "negative" | "normal";
  score?: number;
  summary?: string;
  metrics?: {
    engagementRate?: number;
    saveRate?: number;
    reach?: number;
    saves?: number;
  };
  textFeatures?: Record<string, unknown>;
};

type ReportPost = {
  id: string;
  title: string;
  postType: "feed" | "reel" | "story";
  createdAt?: string | Date | { toDate: () => Date };
  snapshotReferences?: SnapshotReference[];
};

interface SnapshotReferenceSectionProps {
  posts?: ReportPost[];
  unifiedTotalPosts?: number; // total posts derived/augmented by AI or summary
}

const statusConfig: Record<
  SnapshotReference["status"],
  { label: string; icon: React.ReactNode; badgeClass: string }
> = {
  gold: {
    label: "ゴールド投稿",
    icon: <Sparkles className="h-4 w-4 text-amber-500" />,
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
  },
  negative: {
    label: "改善投稿",
    icon: <TrendingDown className="h-4 w-4 text-rose-500" />,
    badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
  },
  normal: {
    label: "参考投稿",
    icon: <Target className="h-4 w-4 text-slate-500" />,
    badgeClass: "border-slate-200 bg-slate-50 text-slate-600",
  },
};

export function SnapshotReferenceSection({ posts, unifiedTotalPosts }: SnapshotReferenceSectionProps) {
  const references = useMemo(() => {
    const map = new Map<
      string,
      SnapshotReference & { sourcePostTitle: string; sourcePostType: string; createdAtLabel: string }
    >();

    posts?.forEach((post) => {
      const createdAt =
        post.createdAt instanceof Date
          ? post.createdAt
          : typeof post.createdAt === "object" && post.createdAt && "toDate" in post.createdAt
            ? post.createdAt.toDate()
            : post.createdAt
              ? new Date(post.createdAt)
              : null;
      const createdAtLabel = createdAt ? createdAt.toLocaleDateString("ja-JP") : "";

      (post.snapshotReferences || []).forEach((reference) => {
        if (!reference?.id || map.has(reference.id)) {return;}
        map.set(reference.id, {
          ...reference,
          sourcePostTitle: post.title,
          sourcePostType: post.postType,
          createdAtLabel,
        });
      });
    });

    return Array.from(map.values());
  }, [posts]);

  return (
    <div className="bg-white border border-slate-200 rounded-none p-6 shadow-sm mb-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">参照された成功/改善パターン</p>
          <p className="text-xs text-slate-500">今月の投稿がどのゴールド/ネガティブ投稿を根拠にしたかを表示</p>
        </div>
      </div>

      {(unifiedTotalPosts ?? 0) === 0 ? (
        <div className="py-8 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-none bg-slate-50/50">
          まだ参照可能な投稿がありません。投稿の分析が蓄積されるとここに表示されます。
        </div>
      ) : references.length === 0 ? null : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {references.slice(0, 6).map((reference) => {
            const config = statusConfig[reference.status] ?? statusConfig.normal;
            const structureTags = Array.isArray(
              (reference.textFeatures as Record<string, unknown>)?.structureTags
            )
              ? ((reference.textFeatures as Record<string, unknown>).structureTags as string[])
              : undefined;
            return (
              <div key={reference.id} className="border border-slate-200 rounded-none p-4 bg-slate-50/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    {config.icon}
                    <span
                      dangerouslySetInnerHTML={{
                        __html: String(config.label || ""),
                      }}
                    />
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${config.badgeClass}`}>
                    {reference.sourcePostType === "reel"
                      ? "リール"
                      : reference.sourcePostType === "story"
                        ? "ストーリーズ"
                        : "フィード"}
                  </span>
                </div>
                <p
                  className="text-sm font-semibold text-slate-900 line-clamp-2"
                  dangerouslySetInnerHTML={{
                    __html: String(reference.sourcePostTitle || "無題の投稿"),
                  }}
                />
                <p className="text-xs text-slate-500 mt-1">{reference.createdAtLabel}</p>
                <p
                  className="text-xs text-slate-600 mt-2"
                  dangerouslySetInnerHTML={{
                    __html:
                      reference.summary ||
                      `ER ${reference.metrics?.engagementRate ?? "-"}% / 保存率 ${
                        reference.metrics?.saveRate ?? "-"
                      }%`,
                  }}
                />
                {structureTags && structureTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {structureTags.slice(0, 4).map((tag) => (
                      <span
                        key={`${reference.id}-tag-${tag}`}
                        className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 bg-white text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                    {structureTags.length > 4 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 bg-white text-slate-500">
                        +{structureTags.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

