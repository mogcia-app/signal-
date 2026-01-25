import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAuthContext } from "@/lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { canAccessFeature } from "@/lib/plan-access";
import * as admin from "firebase-admin";

interface KPIBreakdownSegment {
  label: string;
  value: number;
  delta?: number;
}

interface KPIBreakdownTopPost {
  postId: string;
  title: string;
  value: number;
  postType?: "feed" | "reel" | "story";
  status?: "gold" | "negative" | "normal";
}

export interface KPIBreakdown {
  key: "reach" | "saves" | "followers" | "engagement" | "total_interaction" | "external_links" | "profile_visits" | "current_followers";
  label: string;
  value: number;
  unit?: "count" | "percent";
  changePct?: number;
  segments?: KPIBreakdownSegment[];
  topPosts?: KPIBreakdownTopPost[];
  insight?: string;
}

export interface TimeSlotEntry {
  label: string;
  range: number[];
  color: string;
  postsInRange: number;
  avgEngagement: number;
  postTypes?: Array<{
    type: "feed" | "reel";
    count: number;
    avgEngagement: number;
  }>;
}

interface PostWithAnalytics {
  id: string;
  title: string;
  postType: "feed" | "reel" | "story";
  hashtags?: string[] | string;
  analyticsSummary?: {
    likes?: number;
    comments?: number;
    shares?: number;
    reach?: number;
    saves?: number;
    followerIncrease?: number;
    publishedTime?: string;
    // フィード専用
    reachFollowerPercent?: number;
    interactionCount?: number;
    interactionFollowerPercent?: number;
    reachSourceProfile?: number;
    reachSourceFeed?: number;
    reachSourceExplore?: number;
    reachSourceSearch?: number;
    reachSourceOther?: number;
    reachedAccounts?: number;
    profileVisits?: number;
    externalLinkTaps?: number; // 外部リンクタップ数（フィード専用）
    // リール専用
    reelReachFollowerPercent?: number;
    reelInteractionCount?: number;
    reelInteractionFollowerPercent?: number;
    reelReachSourceProfile?: number;
    reelReachSourceReel?: number;
    reelReachSourceExplore?: number;
    reelReachSourceSearch?: number;
    reelReachSourceOther?: number;
    reelReachedAccounts?: number;
              reelPlayTime?: number;
              reelAvgPlayTime?: number;
              reelSkipRate?: number;
              reelNormalSkipRate?: number;
              // オーディエンス分析
              audience?: {
                gender?: { male: number; female: number; other: number };
                age?: { "18-24": number; "25-34": number; "35-44": number; "45-54": number };
              } | null;
            };
}

export interface FeedStats {
  totalLikes: number;
  totalComments: number;
  totalShares: number;
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
  totalExternalLinkTaps: number;
}

export interface ReelStats {
  totalLikes: number;
  totalComments: number;
  totalShares: number;
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
}

export interface AudienceBreakdown {
  gender?: { male: number; female: number; other: number };
  age?: { "18-24": number; "25-34": number; "35-44": number; "45-54": number };
}

export interface DailyKPI {
  date: string;
  label: string;
  likes: number;
  reach: number;
  saves: number;
  comments: number;
  engagement: number; // likes + comments + shares + saves
}

export interface GoalAchievement {
  key: string;
  label: string;
  target: number;
  actual: number;
  achievementRate: number; // 0-100
  unit?: string;
  status: "achieved" | "on_track" | "at_risk" | "not_set";
}

