// Instagram運用の知識ベース
export interface KnowledgeEntry {
  id: string;
  category: string;
  content: string;
  keywords: string[];
  priority: number;
}

export interface UserAnalysis {
  userId: string;
  formData: Record<string, unknown>;
  simulationResult: Record<string, unknown>;
  generatedStrategy: string;
  feedback?: 'good' | 'bad';
  createdAt: Date;
}

// 静的な知識ベース
export const instagramKnowledge: KnowledgeEntry[] = [
  {
    id: 'strategy-001',
    category: '投稿戦略',
    content: 'フォロワー1000人未満：週3-4回のフィード投稿、週2-3回のリール投稿が最適。エンゲージメント率を重視。',
    keywords: ['小規模', 'フォロワー1000人未満', '投稿頻度', 'エンゲージメント'],
    priority: 1
  },
  {
    id: 'strategy-002',
    category: '投稿戦略',
    content: 'フォロワー1000-10000人：週2-3回のフィード投稿、週3-4回のリール投稿。ブランド一貫性を重視。',
    keywords: ['中規模', 'フォロワー1000-10000人', 'ブランド一貫性', 'リール中心'],
    priority: 1
  },
  {
    id: 'strategy-003',
    category: '投稿戦略',
    content: 'フォロワー10000人以上：週1-2回のフィード投稿、週2-3回のリール投稿。品質重視、広告連携。',
    keywords: ['大規模', 'フォロワー10000人以上', '品質重視', '広告連携'],
    priority: 1
  },
  {
    id: 'engagement-001',
    category: 'エンゲージメント',
    content: 'リール投稿：最初の3秒で興味を引くフック、15-30秒の長さ、トレンド音源活用。',
    keywords: ['リール', 'フック', '3秒ルール', 'トレンド音源'],
    priority: 2
  },
  {
    id: 'engagement-002',
    category: 'エンゲージメント',
    content: 'フィード投稿：高品質な画像、統一されたカラーパレット、15-20個のハッシュタグ。',
    keywords: ['フィード', '画像品質', 'カラーパレット', 'ハッシュタグ'],
    priority: 2
  },
  {
    id: 'content-001',
    category: 'コンテンツ戦略',
    content: '認知段階：ブランド世界観、価値提案。興味段階：ノウハウ、実績紹介。検討段階：商品詳細、比較。',
    keywords: ['カスタマージャーニー', '認知', '興味', '検討', '段階別'],
    priority: 3
  },
  {
    id: 'timing-001',
    category: '投稿タイミング',
    content: '平日19-21時、休日10-12時、15-17時がエンゲージメント率が高い。ターゲット層に合わせて調整。',
    keywords: ['投稿時間', '平日', '休日', 'エンゲージメント率'],
    priority: 2
  },
  {
    id: 'hashtag-001',
    category: 'ハッシュタグ戦略',
    content: 'ビッグワード（100万以上）3-5個、ミドルワード（1-100万）5-8個、スモールワード（1万以下）5-7個。',
    keywords: ['ハッシュタグ', 'ビッグワード', 'ミドルワード', 'スモールワード'],
    priority: 2
  }
];

// ユーザー分析結果の保存（簡易版 - 実際はデータベースを使用）
const userAnalyses: UserAnalysis[] = [];

export function saveUserAnalysis(analysis: Omit<UserAnalysis, 'createdAt'>): void {
  userAnalyses.push({
    ...analysis,
    createdAt: new Date()
  });
}

export function getUserAnalyses(userId: string): UserAnalysis[] {
  return userAnalyses.filter(analysis => analysis.userId === userId);
}

// 関連知識を検索
export function searchRelevantKnowledge(
  formData: Record<string, unknown>,
  simulationResult: Record<string, unknown> | null
): KnowledgeEntry[] {
  const keywords: string[] = [];
  
  // フォームデータからキーワードを抽出
  const currentFollowers = parseInt(String(formData.currentFollowers || 0));
  if (currentFollowers < 1000) {
    keywords.push('小規模', 'フォロワー1000人未満');
  } else if (currentFollowers < 10000) {
    keywords.push('中規模', 'フォロワー1000-10000人');
  } else {
    keywords.push('大規模', 'フォロワー10000人以上');
  }
  
  // 戦略からキーワードを抽出
  const strategies = formData.strategyValues as string[] || [];
  strategies.forEach(strategy => {
    if (strategy.includes('リール')) keywords.push('リール');
    if (strategy.includes('エンゲージメント')) keywords.push('エンゲージメント');
    if (strategy.includes('ハッシュタグ')) keywords.push('ハッシュタグ');
  });
  
  // カテゴリからキーワードを抽出
  const categories = formData.postCategories as string[] || [];
  categories.forEach(category => {
    if (category.includes('ノウハウ')) keywords.push('ノウハウ');
    if (category.includes('実績')) keywords.push('実績紹介');
    if (category.includes('ブランド')) keywords.push('ブランド世界観');
  });
  
  // シミュレーション結果からキーワードを抽出
  if (simulationResult) {
    const feasibility = simulationResult.feasibilityLevel as string;
    if (feasibility === 'very_challenging') keywords.push('困難な目標');
    if (feasibility === 'realistic') keywords.push('現実的');
  }
  
  // キーワードマッチングで関連知識を検索
  const relevantKnowledge = instagramKnowledge.filter(entry => 
    entry.keywords.some(keyword => 
      keywords.some(userKeyword => 
        userKeyword.includes(keyword) || keyword.includes(userKeyword)
      )
    )
  );
  
  // 優先度順にソート
  return relevantKnowledge.sort((a, b) => a.priority - b.priority);
}

// 過去の分析結果から学習
export function getLearningInsights(userId: string): string {
  const analyses = getUserAnalyses(userId);
  
  if (analyses.length === 0) {
    return '';
  }
  
  // 最近の分析結果からパターンを抽出
  const recentAnalyses = analyses.slice(-3); // 直近3件
  
  const insights: string[] = [];
  
  // フォロワー数の傾向
  const followerCounts = recentAnalyses.map(a => 
    parseInt(String(a.formData.currentFollowers || 0))
  );
  const avgFollowers = followerCounts.reduce((a, b) => a + b, 0) / followerCounts.length;
  
  if (avgFollowers < 1000) {
    insights.push('小規模アカウント向けの戦略を継続');
  } else if (avgFollowers < 10000) {
    insights.push('中規模アカウント向けの成長戦略を適用');
  } else {
    insights.push('大規模アカウント向けのブランド戦略を重視');
  }
  
  // よく使われる戦略
  const allStrategies = recentAnalyses.flatMap(a => 
    a.formData.strategyValues as string[] || []
  );
  const strategyCounts = allStrategies.reduce((acc, strategy) => {
    acc[strategy] = (acc[strategy] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topStrategy = Object.entries(strategyCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0];
  
  if (topStrategy) {
    insights.push(`過去の成功パターン: ${topStrategy}を重視`);
  }
  
  return insights.join('。') + '。';
}
