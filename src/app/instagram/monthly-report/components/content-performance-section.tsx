import React from "react";
import {
  Heart,
  MessageCircle,
  Share,
  Save,
  Eye,
  Users,
  Target,
  TrendingUp,
  Clock,
  ChevronDown,
} from "lucide-react";

type AudienceBreakdown = {
  gender?: { male: number; female: number; other: number };
  age?: { "18-24": number; "25-34": number; "35-44": number; "45-54": number };
};

type FeedStats = {
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalReposts: number;
  totalSaves: number;
  totalReach: number;
  totalFollowerIncrease: number;
  totalInteractionCount: number;
  avgReachFollowerPercent: number;
  avgInteractionFollowerPercent: number;
  reachSources: {
    profile: number;
    feed: number;
    explore: number;
    search: number;
    other: number;
  };
  totalReachedAccounts: number;
  totalProfileVisits: number;
  audienceBreakdown?: AudienceBreakdown;
};

type ReelStats = {
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalReposts: number;
  totalSaves: number;
  totalReach: number;
  totalFollowerIncrease: number;
  totalInteractionCount: number;
  avgReachFollowerPercent: number;
  avgInteractionFollowerPercent: number;
  reachSources: {
    profile: number;
    reel: number;
    explore: number;
    search: number;
    other: number;
  };
  totalReachedAccounts: number;
  totalPlayTimeSeconds: number;
  avgPlayTimeSeconds: number;
  avgSkipRate: number;
  avgNormalSkipRate: number;
  audienceBreakdown?: AudienceBreakdown;
};
interface ContentPerformanceSectionProps {
  feedStats?: FeedStats | null;
  reelStats?: ReelStats | null;
}

const formatNumber = (value: number) =>
  typeof value === "number" ? value.toLocaleString() : "-";

const formatPercent = (value: number) =>
  typeof value === "number" ? `${value.toFixed(1)}%` : "-";

