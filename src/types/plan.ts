// 統一された計画データの型定義
export interface PlanData {
  id: string;
  title: string;
  targetFollowers: number;
  currentFollowers: number;
  planPeriod: string;
  targetAudience: string; // ターゲット（未設定の場合は"未設定"）
  category: string; // カテゴリ（未設定の場合は"未設定"）
  strategies: string[];
  createdAt: string;
  
  // 目標達成シミュレーション
  simulation: {
    postTypes: {
      reel: {
        weeklyCount: number;
        followerEffect: number; // 人/投稿
      };
      feed: {
        weeklyCount: number;
        followerEffect: number;
      };
      story: {
        weeklyCount: number;
        followerEffect: number;
      };
    };
  };
  
  // AI出力の世界観
  aiPersona: {
    tone: string; // トーン（例: "親しみやすい", "プロフェッショナル"）
    style: string; // スタイル（例: "カジュアル", "フォーマル"）
    personality: string; // パーソナリティ（例: "明るく前向き", "落ち着いた"）
    interests: string[]; // 興味・関心事
  };
}

// デフォルトの計画データ
export const DEFAULT_PLAN_DATA: PlanData = {
  id: 'default-plan',
  title: 'Instagram成長加速計画',
  targetFollowers: 10000,
  currentFollowers: 3250,
  planPeriod: '6ヶ月',
  targetAudience: '未設定',
  category: '未設定',
  strategies: ['ハッシュタグ最適化', 'ストーリー活用', 'リール投稿', 'エンゲージメント向上'],
  createdAt: '2024-09-01',
  simulation: {
    postTypes: {
      reel: {
        weeklyCount: 1,
        followerEffect: 3
      },
      feed: {
        weeklyCount: 2,
        followerEffect: 2
      },
      story: {
        weeklyCount: 3,
        followerEffect: 1
      }
    }
  },
  aiPersona: {
    tone: '親しみやすい',
    style: 'カジュアル',
    personality: '明るく前向き',
    interests: ['成長', 'コミュニティ', 'エンゲージメント', 'クリエイティブ']
  }
};
