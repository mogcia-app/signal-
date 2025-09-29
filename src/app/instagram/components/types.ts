// オーディエンス分析データの型定義
export interface AudienceData {
  gender: {
    male: number; // 男性の割合（%）
    female: number; // 女性の割合（%）
    other: number; // その他の割合（%）
  };
  age: {
    '13-17': number; // 13-17歳の割合（%）
    '18-24': number; // 18-24歳の割合（%）
    '25-34': number; // 25-34歳の割合（%）
    '35-44': number; // 35-44歳の割合（%）
    '45-54': number; // 45-54歳の割合（%）
    '55-64': number; // 55-64歳の割合（%）
    '65+': number; // 65歳以上の割合（%）
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
  category?: 'reel' | 'feed' | 'story';
  audience?: AudienceData;
  reachSource?: ReachSourceData;
  createdAt: Date;
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
  reach: string;
  saves: string;
  followerIncrease: string;
  publishedAt: string;
  publishedTime: string;
  title: string;
  content: string;
  hashtags: string;
  thumbnail: string;
  category: 'reel' | 'feed' | 'story';
  audience: {
    gender: {
      male: string;
      female: string;
      other: string;
    };
    age: {
      '13-17': string;
      '18-24': string;
      '25-34': string;
      '35-44': string;
      '45-54': string;
      '55-64': string;
      '65+': string;
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