function buildTopPosts(
  posts: PostWithAnalytics[],
  getValue: (summary: PostWithAnalytics["analyticsSummary"]) => number,
  snapshotStatusMap: Map<string, "gold" | "negative" | "normal">
): KPIBreakdownTopPost[] {
  return posts
    .map((post) => ({
      postId: post.id,
      title: post.title || "無題の投稿",
      value: getValue(post.analyticsSummary),
      postType: post.postType,
      status: snapshotStatusMap.get(post.id) || "normal",
    }))
    .filter((post) => post.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
}

function summarizeSegments(segments: KPIBreakdownSegment[], totalValue: number): string | undefined {
  if (segments.length === 0 || totalValue === 0) {
    return undefined;
  }
  const topSegment = segments[0];
  const share = (topSegment.value / totalValue) * 100;
  if (share >= 50) {
    return `${topSegment.label}が${share.toFixed(1)}%を占めています。`;
  }
  return undefined;
}

function buildKpiBreakdowns(params: {
  totals: {
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalReach: number;
    totalSaves: number;
    totalFollowerIncrease: number;
    totalInteraction: number;
    totalExternalLinkTaps: number;
    totalProfileVisits: number;
  };
  previousTotals: {
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalReach: number;
    totalSaves: number;
    totalFollowerIncrease: number;
    totalInteraction: number;
    totalExternalLinkTaps: number;
    totalProfileVisits: number;
  };
  changes: {
    reachChange: number | undefined;
    savesChange: number | undefined;
    followerChange: number | undefined;
    totalInteractionChange: number | undefined;
    externalLinkTapsChange: number | undefined;
    profileVisitsChange: number | undefined;
  };
  profileVisitsFromPosts: number; // 投稿からのプロフィール閲覧数
  profileVisitsFromOther: number; // その他からのプロフィール閲覧数
  externalLinkTapsFromPosts: number; // 投稿からの外部リンク数
  externalLinkTapsFromOther: number; // その他からの外部リンク数
  currentFollowers: number; // /homeで入力された値（その他からの増加数）
  previousCurrentFollowers: number; // 前期間の/homeで入力された値（その他からの増加数）
  followerIncreaseFromReel: number; // リールからの増加数
  followerIncreaseFromFeed: number; // フィードからの増加数
  followerIncreaseFromOther: number; // その他からの増加数
  isFirstMonth?: boolean; // 初月かどうか
  initialFollowers?: number; // ツール利用開始時のフォロワー数
  reachSourceAnalysis: {
    sources: {
      posts: number;
      profile: number;
      explore: number;
      search: number;
      other: number;
    };
  };
  posts: PostWithAnalytics[];
  snapshotStatusMap: Map<string, "gold" | "negative" | "normal">;
}): KPIBreakdown[] {
  const { totals, previousTotals, changes, reachSourceAnalysis, posts, snapshotStatusMap } = params;
  const typeLabelMap: Record<string, string> = {
    feed: "フィード",
    reel: "リール",
    story: "ストーリーズ",
  };

  // リーチ
  const reachSegments: KPIBreakdownSegment[] = [
    { label: "投稿からの流入", value: reachSourceAnalysis?.sources?.posts || 0 },
    { label: "プロフィール閲覧", value: reachSourceAnalysis?.sources?.profile || 0 },
    { label: "発見タブ", value: reachSourceAnalysis?.sources?.explore || 0 },
    { label: "検索結果", value: reachSourceAnalysis?.sources?.search || 0 },
    { label: "その他チャネル", value: reachSourceAnalysis?.sources?.other || 0 },
  ].filter((segment) => segment.value > 0);

  const reachValue = totals.totalReach || 0;
  const reachBreakdown: KPIBreakdown = {
    key: "reach",
    label: "リーチ",
    value: reachValue,
    unit: "count",
    changePct: changes.reachChange ?? 0,
    segments: reachSegments,
    topPosts: buildTopPosts(
      posts,
      (summary) => summary?.reach || 0,
      snapshotStatusMap
    ),
    insight: summarizeSegments(reachSegments, reachValue),
  };

  // 保存数
  const savesByType = posts.reduce<Record<string, number>>((acc, post) => {
    const type = post.postType || "feed";
    const saves = post.analyticsSummary?.saves || 0;
    acc[type] = (acc[type] || 0) + saves;
    return acc;
  }, {});

  const savesSegments: KPIBreakdownSegment[] = Object.entries(savesByType)
    .map(([type, value]) => ({
      label: typeLabelMap[type] || type,
      value,
    }))
    .filter((segment) => segment.value > 0)
    .sort((a, b) => b.value - a.value);

  const savesValue = totals.totalSaves || 0;
  const savesBreakdown: KPIBreakdown = {
    key: "saves",
    label: "保存数",
    value: savesValue,
    unit: "count",
    changePct: changes.savesChange ?? 0,
    segments: savesSegments,
    topPosts: buildTopPosts(
      posts,
      (summary) => summary?.saves || 0,
      snapshotStatusMap
    ),
    insight: summarizeSegments(savesSegments, savesValue),
  };

  // リール・フィードの合計いいね数
  const likesSegmentsRaw = posts.reduce<Record<string, number>>((acc, post) => {
    const type = post.postType || "feed";
    // リールとフィードのみを集計
    if (type === "reel" || type === "feed") {
      const likes = post.analyticsSummary?.likes || 0;
      acc[type] = (acc[type] || 0) + likes;
    }
    return acc;
  }, {});

  const likesSegments: KPIBreakdownSegment[] = Object.entries(likesSegmentsRaw)
    .map(([type, value]) => ({
      label: typeLabelMap[type] || type,
      value,
    }))
    .filter((segment) => segment.value !== 0)
    .sort((a, b) => b.value - a.value);

  // リールとフィードのいいね数の合計
  const likesValue = (totals.totalLikes || 0);
  const previousLikesValue = (previousTotals.totalLikes || 0);
  // 前月が0の場合は前月比を計算しない（undefinedを返す）
  const likesChange =
    previousLikesValue === 0
      ? undefined
      : ((likesValue - previousLikesValue) / previousLikesValue) * 100;

  const followerBreakdown: KPIBreakdown = {
    key: "followers",
    label: "リール・フィードの合計いいね数",
    value: likesValue,
    unit: "count",
    changePct: likesChange,
    segments: likesSegments,
    topPosts: buildTopPosts(
      posts.filter((post) => post.postType === "reel" || post.postType === "feed"),
      (summary) => summary?.likes || 0,
      snapshotStatusMap
    ),
    insight: summarizeSegments(likesSegments, likesValue),
  };

  // エンゲージメント
  const engagementValue =
    (totals.totalLikes || 0) +
    (totals.totalComments || 0) +
    (totals.totalShares || 0) +
    (totals.totalSaves || 0);
  const previousEngagementValue =
    (previousTotals.totalLikes || 0) +
    (previousTotals.totalComments || 0) +
    (previousTotals.totalShares || 0) +
    (previousTotals.totalSaves || 0);
  // 前月が0の場合は前月比を計算しない（nullを返す）
  const engagementChange =
    previousEngagementValue === 0
      ? undefined
      : ((engagementValue - previousEngagementValue) / previousEngagementValue) * 100;

  const engagementSegments: KPIBreakdownSegment[] = [
    { label: "いいね", value: totals.totalLikes || 0 },
    { label: "コメント", value: totals.totalComments || 0 },
    { label: "シェア", value: totals.totalShares || 0 },
    { label: "保存", value: totals.totalSaves || 0 },
  ].filter((segment) => segment.value > 0);

  const engagementBreakdown: KPIBreakdown = {
    key: "engagement",
    label: "エンゲージメント（総和）",
    value: engagementValue,
    unit: "count",
    changePct: engagementChange,
    segments: engagementSegments,
    topPosts: buildTopPosts(
      posts,
      (summary) =>
        (summary?.likes || 0) + (summary?.comments || 0) + (summary?.shares || 0) + (summary?.saves || 0),
      snapshotStatusMap
    ),
    insight: summarizeSegments(engagementSegments, engagementValue),
  };

  // 総合インタラクション数（フィード+リール合わせた、いいね+保存+コメント+シェアのトータル）
  const totalInteractionValue = params.totals.totalInteraction || 0;
  const previousTotalInteractionValue = params.previousTotals.totalInteraction || 0;
  // 前月が0の場合は前月比を計算しない（undefinedを返す）
  const totalInteractionChange =
    previousTotalInteractionValue === 0
      ? undefined
      : ((totalInteractionValue - previousTotalInteractionValue) / previousTotalInteractionValue) * 100;

  const totalInteractionByType = posts.reduce<Record<string, number>>((acc, post) => {
    const type = post.postType || "feed";
    const summary = post.analyticsSummary;
    if (!summary) return acc;
    const interaction = (summary.likes || 0) + (summary.saves || 0) + (summary.comments || 0) + (summary.shares || 0);
    acc[type] = (acc[type] || 0) + interaction;
    return acc;
  }, {});

  const totalInteractionSegments: KPIBreakdownSegment[] = Object.entries(totalInteractionByType)
    .map(([type, value]) => ({
      label: typeLabelMap[type] || type,
      value,
    }))
    .filter((segment) => segment.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalInteractionBreakdown: KPIBreakdown = {
    key: "total_interaction",
    label: "総合インタラクション数",
    value: totalInteractionValue,
    unit: "count",
    changePct: totalInteractionChange,
    segments: totalInteractionSegments,
    topPosts: buildTopPosts(
      posts,
      (summary) =>
        (summary?.likes || 0) + (summary?.saves || 0) + (summary?.comments || 0) + (summary?.shares || 0),
      snapshotStatusMap
    ),
    insight: summarizeSegments(totalInteractionSegments, totalInteractionValue),
  };

  // 外部リンク数（投稿からの外部リンク数 + その他からの外部リンク数）
  const externalLinkTapsValue = params.totals.totalExternalLinkTaps || 0;
  const previousExternalLinkTapsValue = params.previousTotals.totalExternalLinkTaps || 0;
  // 前月が0の場合は前月比を計算しない（undefinedを返す）
  const externalLinkTapsChange =
    previousExternalLinkTapsValue === 0
      ? undefined
      : ((externalLinkTapsValue - previousExternalLinkTapsValue) / previousExternalLinkTapsValue) * 100;

  // 外部リンク数の内訳を表示
  // 1. 投稿から = フィード投稿のexternalLinkTapsの合計
  // 2. その他から = /homeで入力された値（externalLinkTapsFromOther）
  const externalLinkTapsSegments: KPIBreakdownSegment[] = [];
  if (params.externalLinkTapsFromPosts && params.externalLinkTapsFromPosts > 0) {
    externalLinkTapsSegments.push({
      label: "投稿から",
      value: params.externalLinkTapsFromPosts,
    });
  }
  if (params.externalLinkTapsFromOther && params.externalLinkTapsFromOther > 0) {
    externalLinkTapsSegments.push({
      label: "その他から",
      value: params.externalLinkTapsFromOther,
    });
  }

  const externalLinkTapsBreakdown: KPIBreakdown = {
    key: "external_links",
    label: "外部リンク数",
    value: externalLinkTapsValue,
    unit: "count",
    changePct: externalLinkTapsChange,
    segments: externalLinkTapsSegments.length > 0 ? externalLinkTapsSegments : undefined,
    topPosts: buildTopPosts(
      posts.filter((post) => post.postType === "feed"),
      (summary) => summary?.externalLinkTaps || 0,
      snapshotStatusMap
    ),
    insight: externalLinkTapsSegments.length > 0 
      ? summarizeSegments(externalLinkTapsSegments, externalLinkTapsValue)
      : undefined,
  };

  // プロフィール閲覧数（投稿からの閲覧数 + その他からの取得）
  const profileVisitsValue = params.totals.totalProfileVisits || 0;
  const previousProfileVisitsValue = params.previousTotals.totalProfileVisits || 0;
  // 前月が0の場合は前月比を計算しない（undefinedを返す）
  const profileVisitsChange =
    previousProfileVisitsValue === 0
      ? undefined
      : ((profileVisitsValue - previousProfileVisitsValue) / previousProfileVisitsValue) * 100;

  const profileVisitsSegments: KPIBreakdownSegment[] = [
    { label: "投稿からの閲覧数", value: params.profileVisitsFromPosts || 0 },
    { label: "その他からの取得", value: params.profileVisitsFromOther || 0 },
  ].filter((segment) => segment.value > 0);

  const profileVisitsBreakdown: KPIBreakdown = {
    key: "profile_visits",
    label: "プロフィール閲覧数",
    value: profileVisitsValue,
    unit: "count",
    changePct: profileVisitsChange,
    segments: profileVisitsSegments,
    topPosts: buildTopPosts(
      posts,
      (summary) => summary?.profileVisits || 0,
      snapshotStatusMap
    ),
    insight: summarizeSegments(profileVisitsSegments, profileVisitsValue),
  };

  // フォロワー数の合計増加数の変化率を計算
  // totals.totalFollowerIncrease = 今月の合計増加数（投稿からの増加 + その他からの増加）
  // previousTotals.totalFollowerIncrease = 前期間の合計増加数
  const currentFollowersChange =
    // 前月が0の場合は前月比を計算しない（undefinedを返す）
    previousTotals.totalFollowerIncrease === 0
      ? undefined
      : ((totals.totalFollowerIncrease - previousTotals.totalFollowerIncrease) / Math.abs(previousTotals.totalFollowerIncrease)) * 100;

  // フォロワー数の内訳を表示（月ごとにリセット、その月の増加数のみを表示）
  // すべての月で、その月のリールから + フィードから + その他からの増加数のみを表示
  const currentFollowersSegments: KPIBreakdownSegment[] = [];
  
  // リール、フィード、その他からの増加数を追加（初月でもinitialFollowersは含めない）
  if (params.followerIncreaseFromReel && params.followerIncreaseFromReel > 0) {
    currentFollowersSegments.push({
      label: "リールから",
      value: params.followerIncreaseFromReel,
    });
  }
  if (params.followerIncreaseFromFeed && params.followerIncreaseFromFeed > 0) {
    currentFollowersSegments.push({
      label: "フィードから",
      value: params.followerIncreaseFromFeed,
    });
  }
  if (params.followerIncreaseFromOther && params.followerIncreaseFromOther > 0) {
    currentFollowersSegments.push({
      label: "その他から",
      value: params.followerIncreaseFromOther,
    });
  }

  // 合計増加数の計算
  // totals.totalFollowerIncreaseには既に計算済みの値が入っている（初月の場合はツール利用開始時のフォロワー数を含む）
  const totalFollowerIncrease = params.totals.totalFollowerIncrease;

  // フォロワー数の表示値は、増加数の合計とする（現在のフォロワー数ではなく）
  // これにより、valueとsegmentsの整合性が取れる
  const currentFollowersBreakdown: KPIBreakdown = {
    key: "current_followers",
    label: "フォロワー数",
    value: totalFollowerIncrease, // 増加数の合計を表示
    unit: "count",
    changePct: currentFollowersChange,
    segments: currentFollowersSegments.length > 0 ? currentFollowersSegments : undefined,
    topPosts: buildTopPosts(
      posts,
      (summary) => summary?.followerIncrease || 0,
      snapshotStatusMap
    ),
    insight: currentFollowersSegments.length > 0 
      ? summarizeSegments(currentFollowersSegments, totalFollowerIncrease)
      : undefined,
  };

  return [
    reachBreakdown,
    savesBreakdown,
    followerBreakdown,
    engagementBreakdown,
    totalInteractionBreakdown,
    externalLinkTapsBreakdown,
    profileVisitsBreakdown,
    currentFollowersBreakdown,
  ];
}

// 投稿時間分析を計算
function calculateTimeSlotAnalysis(
  postsWithAnalytics: PostWithAnalytics[]
): TimeSlotEntry[] {
  const timeSlots = [
    { label: "早朝 (6-9時)", range: [6, 9], color: "from-blue-400 to-blue-600" },
    { label: "午前 (9-12時)", range: [9, 12], color: "from-green-400 to-green-600" },
    { label: "午後 (12-15時)", range: [12, 15], color: "from-yellow-400 to-yellow-600" },
    { label: "夕方 (15-18時)", range: [15, 18], color: "from-orange-400 to-orange-600" },
    { label: "夜 (18-21時)", range: [18, 21], color: "from-red-400 to-red-600" },
    { label: "深夜 (21-6時)", range: [21, 24], color: "from-purple-400 to-purple-600" },
  ];

  return timeSlots.map(({ label, range, color }) => {
    // 時間帯でフィルタリング
    const postsInRange = postsWithAnalytics.filter((post) => {
      const publishedTime = post.analyticsSummary?.publishedTime;
      if (!publishedTime || publishedTime === "") {
        return false;
      }
      const hour = parseInt(publishedTime.split(":")[0]);
      if (isNaN(hour)) {
        return false;
      }

      // 深夜の場合は特別処理
      if (range[0] === 21 && range[1] === 24) {
        return hour >= 21 || hour < 6;
      }

      return hour >= range[0] && hour < range[1];
    });

    const avgEngagement =
      postsInRange.length > 0
        ? postsInRange.reduce(
            (sum, post) => {
              const summary = post.analyticsSummary;
              if (!summary) return sum;
              return (
                sum +
                ((summary.likes || 0) + (summary.comments || 0) + (summary.shares || 0))
              );
            },
            0
          ) / postsInRange.length
        : 0;

    const postTypeStats = ["feed", "reel"].map((type) => {
      const typePosts = postsInRange.filter((post) => post.postType === type);
      const typeAvgEngagement =
        typePosts.length > 0
          ? typePosts.reduce(
              (sum, post) => {
                const summary = post.analyticsSummary;
                if (!summary) return sum;
                return (
                  sum +
                  ((summary.likes || 0) + (summary.comments || 0) + (summary.shares || 0))
                );
              },
              0
            ) / typePosts.length
          : 0;
      return {
        type: type as "feed" | "reel",
        count: typePosts.length,
        avgEngagement: Number(typeAvgEngagement.toFixed(2)),
      };
    });

    return {
      label,
      range,
      color,
      postsInRange: postsInRange.length,
      avgEngagement,
      postTypes: postTypeStats,
    };
  });
}

// ハッシュタグ統計を計算
function calculateHashtagStats(posts: PostWithAnalytics[]): Array<{ hashtag: string; count: number }> {
  const hashtagCounts: { [key: string]: number } = {};

  posts.forEach((post) => {
    if (post.hashtags) {
      let hashtagsArray: string[] = [];

      // hashtagsが配列か文字列かを判定
      if (Array.isArray(post.hashtags)) {
        // 配列の場合、各要素が文字列として結合されている可能性があるため、各要素を分割
        post.hashtags.forEach((item) => {
          if (typeof item === "string") {
            // 文字列の場合は分割処理を実行
            let text = item.trim();
            const hashtagPattern = /#([^\s#,]+)/g;
            const matches = [...text.matchAll(hashtagPattern)];
            
            if (matches.length > 1) {
              // 複数の#で始まるハッシュタグ
              matches.forEach((match) => {
                const tag = match[1].trim();
                if (tag) hashtagsArray.push(tag);
              });
            } else {
              // 最初に#が1つだけ付いている場合
              text = text.replace(/^#+/, "").trim();
              text.split(/[\s,]+/).forEach((tag) => {
                const cleanedTag = tag.replace(/^#+/, "").trim();
                if (cleanedTag) hashtagsArray.push(cleanedTag);
              });
            }
          } else {
            // 既に個別のハッシュタグとして保存されている場合
            hashtagsArray.push(String(item).replace(/^#+/, "").trim());
          }
        });
        hashtagsArray = hashtagsArray.filter((tag) => tag);
      } else if (typeof post.hashtags === "string") {
        // 文字列の場合は、カンマ、スペース、またはハッシュタグ記号（#）で分割
        // 例: "#老人ホーム ひだまり デイサービス" → ["老人ホーム", "ひだまり", "デイサービス"]
        // 例: "#老人ホーム,#ひだまり,#デイサービス" → ["老人ホーム", "ひだまり", "デイサービス"]
        let text = post.hashtags.trim();
        
        // パターン1: 複数の#で始まるハッシュタグを個別に抽出（#の後に続く文字列を取得）
        // 例: "#老人ホーム #ひだまり #デイサービス" → ["老人ホーム", "ひだまり", "デイサービス"]
        const hashtagPattern = /#([^\s#,]+)/g;
        const matches = [...text.matchAll(hashtagPattern)];
        
        // 複数の#で始まるハッシュタグが見つかった場合（2つ以上）
        if (matches.length > 1) {
          hashtagsArray = matches.map((match) => match[1].trim()).filter((tag) => tag);
        } else {
          // パターン2: 最初に#が1つだけ付いている場合（例: "#老人ホーム ひだまり デイサービス"）
          // 最初の#を削除してから、スペースまたはカンマで分割
          text = text.replace(/^#+/, "").trim();
          // スペースまたはカンマで分割（連続するスペース/カンマも1つの区切りとして扱う）
          hashtagsArray = text
            .split(/[\s,]+/)
            .map((tag) => tag.replace(/^#+/, "").trim())
            .filter((tag) => tag.length > 0);
        }
        
        // デバッグログ（開発環境のみ）
        if (process.env.NODE_ENV === "development" && hashtagsArray.length > 0) {
          console.log(`[HashtagStats] Original: "${post.hashtags}", Parsed:`, hashtagsArray);
        }
      }

      if (hashtagsArray.length > 0) {
        hashtagsArray.forEach((hashtag) => {
          // ハッシュタグを正規化（先頭の#を削除、小文字に変換など）
          const normalizedHashtag = hashtag.replace(/^#+/, "").trim();
          if (normalizedHashtag) {
            hashtagCounts[normalizedHashtag] = (hashtagCounts[normalizedHashtag] || 0) + 1;
          }
        });
      }
    }
  });

  const result = Object.entries(hashtagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10) // 上位10件
    .map(([hashtag, count]) => ({ hashtag, count }));

  return result;
}

// フィード統計を計算
function calculateFeedStats(postsWithAnalytics: PostWithAnalytics[]): FeedStats | null {
  const feedPosts = postsWithAnalytics.filter((post) => post.postType === "feed" && post.analyticsSummary);
  if (feedPosts.length === 0) {
    return null;
  }

  const safeNumber = (value: number | undefined | null) => Number(value) || 0;

  const totalLikes = feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.likes), 0);
  const totalComments = feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.comments), 0);
  const totalShares = feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.shares), 0);
  const totalSaves = feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.saves), 0);
  const totalReach = feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reach), 0);
  const totalFollowerIncrease = feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.followerIncrease), 0);
  const totalInteractionCount = feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.interactionCount), 0);
  const totalProfileVisits = feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.profileVisits), 0);
  const totalReachedAccounts = feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reachedAccounts), 0);
  const totalExternalLinkTaps = feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.externalLinkTaps), 0);

  const avgReachFollowerPercent =
    feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reachFollowerPercent), 0) / feedPosts.length;
  const avgInteractionFollowerPercent =
    feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.interactionFollowerPercent), 0) / feedPosts.length;

  const reachSources = {
    profile: feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reachSourceProfile), 0),
    feed: feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reachSourceFeed), 0),
    explore: feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reachSourceExplore), 0),
    search: feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reachSourceSearch), 0),
    other: feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reachSourceOther), 0),
  };

  return {
    totalLikes,
    totalComments,
    totalShares,
    totalSaves,
    totalReach,
    totalFollowerIncrease,
    totalInteractionCount,
    avgReachFollowerPercent,
    avgInteractionFollowerPercent,
    reachSources,
    totalReachedAccounts,
    totalProfileVisits,
    totalExternalLinkTaps,
  };
}