const formatSeconds = (seconds: number) => {
  if (!seconds || seconds <= 0) {
    return "-";
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (h) {parts.push(`${h}h`);}
  if (m || h) {parts.push(`${m}m`);}
  parts.push(`${s}s`);
  return parts.join(" ");
};

const SectionCard: React.FC<{
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="bg-white rounded-none shadow-sm border border-gray-200">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
};

const StatGrid: React.FC<{
  items: Array<{ label: string; value: string; icon: React.ReactNode }>;
}> = ({ items }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {items.map((item) => (
      <div
        key={item.label}
        className="bg-white border border-gray-200 p-4 flex items-center justify-between"
      >
        <div>
          <p className="text-xs text-gray-500">{item.label}</p>
          <p className="text-2xl font-semibold text-gray-900">{item.value}</p>
        </div>
        {item.icon}
      </div>
    ))}
  </div>
);

export const ContentPerformanceSection: React.FC<ContentPerformanceSectionProps> = ({
  feedStats,
  reelStats,
}) => {
  if (!feedStats && !reelStats) {
    return (
      <div className="bg-white rounded-none border border-dashed border-gray-300 p-6 text-center text-sm text-gray-600">
        フィードまたはリールの分析データを入力すると、ここに今月の総まとめが表示されます。
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {feedStats ? (
          <SectionCard title="フィード統計サマリー">
            <div className="space-y-6">
            <StatGrid
              items={[
                {
                  label: "総いいね",
                  value: formatNumber(feedStats.totalLikes),
                  icon: <Heart className="w-8 h-8 text-[#ff8a15]" />,
                },
                {
                  label: "総コメント",
                  value: formatNumber(feedStats.totalComments),
                  icon: <MessageCircle className="w-8 h-8 text-[#ff8a15]" />,
                },
                {
                  label: "総シェア",
                  value: formatNumber(feedStats.totalShares),
                  icon: <Share className="w-8 h-8 text-[#ff8a15]" />,
                },
                {
                  label: "総リーチ",
                  value: formatNumber(feedStats.totalReach),
                  icon: <Eye className="w-8 h-8 text-[#ff8a15]" />,
                },
                {
                  label: "総保存",
                  value: formatNumber(feedStats.totalSaves),
                  icon: <Save className="w-8 h-8 text-[#ff8a15]" />,
                },
                {
                  label: "フォロワー増加",
                  value: formatNumber(feedStats.totalFollowerIncrease),
                  icon: <Users className="w-8 h-8 text-[#ff8a15]" />,
                },
              ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 border border-gray-200 p-4">
                <p className="text-xs text-gray-500 mb-1">総インタラクション数</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatNumber(feedStats.totalInteractionCount)}
                </p>
                <p className="text-xs text-gray-500 mt-4">平均閲覧フォロワー%</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatPercent(feedStats.avgReachFollowerPercent)}
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 p-4">
                <p className="text-xs text-gray-500 mb-1">平均インタラクションフォロワー%</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatPercent(feedStats.avgInteractionFollowerPercent)}
                </p>
                <p className="text-xs text-gray-500 mt-4">プロフィールアクセス</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatNumber(feedStats.totalProfileVisits)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">閲覧ソース内訳</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: "プロフィール", value: feedStats.reachSources.profile },
                  { label: "フィード", value: feedStats.reachSources.feed },
                  { label: "発見", value: feedStats.reachSources.explore },
                  { label: "検索", value: feedStats.reachSources.search },
                  { label: "その他", value: feedStats.reachSources.other },
                ].map((source) => (
                  <div key={source.label} className="bg-white border border-gray-200 p-4">
                    <p className="text-xs text-gray-500">{source.label}</p>
                    <p className="text-xl font-semibold text-gray-900">
                      {formatNumber(source.value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">リーチしたアカウント</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatNumber(feedStats.totalReachedAccounts)}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-[#ff8a15]" />
            </div>
          </div>

          </SectionCard>
        ) : null}

        {reelStats ? (
          <SectionCard title="リール統計サマリー">
            <div className="space-y-6">
            <StatGrid
              items={[
                {
                  label: "総いいね",
                  value: formatNumber(reelStats.totalLikes),
                  icon: <Heart className="w-8 h-8 text-[#ff8a15]" />,
                },
                {
                  label: "総コメント",
                  value: formatNumber(reelStats.totalComments),
                  icon: <MessageCircle className="w-8 h-8 text-[#ff8a15]" />,
                },
                {
                  label: "総シェア",
                  value: formatNumber(reelStats.totalShares),
                  icon: <Share className="w-8 h-8 text-[#ff8a15]" />,
                },
                {
                  label: "総リーチ",
                  value: formatNumber(reelStats.totalReach),
                  icon: <Eye className="w-8 h-8 text-[#ff8a15]" />,
                },
                {
                  label: "総保存",
                  value: formatNumber(reelStats.totalSaves),
                  icon: <Save className="w-8 h-8 text-[#ff8a15]" />,
                },
                {
                  label: "フォロワー増加",
                  value: formatNumber(reelStats.totalFollowerIncrease),
                  icon: <Users className="w-8 h-8 text-[#ff8a15]" />,
                },
              ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 border border-gray-200 p-4">
                <p className="text-xs text-gray-500 mb-1">総インタラクション数</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatNumber(reelStats.totalInteractionCount)}
                </p>
                <p className="text-xs text-gray-500 mt-4">平均閲覧フォロワー%</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatPercent(reelStats.avgReachFollowerPercent)}
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 p-4">
                <p className="text-xs text-gray-500 mb-1">平均インタラクションフォロワー%</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatPercent(reelStats.avgInteractionFollowerPercent)}
                </p>
                <p className="text-xs text-gray-500 mt-4">平均再生時間</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatSeconds(reelStats.avgPlayTimeSeconds)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 p-4">
                <p className="text-xs text-gray-500">合計再生時間</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatSeconds(reelStats.totalPlayTimeSeconds)}
                </p>
              </div>
              <div className="bg-white border border-gray-200 p-4">
                <p className="text-xs text-gray-500">平均スキップ率</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatPercent(reelStats.avgSkipRate)}
                </p>
                <p className="text-xs text-gray-500 mt-2">ノーマルスキップ率</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatPercent(reelStats.avgNormalSkipRate)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">閲覧ソース内訳</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: "プロフィール", value: reelStats.reachSources.profile },
                  { label: "リール", value: reelStats.reachSources.reel },
                  { label: "発見", value: reelStats.reachSources.explore },
                  { label: "検索", value: reelStats.reachSources.search },
                  { label: "その他", value: reelStats.reachSources.other },
                ].map((source) => (
                  <div key={source.label} className="bg-white border border-gray-200 p-4">
                    <p className="text-xs text-gray-500">{source.label}</p>
                    <p className="text-xl font-semibold text-gray-900">
                      {formatNumber(source.value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">リーチしたアカウント</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatNumber(reelStats.totalReachedAccounts)}
                </p>
              </div>
              <Clock className="w-10 h-10 text-[#ff8a15]" />
            </div>
          </div>

          </SectionCard>
        ) : null}
      </div>
    </div>
  );
};


