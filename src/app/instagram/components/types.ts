// オーディエンス分析データの型定義
export interface AudienceData {
  gender: {
    male: number; // 男性の割合（%）
    female: number; // 女性の割合（%）
    other: number; // その他の割合（%）
  };
  age: {
    "13-17": number; // 13-17歳の割合（%）
    "18-24": number; // 18-24歳の割合（%）
    "25-34": number; // 25-34歳の割合（%）
    "35-44": number; // 35-44歳の割合（%）
    "45-54": number; // 45-54歳の割合（%）
    "55-64": number; // 55-64歳の割合（%）
    "65+": number; // 65歳以上の割合（%）
  };
}

// 閲覧数ソース分析データの型定義
export interface ReachSourceData {
  sources: {
    posts: number; // 投稿からの閲覧割合（%）
    profile: number; // プロフィールからの閲覧割合（%）
    explore: number; // 探索からの閲覧割合（%）
    search: number; // 検索からの閲覧割合（%）
    other: number; // その他の閲覧割合（%）
  };
  followers: {
    followers: number; // フォロワー内の閲覧割合（%）
    nonFollowers: number; // フォロワー外の閲覧割合（%）
  };
}

// 分析データの型定義
export interface AnalyticsData {
  id: string;
  userId: string;
  postId?: string;
  likes: number;
  comments: number;
  shares: number;
  reposts: number;
  reach: number;
  saves: number;
  followerIncrease: number;
  engagementRate: number;
  publishedAt: Date;
  publishedTime: string;
  title?: string;
  content?: string;
  hashtags?: string[];
  thumbnail?: string;
  category?: "reel" | "feed" | "story";
  audience?: AudienceData;
  reachSource?: ReachSourceData;
  createdAt: Date;
  // フィード専用フィールド
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
  profileFollows?: number;
  // リール専用フィールド
  reelReachFollowerPercent?: number;
  reelInteractionCount?: number;
  reelInteractionFollowerPercent?: number;
  reelReachSourceProfile?: number;
  reelReachSourceReel?: number;
  reelReachSourceExplore?: number;
  reelReachSourceSearch?: number;
  reelReachSourceOther?: number;
  reelReachedAccounts?: number;
  reelSkipRate?: number;
  reelNormalSkipRate?: number;
  reelPlayTime?: number;
  reelAvgPlayTime?: number;
}

// 投稿データの型定義
export interface Post {
  id: string;
  title: string;
  content: string;
  hashtags: string[];
  thumbnail: string;
  category: string;
  publishedAt: Date;
  analytics?: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
    reach: number;
    engagementRate: number;
    publishedAt: Date;
    audience?: AudienceData;
    reachSource?: ReachSourceData;
  };
}

// 入力データの型定義
export interface InputData {
  likes: string;
  comments: string;
  shares: string;
  reposts: string;
  reach: string;
  saves: string;
  followerIncrease: string;
  publishedAt: string;
  publishedTime: string;
  title: string;
  content: string;
  hashtags: string;
  thumbnail: string;
  category: "reel" | "feed" | "story";
  // フィード専用フィールド
  reachFollowerPercent: string; // 閲覧数とフォロワー%
  interactionCount: string; // インタラクション数
  interactionFollowerPercent: string; // インタラクション数とフォロワー%
  reachSourceProfile: string; // プロフィール
  reachSourceFeed: string; // フィード
  reachSourceExplore: string; // 発見
  reachSourceSearch: string; // 検索
  reachSourceOther: string; // その他
  reachedAccounts: string; // リーチしたアカウント
  profileVisits: string; // プロフィールアクセス数
  profileFollows: string; // フォロー数
  // リール専用フィールド
  reelReachFollowerPercent: string; // 閲覧数・フォロワー%
  reelInteractionCount: string; // インタラクション数
  reelInteractionFollowerPercent: string; // インタラクション数・フォロワー%
  reelReachSourceProfile: string; // プロフィール
  reelReachSourceReel: string; // リール
  reelReachSourceExplore: string; // 発見
  reelReachSourceSearch: string; // 検索
  reelReachSourceOther: string; // その他
  reelReachedAccounts: string; // リーチしたアカウント
  reelSkipRate: string; // スキップ率
  reelNormalSkipRate: string; // 通常のスキップ率
  reelPlayTime: string; // 再生時間
  reelAvgPlayTime: string; // 平均再生時間
  audience: {
    gender: {
      male: string;
      female: string;
      other: string;
    };
    age: {
      "13-17": string;
      "18-24": string;
      "25-34": string;
      "35-44": string;
      "45-54": string;
      "55-64": string;
      "65+": string;
    };
  };
  reachSource: {
    sources: {
      posts: string;
      profile: string;
      explore: string;
      search: string;
      other: string;
    };
    followers: {
      followers: string;
      nonFollowers: string;
    };
  };
}