// リール統計を計算
function calculateReelStats(postsWithAnalytics: PostWithAnalytics[]): ReelStats | null {
  const reelPosts = postsWithAnalytics.filter((post) => post.postType === "reel" && post.analyticsSummary);
  if (reelPosts.length === 0) {
    return null;
  }

  const safeNumber = (value: number | undefined | null) => Number(value) || 0;

  const totalLikes = reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.likes), 0);
  const totalComments = reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.comments), 0);
  const totalShares = reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.shares), 0);
  const totalSaves = reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.saves), 0);
  const totalReach = reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reach), 0);
  const totalFollowerIncrease = reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.followerIncrease), 0);
  const totalInteractionCount = reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reelInteractionCount), 0);
  const totalReachedAccounts = reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reelReachedAccounts), 0);
  const totalPlayTimeSeconds = reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reelPlayTime), 0);

  const avgReachFollowerPercent =
    reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reelReachFollowerPercent), 0) / reelPosts.length;
  const avgInteractionFollowerPercent =
    reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reelInteractionFollowerPercent), 0) / reelPosts.length;
  const avgPlayTimeSeconds =
    reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reelAvgPlayTime), 0) / reelPosts.length;
  const avgSkipRate =
    reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reelSkipRate), 0) / reelPosts.length;
  const avgNormalSkipRate =
    reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reelNormalSkipRate), 0) / reelPosts.length;

  const reachSources = {
    profile: reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reelReachSourceProfile), 0),
    reel: reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reelReachSourceReel), 0),
    explore: reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reelReachSourceExplore), 0),
    search: reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reelReachSourceSearch), 0),
    other: reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reelReachSourceOther), 0),
  };

  return {
    totalLikes,
    totalComments,
    totalShares,
    totalSaves,
    totalReach,
    totalFollowerIncrease,
    totalInteractionCount,
    avgReachFollowerPercent,
    avgInteractionFollowerPercent,
    reachSources,
    totalReachedAccounts,
    totalPlayTimeSeconds,
    avgPlayTimeSeconds,
    avgSkipRate,
    avgNormalSkipRate,
  };
}

// オーディエンス分析を計算
function calculateAudienceAnalysis(postsWithAnalytics: PostWithAnalytics[]): AudienceBreakdown {
  interface AnalyticsSummaryWithAudience {
    audience?: {
      gender?: { male: number; female: number; other: number };
      age?: { "18-24": number; "25-34": number; "35-44": number; "45-54": number };
    } | null;
  }

  const postsWithAudience = postsWithAnalytics.filter(
    (post) => post.analyticsSummary && (post.analyticsSummary as AnalyticsSummaryWithAudience).audience
  );
  
  if (postsWithAudience.length === 0) {
    return {
      gender: { male: 0, female: 0, other: 0 },
      age: { "18-24": 0, "25-34": 0, "35-44": 0, "45-54": 0 },
    };
  }

  const audienceData = postsWithAudience.map((post) => (post.analyticsSummary as AnalyticsSummaryWithAudience).audience);

  const avgGender = {
    male:
      audienceData.reduce((sum, data) => sum + (data?.gender?.male || 0), 0) / audienceData.length,
    female:
      audienceData.reduce((sum, data) => sum + (data?.gender?.female || 0), 0) / audienceData.length,
    other:
      audienceData.reduce((sum, data) => sum + (data?.gender?.other || 0), 0) / audienceData.length,
  };

  const avgAge = {
    "18-24":
      audienceData.reduce((sum, data) => sum + (data?.age?.["18-24"] || 0), 0) / audienceData.length,
    "25-34":
      audienceData.reduce((sum, data) => sum + (data?.age?.["25-34"] || 0), 0) / audienceData.length,
    "35-44":
      audienceData.reduce((sum, data) => sum + (data?.age?.["35-44"] || 0), 0) / audienceData.length,
    "45-54":
      audienceData.reduce((sum, data) => sum + (data?.age?.["45-54"] || 0), 0) / audienceData.length,
  };

  return { gender: avgGender, age: avgAge };
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request);

    // プラン階層別アクセス制御: 松プランのみアクセス可能
    const userProfile = await getUserProfile(uid);
    if (!canAccessFeature(userProfile, "canAccessKPI")) {
      return NextResponse.json(
        { success: false, error: "KPIダッシュボード機能は、現在のプランではご利用いただけません。" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    if (!date) {
      return NextResponse.json(
        { success: false, error: "date parameter is required" },
        { status: 400 }
      );
    }

    // 月の開始日と終了日を計算
    const [year, month] = date.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    const startTimestamp = admin.firestore.Timestamp.fromDate(startDate);
    const endTimestamp = admin.firestore.Timestamp.fromDate(endDate);

    // 前期間の計算
    const previousStartDate = new Date(year, month - 2, 1);
    const previousEndDate = new Date(year, month - 1, 0, 23, 59, 59, 999);
    const previousStartTimestamp = admin.firestore.Timestamp.fromDate(previousStartDate);
    const previousEndTimestamp = admin.firestore.Timestamp.fromDate(previousEndDate);

    // 分析データを取得（期間でフィルタリング）- 分析済みデータのみを使用
    const analyticsSnapshot = await adminDb
      .collection("analytics")
      .where("userId", "==", uid)
      .where("publishedAt", ">=", startTimestamp)
      .where("publishedAt", "<=", endTimestamp)
      .get();

    // 投稿IDごとに最新の分析データを保持（重複除去）
    const analyticsByPostId = new Map<string, admin.firestore.DocumentData>();
    analyticsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const postId = data.postId;
      if (!postId) return;

      const publishedAt = data.publishedAt
        ? data.publishedAt instanceof admin.firestore.Timestamp
          ? data.publishedAt.toDate()
          : data.publishedAt
        : null;

      if (!publishedAt) return;

      const existing = analyticsByPostId.get(postId);
      if (!existing || publishedAt > existing.publishedAt) {
        analyticsByPostId.set(postId, {
          ...data,
          publishedAt,
          publishedTime: data.publishedTime || "",
        });
      }
    });

    // analyticsコレクション（分析済みデータ）から投稿情報を構築
    const posts: Array<{
      id: string;
      title: string;
      postType: "feed" | "reel" | "story";
      hashtags: string[];
    }> = Array.from(analyticsByPostId.entries()).map(([postId, analyticsData]) => ({
      id: postId,
      title: analyticsData.title || "無題の投稿",
      postType: (analyticsData.category || analyticsData.postType || "feed") as "feed" | "reel" | "story",
      hashtags: analyticsData.hashtags || [],
    }));

    // 投稿と分析データをリンク（analyticsコレクションのデータのみを使用）
    const postsWithAnalytics: PostWithAnalytics[] = posts.map((post) => {
      const analytics = analyticsByPostId.get(post.id);
      return {
        ...post,
        analyticsSummary: analytics
          ? {
              likes: analytics.likes || 0,
              comments: analytics.comments || 0,
              shares: analytics.shares || 0,
              reach: analytics.reach || 0,
              saves: analytics.saves || 0,
              followerIncrease: analytics.followerIncrease || 0,
              publishedTime: analytics.publishedTime || "",
              // フィード専用
              reachFollowerPercent: analytics.reachFollowerPercent || 0,
              interactionCount: analytics.interactionCount || 0,
              interactionFollowerPercent: analytics.interactionFollowerPercent || 0,
              reachSourceProfile: analytics.reachSourceProfile || 0,
              reachSourceFeed: analytics.reachSourceFeed || 0,
              reachSourceExplore: analytics.reachSourceExplore || 0,
              reachSourceSearch: analytics.reachSourceSearch || 0,
              reachSourceOther: analytics.reachSourceOther || 0,
              reachedAccounts: analytics.reachedAccounts || 0,
              profileVisits: analytics.profileVisits || 0,
              externalLinkTaps: analytics.externalLinkTaps || 0,
              // リール専用
              reelReachFollowerPercent: analytics.reelReachFollowerPercent || 0,
              reelInteractionCount: analytics.reelInteractionCount || 0,
              reelInteractionFollowerPercent: analytics.reelInteractionFollowerPercent || 0,
              reelReachSourceProfile: analytics.reelReachSourceProfile || 0,
              reelReachSourceReel: analytics.reelReachSourceReel || 0,
              reelReachSourceExplore: analytics.reelReachSourceExplore || 0,
              reelReachSourceSearch: analytics.reelReachSourceSearch || 0,
              reelReachSourceOther: analytics.reelReachSourceOther || 0,
              reelReachedAccounts: analytics.reelReachedAccounts || 0,
              reelPlayTime: analytics.reelPlayTime || 0,
              reelAvgPlayTime: analytics.reelAvgPlayTime || 0,
              reelSkipRate: analytics.reelSkipRate || 0,
              reelNormalSkipRate: analytics.reelNormalSkipRate || 0,
              // オーディエンス分析
              audience: analytics.audience || null,
            }
          : undefined,
      };
    });

    // 前期間の分析データを取得
    const previousAnalyticsSnapshot = await adminDb
      .collection("analytics")
      .where("userId", "==", uid)
      .where("publishedAt", ">=", previousStartTimestamp)
      .where("publishedAt", "<=", previousEndTimestamp)
      .get();

    const previousAnalyticsByPostId = new Map<string, any>();
    previousAnalyticsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const postId = data.postId;
      if (!postId) return;

      const publishedAt = data.publishedAt
        ? data.publishedAt instanceof admin.firestore.Timestamp
          ? data.publishedAt.toDate()
          : data.publishedAt
        : null;

      if (!publishedAt) return;

      const existing = previousAnalyticsByPostId.get(postId);
      if (!existing || publishedAt > existing.publishedAt) {
        previousAnalyticsByPostId.set(postId, {
          ...data,
          publishedAt,
        });
      }
    });

    // 合計値を計算
    const totals = {
      totalLikes: postsWithAnalytics.reduce((sum, post) => sum + (post.analyticsSummary?.likes || 0), 0),
      totalComments: postsWithAnalytics.reduce((sum, post) => sum + (post.analyticsSummary?.comments || 0), 0),
      totalShares: postsWithAnalytics.reduce((sum, post) => sum + (post.analyticsSummary?.shares || 0), 0),
      totalReach: postsWithAnalytics.reduce((sum, post) => sum + (post.analyticsSummary?.reach || 0), 0),
      totalSaves: postsWithAnalytics.reduce((sum, post) => sum + (post.analyticsSummary?.saves || 0), 0),
      // totalFollowerIncreaseは後で計算（follower_countsから取得した値を使用）
      totalFollowerIncrease: 0, // 一時的に0、後で更新
      // 総合インタラクション数（フィード+リール合わせた、いいね+保存+コメント+シェアのトータル）
      totalInteraction: postsWithAnalytics.reduce((sum, post) => {
        const summary = post.analyticsSummary;
        if (!summary) return sum;
        return sum + (summary.likes || 0) + (summary.saves || 0) + (summary.comments || 0) + (summary.shares || 0);
      }, 0),
      // 外部リンク数（フィードのみ）
      totalExternalLinkTaps: postsWithAnalytics
        .filter((post) => post.postType === "feed")
        .reduce((sum, post) => sum + (post.analyticsSummary?.externalLinkTaps || 0), 0),
      // プロフィール閲覧数（投稿からの閲覧数 + その他からの取得）
      totalProfileVisits: postsWithAnalytics.reduce((sum, post) => sum + (post.analyticsSummary?.profileVisits || 0), 0),
    };

    const previousTotals = {
      totalLikes: Array.from(previousAnalyticsByPostId.values()).reduce((sum, data) => sum + (data.likes || 0), 0),
      totalComments: Array.from(previousAnalyticsByPostId.values()).reduce((sum, data) => sum + (data.comments || 0), 0),
      totalShares: Array.from(previousAnalyticsByPostId.values()).reduce((sum, data) => sum + (data.shares || 0), 0),
      totalReach: Array.from(previousAnalyticsByPostId.values()).reduce((sum, data) => sum + (data.reach || 0), 0),
      totalSaves: Array.from(previousAnalyticsByPostId.values()).reduce((sum, data) => sum + (data.saves || 0), 0),
      // totalFollowerIncreaseは後で計算（follower_countsから取得した値を使用）
      totalFollowerIncrease: 0, // 一時的に0、後で更新
      // 前期間の総合インタラクション数
      totalInteraction: Array.from(previousAnalyticsByPostId.values()).reduce((sum, data) => {
        return sum + (data.likes || 0) + (data.saves || 0) + (data.comments || 0) + (data.shares || 0);
      }, 0),
      // 前期間の外部リンク数（フィードのみ）
      totalExternalLinkTaps: Array.from(previousAnalyticsByPostId.values())
        .filter((data) => (data.category || data.postType) === "feed")
        .reduce((sum, data) => sum + (data.externalLinkTaps || 0), 0),
      // 前期間のプロフィール閲覧数（投稿からの閲覧数のみ、その他からの取得は後で追加）
      totalProfileVisits: Array.from(previousAnalyticsByPostId.values()).reduce((sum, data) => sum + (data.profileVisits || 0), 0),
    };

    // 変化率を計算
    // 前月が0の場合は前月比を計算しない（undefinedを返す）
    const changes = {
      reachChange:
        previousTotals.totalReach === 0
          ? undefined
          : ((totals.totalReach - previousTotals.totalReach) / previousTotals.totalReach) * 100,
      savesChange:
        previousTotals.totalSaves === 0
          ? undefined
          : ((totals.totalSaves - previousTotals.totalSaves) / previousTotals.totalSaves) * 100,
      followerChange:
        previousTotals.totalFollowerIncrease === 0
          ? undefined
          : ((totals.totalFollowerIncrease - previousTotals.totalFollowerIncrease) / Math.abs(previousTotals.totalFollowerIncrease)) * 100,
      totalInteractionChange:
        previousTotals.totalInteraction === 0
          ? undefined
          : ((totals.totalInteraction - previousTotals.totalInteraction) / previousTotals.totalInteraction) * 100,
      externalLinkTapsChange:
        previousTotals.totalExternalLinkTaps === 0
          ? undefined
          : ((totals.totalExternalLinkTaps - previousTotals.totalExternalLinkTaps) / previousTotals.totalExternalLinkTaps) * 100,
      profileVisitsChange:
        previousTotals.totalProfileVisits === 0
          ? undefined
          : ((totals.totalProfileVisits - previousTotals.totalProfileVisits) / previousTotals.totalProfileVisits) * 100,
    };

    // リーチソース分析
    const reachSourceAnalysis = {
      sources: {
        posts: postsWithAnalytics.reduce((sum, post) => sum + (post.analyticsSummary?.reach || 0), 0),
        profile: 0, // 簡易版では0
        explore: 0,
        search: 0,
        other: 0,
      },
    };

    // オンボーディングの初期値を取得（startFollowersとして使用）
    let initialFollowers = 0;
    try {
      const userDoc = await adminDb.collection("users").doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        initialFollowers = userData?.businessInfo?.initialFollowers || 0;
      }
    } catch (err) {
      console.error("ユーザー情報取得エラー:", err);
    }

    // follower_countsからプロフィールアクセス数と外部リンクタップ数を取得（投稿に紐づかない全体の数値）
    const followerCountSnapshot = await adminDb
      .collection("follower_counts")
      .where("userId", "==", uid)
      .where("snsType", "==", "instagram")
      .where("month", "==", date)
      .limit(1)
      .get();

    let profileVisitsFromHome = 0;
    let externalLinkTapsFromHome = 0;
    let currentFollowers = 0;
    let startFollowers = 0;
    if (!followerCountSnapshot.empty) {
      const followerCountData = followerCountSnapshot.docs[0].data();
      profileVisitsFromHome = followerCountData.profileVisits || 0;
      externalLinkTapsFromHome = followerCountData.externalLinkTaps || 0;
      currentFollowers = followerCountData.followers || 0;
      startFollowers = followerCountData.startFollowers || followerCountData.followers || 0;
    }

    // プロフィール閲覧数に投稿に紐づかない全体の数値を追加
    totals.totalProfileVisits += profileVisitsFromHome;
    totals.totalExternalLinkTaps += externalLinkTapsFromHome;

    // 前期間のfollower_countsからも取得
    const previousFollowerCountSnapshot = await adminDb
      .collection("follower_counts")
      .where("userId", "==", uid)
      .where("snsType", "==", "instagram")
      .where("month", "==", `${year}-${String(month - 1).padStart(2, "0")}`)
      .limit(1)
      .get();

    let previousProfileVisitsFromHome = 0;
    let previousExternalLinkTapsFromHome = 0;
    let previousCurrentFollowers = 0;
    let previousStartFollowers = 0;
    if (!previousFollowerCountSnapshot.empty) {
      const previousFollowerCountData = previousFollowerCountSnapshot.docs[0].data();
      previousProfileVisitsFromHome = previousFollowerCountData.profileVisits || 0;
      previousExternalLinkTapsFromHome = previousFollowerCountData.externalLinkTaps || 0;
      previousCurrentFollowers = previousFollowerCountData.followers || 0;
      previousStartFollowers = previousFollowerCountData.startFollowers || previousFollowerCountData.followers || 0;
    }

    // 前期間のプロフィール閲覧数に投稿に紐づかない全体の数値を追加
    previousTotals.totalProfileVisits += previousProfileVisitsFromHome;
    previousTotals.totalExternalLinkTaps += previousExternalLinkTapsFromHome;
    
    // 前期間のフォロワー増加数を計算（投稿からの増加数 + その他からの増加数）
    // 前期間の投稿からの増加数を計算
    const previousFollowerIncreaseFromPosts = Array.from(previousAnalyticsByPostId.values()).reduce(
      (sum, data) => sum + (data.followerIncrease || 0),
      0
    );
    // 前期間のその他からの増加数 = /homeで入力された値（previousCurrentFollowers）
    const previousFollowerIncreaseFromOther = previousCurrentFollowers || 0;
    // 前期間の合計増加数 = 投稿からの増加数 + その他からの増加数（足し算）
    previousTotals.totalFollowerIncrease = previousFollowerIncreaseFromPosts + previousFollowerIncreaseFromOther;

    // スナップショット参照を取得（ステータス判定用）
    const snapshotRefsSnapshot = await adminDb
      .collection("snapshot_references")
      .where("userId", "==", uid)
      .get();

    const snapshotStatusMap = new Map<string, "gold" | "negative" | "normal">();
    snapshotRefsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const postId = data.postId;
      if (postId) {
        snapshotStatusMap.set(String(postId), (data.status || "normal") as "gold" | "negative" | "normal");
      }
    });

    // プロフィール閲覧数の内訳を計算
    const profileVisitsFromPosts = postsWithAnalytics.reduce((sum, post) => sum + (post.analyticsSummary?.profileVisits || 0), 0);
    const profileVisitsFromOther = profileVisitsFromHome;

    // 外部リンク数の内訳を計算
    const externalLinkTapsFromPosts = postsWithAnalytics
      .filter((post) => post.postType === "feed")
      .reduce((sum, post) => sum + (post.analyticsSummary?.externalLinkTaps || 0), 0);
    const externalLinkTapsFromOther = externalLinkTapsFromHome;

    // フォロワー数の内訳を計算
    // 初月かどうかを判定（前期間のfollower_countsが存在しない、または前期間のanalyticsデータが存在しない場合）
    const isFirstMonth = previousFollowerCountSnapshot.empty && previousAnalyticsByPostId.size === 0;
    
    // 分析ページで入力された各投稿のfollowerIncreaseの合計を計算（リール+フィード）
    const followerIncreaseFromReel = postsWithAnalytics
      .filter((post) => post.postType === "reel")
      .reduce((sum, post) => sum + (post.analyticsSummary?.followerIncrease || 0), 0);
    const followerIncreaseFromFeed = postsWithAnalytics
      .filter((post) => post.postType === "feed")
      .reduce((sum, post) => sum + (post.analyticsSummary?.followerIncrease || 0), 0);
    const followerIncreaseFromPosts = followerIncreaseFromReel + followerIncreaseFromFeed;
    
    // /homeで入力された値（currentFollowers）は「その他からの増加数」を表す
    const followerIncreaseFromOther = currentFollowers || 0;
    
    // 合計増加数の計算（月ごとにリセット、その月の増加数のみを表示）
    // すべての月で、その月の投稿からの増加数 + その他からの増加数のみを計算
    // 初月でもinitialFollowersは含めない（月ごとにリセットするため）
    const totalFollowerIncrease = followerIncreaseFromPosts + followerIncreaseFromOther;
    
    // totalsのtotalFollowerIncreaseを更新
    totals.totalFollowerIncrease = totalFollowerIncrease;
    
      // デバッグログ
    if (process.env.NODE_ENV === "development") {
      console.log("[フォロワー数内訳計算]", {
        isFirstMonth,
        initialFollowers,
        currentFollowers,
        followerIncreaseFromReel,
        followerIncreaseFromFeed,
        followerIncreaseFromPosts,
        followerIncreaseFromOther,
        totalFollowerIncrease,
        totalsTotalFollowerIncrease: totals.totalFollowerIncrease,
        previousTotalsTotalFollowerIncrease: previousTotals.totalFollowerIncrease,
        note: "すべての月で、その月の投稿からの増加 + その他からの増加のみを表示（月ごとにリセット）",
      });
    }

    // KPI分解を構築
    const kpiBreakdowns = buildKpiBreakdowns({
      totals,
      previousTotals,
      changes: {
        ...changes,
        totalInteractionChange: changes.totalInteractionChange,
        externalLinkTapsChange: changes.externalLinkTapsChange,
        profileVisitsChange: changes.profileVisitsChange,
      },
      reachSourceAnalysis,
      posts: postsWithAnalytics,
      snapshotStatusMap,
      profileVisitsFromPosts,
      profileVisitsFromOther,
      externalLinkTapsFromPosts,
      externalLinkTapsFromOther,
      currentFollowers,
      previousCurrentFollowers,
      followerIncreaseFromReel,
      followerIncreaseFromFeed,
      followerIncreaseFromOther,
      isFirstMonth,
      initialFollowers,
    });

    // 時間帯分析を計算
    const timeSlotAnalysis = calculateTimeSlotAnalysis(postsWithAnalytics);

    // ハッシュタグ分析を計算
    const hashtagStats = calculateHashtagStats(posts);

    // フィード/リール統計を計算
    const feedStats = calculateFeedStats(postsWithAnalytics);
    const reelStats = calculateReelStats(postsWithAnalytics);

    // オーディエンス分析を計算
    const feedPosts = postsWithAnalytics.filter((post) => post.postType === "feed");
    const reelPosts = postsWithAnalytics.filter((post) => post.postType === "reel");
    const feedAudience = calculateAudienceAnalysis(feedPosts);
    const reelAudience = calculateAudienceAnalysis(reelPosts);

    // 日別KPIデータを計算
    const dailyKPIs: DailyKPI[] = [];
    const daysInMonth = endDate.getDate();
    
    // analyticsデータを日別にグループ化
    const analyticsByDay = new Map<string, admin.firestore.DocumentData[]>();
    analyticsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const publishedAt = data.publishedAt
        ? data.publishedAt instanceof admin.firestore.Timestamp
          ? data.publishedAt.toDate()
          : data.publishedAt
        : null;
      
      if (!publishedAt) return;
      
      const dayKey = publishedAt.toISOString().split("T")[0];
      if (!analyticsByDay.has(dayKey)) {
        analyticsByDay.set(dayKey, []);
      }
      analyticsByDay.get(dayKey)!.push(data);
    });

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month - 1, day);
      const dayKey = currentDate.toISOString().split("T")[0];
      const dayAnalytics = analyticsByDay.get(dayKey) || [];

      const dayLikes = dayAnalytics.reduce((sum, data) => sum + (data.likes || 0), 0);
      const dayReach = dayAnalytics.reduce((sum, data) => sum + (data.reach || 0), 0);
      const daySaves = dayAnalytics.reduce((sum, data) => sum + (data.saves || 0), 0);
      const dayComments = dayAnalytics.reduce((sum, data) => sum + (data.comments || 0), 0);
      const dayShares = dayAnalytics.reduce((sum, data) => sum + (data.shares || 0), 0);
      const dayEngagement = dayLikes + dayComments + dayShares + daySaves;

      dailyKPIs.push({
        date: dayKey,
        label: `${month}/${day}`,
        likes: dayLikes,
        reach: dayReach,
        saves: daySaves,
        comments: dayComments,
        engagement: dayEngagement,
      });
    }

    // 目標達成度を計算
    const goalAchievements: GoalAchievement[] = [];
    
    try {
      // planデータを取得
      const planSnapshot = await adminDb
        .collection("plans")
        .where("userId", "==", uid)
        .where("snsType", "==", "instagram")
        .where("status", "==", "active")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (!planSnapshot.empty) {
        const plan = planSnapshot.docs[0].data();
        const targetFollowers = plan.targetFollowers || 0;
        const currentFollowers = plan.currentFollowers || 0;
        
        // フォロワー増加目標（月間）
        const followerIncreaseTarget = Math.max(0, targetFollowers - currentFollowers);
        const actualFollowerIncrease = totals.totalFollowerIncrease || 0;
        const followerAchievementRate = followerIncreaseTarget > 0
          ? Math.min(100, Math.round((actualFollowerIncrease / followerIncreaseTarget) * 100))
          : actualFollowerIncrease > 0 ? 100 : 0;
        
        goalAchievements.push({
          key: "followers",
          label: "フォロワー増加",
          target: followerIncreaseTarget,
          actual: actualFollowerIncrease,
          achievementRate: followerAchievementRate,
          unit: "人",
          status: followerAchievementRate >= 100 ? "achieved" : followerAchievementRate >= 70 ? "on_track" : followerAchievementRate >= 50 ? "at_risk" : "not_set",
        });

        // 投稿数目標（シミュレーション結果から取得、またはデフォルト値）
        const simulationResult = plan.simulationResult as any;
        const targetPosts = simulationResult?.monthlyPostCount || 20; // デフォルト20投稿/月
        const actualPosts = posts.length;
        const postsAchievementRate = targetPosts > 0
          ? Math.min(100, Math.round((actualPosts / targetPosts) * 100))
          : actualPosts > 0 ? 100 : 0;
        
        goalAchievements.push({
          key: "posts",
          label: "投稿数",
          target: targetPosts,
          actual: actualPosts,
          achievementRate: postsAchievementRate,
          unit: "件",
          status: postsAchievementRate >= 100 ? "achieved" : postsAchievementRate >= 70 ? "on_track" : postsAchievementRate >= 50 ? "at_risk" : "not_set",
        });
      }
    } catch (planError) {
      console.error("Plan取得エラー（目標達成度計算をスキップ）:", planError);
      // plan取得エラーは無視して続行
    }

    return NextResponse.json({
      success: true,
      data: {
        breakdowns: kpiBreakdowns,
        timeSlotAnalysis,
        hashtagStats,
        feedStats,
        reelStats,
        feedAudience: feedAudience.gender && feedAudience.age ? feedAudience : null,
        reelAudience: reelAudience.gender && reelAudience.age ? reelAudience : null,
        dailyKPIs,
        goalAchievements,
      },
    });
  } catch (error) {
    console.error("KPI breakdown API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error details:", { errorMessage, errorStack });
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

