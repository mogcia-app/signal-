'use client';

import React, { useState } from 'react';
import SNSLayout from '../../components/sns-layout';
import { AIChatWidget } from '../../components/ai-chat-widget';
import { 
  BookOpen, 
  Play, 
  CheckCircle, 
  ArrowRight, 
  Search,
  Star,
  Lightbulb,
  Target,
  MessageSquare,
  BarChart3,
  Clock,
  Calendar,
  Settings,
  Zap
} from 'lucide-react';

// URLからSNSを判定する関数
const getCurrentSNSFromURL = (): 'instagram' | 'x' | 'youtube' | 'tiktok' => {
  if (typeof window === 'undefined') return 'instagram'; // SSR対応
  
  const path = window.location.pathname;
  const snsMatch = path.match(/^\/(instagram|x|youtube|tiktok)/);
  
  if (snsMatch) {
    const sns = snsMatch[1];
    if (sns === 'x') return 'x';
    if (sns === 'youtube') return 'youtube';
    if (sns === 'tiktok') return 'tiktok';
    return 'instagram';
  }
  
  // デフォルトはinstagram
  return 'instagram';
};

interface GuideSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'getting-started' | 'features' | 'tips' | 'troubleshooting';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  steps: GuideStep[];
  tags: string[];
  featured?: boolean;
}

interface GuideStep {
  title: string;
  description: string;
  image?: string;
  tips?: string[];
}

export default function GuidePage() {
  const [currentSNS, setCurrentSNS] = useState<'instagram' | 'x' | 'youtube' | 'tiktok'>('instagram');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // URLからSNSを判定して設定
  React.useEffect(() => {
    const sns = getCurrentSNSFromURL();
    setCurrentSNS(sns);
  }, []);

  const guideSections: GuideSection[] = [
    {
      id: 'getting-started',
      title: 'はじめに',
      description: 'Signalの基本機能と使い方を学びましょう',
      icon: <BookOpen className="w-6 h-6" />,
      category: 'getting-started',
      difficulty: 'beginner',
      estimatedTime: '10分',
      tags: ['基本', '初回', 'セットアップ'],
      featured: true,
      steps: [
        {
          title: 'アカウント作成',
          description: 'Signalアカウントを作成し、SNSアカウントを連携します。',
          tips: ['複数のSNSアカウントを連携できます', 'アカウント情報は安全に保護されます']
        },
        {
          title: '初期設定',
          description: 'プロフィール情報と目標設定を行います。',
          tips: ['具体的な目標を設定すると効果的です', '定期的に見直しを行いましょう']
        },
        {
          title: 'ダッシュボード確認',
          description: 'メインダッシュボードの機能を確認します。',
          tips: ['各セクションの役割を理解しましょう', 'カスタマイズ可能な部分があります']
        }
      ]
    },
    {
      id: 'plan-creation',
      title: '運用計画の作成',
      description: '効果的なSNS運用計画を立てる方法',
      icon: <Target className="w-6 h-6" />,
      category: 'features',
      difficulty: 'beginner',
      estimatedTime: '15分',
      tags: ['計画', '戦略', '目標設定'],
      featured: true,
      steps: [
        {
          title: '目標設定',
          description: 'フォロワー数やエンゲージメント率などの具体的な目標を設定します。',
          tips: ['現実的で達成可能な目標を設定しましょう', '期限を明確にすることが重要です']
        },
        {
          title: 'ターゲット分析',
          description: 'オーディエンスの特徴を分析し、ターゲットを明確にします。',
          tips: ['既存のフォロワー分析を活用しましょう', '競合他社の分析も有効です']
        },
        {
          title: 'コンテンツ戦略',
          description: '投稿頻度やコンテンツの種類を決定します。',
          tips: ['一貫性のある投稿スケジュールを作成しましょう', '多様なコンテンツ形式を試してみましょう']
        }
      ]
    },
    {
      id: 'post-creation',
      title: '投稿作成とラボ機能',
      description: 'AIを活用した投稿作成と分析機能',
      icon: <Zap className="w-6 h-6" />,
      category: 'features',
      difficulty: 'intermediate',
      estimatedTime: '20分',
      tags: ['投稿', 'AI', '分析'],
      steps: [
        {
          title: '投稿ラボの利用',
          description: 'AIアシスタントを使って効果的な投稿内容を作成します。',
          tips: ['具体的な指示を出すと良い結果が得られます', '複数の案を比較検討しましょう']
        },
        {
          title: 'コンテンツ最適化',
          description: 'ハッシュタグや投稿時間を最適化します。',
          tips: ['トレンドのハッシュタグを活用しましょう', '最適な投稿時間を分析しましょう']
        },
        {
          title: '投稿前チェック',
          description: '投稿前に内容とタイミングを最終確認します。',
          tips: ['誤字脱字がないか確認しましょう', '投稿スケジュールを調整しましょう']
        }
      ]
    },
    {
      id: 'analytics',
      title: '分析とレポート',
      description: '投稿パフォーマンスの分析と改善方法',
      icon: <BarChart3 className="w-6 h-6" />,
      category: 'features',
      difficulty: 'intermediate',
      estimatedTime: '25分',
      tags: ['分析', 'レポート', '改善'],
      steps: [
        {
          title: 'パフォーマンス分析',
          description: '投稿のエンゲージメント率やリーチを分析します。',
          tips: ['定期的に分析結果を確認しましょう', 'トレンドの変化に注目しましょう']
        },
        {
          title: 'オーディエンス分析',
          description: 'フォロワーの属性や行動パターンを分析します。',
          tips: ['オーディエンスの好みを理解しましょう', '新しいターゲットを発見できるかもしれません']
        },
        {
          title: '改善提案の実装',
          description: '分析結果に基づいてコンテンツ戦略を改善します。',
          tips: ['小さな改善を継続的に行いましょう', 'A/Bテストを実施してみましょう']
        }
      ]
    },
    {
      id: 'ai-chat',
      title: 'AIチャット機能',
      description: 'AIアシスタントとの対話でSNS運用をサポート',
      icon: <MessageSquare className="w-6 h-6" />,
      category: 'features',
      difficulty: 'beginner',
      estimatedTime: '10分',
      tags: ['AI', 'チャット', 'サポート'],
      steps: [
        {
          title: 'AIチャットの起動',
          description: '右下のチャットアイコンをクリックしてAIアシスタントを起動します。',
          tips: ['いつでも気軽に質問できます', '具体的な質問をすると良い回答が得られます']
        },
        {
          title: '効果的な質問方法',
          description: 'AIからより良い回答を得るための質問テクニックを学びます。',
          tips: ['具体的な状況を説明しましょう', '複数の質問を組み合わせてみましょう']
        },
        {
          title: 'AI提案の活用',
          description: 'AIからの提案を実際の運用に活用する方法を学びます。',
          tips: ['提案をそのまま使うだけでなく、自分なりにアレンジしましょう', '結果を分析して改善点を見つけましょう']
        }
      ]
    },
    {
      id: 'monthly-reports',
      title: '月次レポート',
      description: '月間の成果をまとめた詳細レポートの活用方法',
      icon: <Calendar className="w-6 h-6" />,
      category: 'features',
      difficulty: 'intermediate',
      estimatedTime: '15分',
      tags: ['レポート', '月次', '成果'],
      steps: [
        {
          title: 'レポートの確認',
          description: '月次レポートで成果と改善点を確認します。',
          tips: ['前月との比較を行いましょう', '目標達成度をチェックしましょう']
        },
        {
          title: 'トレンド分析',
          description: '長期的なトレンドと成長パターンを分析します。',
          tips: ['季節性やイベントの影響を考慮しましょう', '長期的な視点で評価しましょう']
        },
        {
          title: '次月の戦略調整',
          description: 'レポート結果を基に次月の戦略を調整します。',
          tips: ['成功した要素を継続しましょう', '改善が必要な部分に焦点を当てましょう']
        }
      ]
    },
    {
      id: 'tips-optimization',
      title: '運用最適化のコツ',
      description: 'より効果的なSNS運用のための実践的なヒント',
      icon: <Lightbulb className="w-6 h-6" />,
      category: 'tips',
      difficulty: 'advanced',
      estimatedTime: '30分',
      tags: ['最適化', 'コツ', '上級'],
      steps: [
        {
          title: '投稿タイミングの最適化',
          description: 'オーディエンスが最もアクティブな時間帯を特定し、投稿タイミングを最適化します。',
          tips: ['分析データを基に最適な時間帯を見つけましょう', '異なる時間帯での投稿効果をテストしましょう']
        },
        {
          title: 'ハッシュタグ戦略',
          description: '効果的なハッシュタグの選び方と使い方を学びます。',
          tips: ['トレンドハッシュタグとニッチハッシュタグを組み合わせましょう', 'ハッシュタグの使用数を適切に調整しましょう']
        },
        {
          title: 'エンゲージメント向上',
          description: 'フォロワーとの交流を深め、エンゲージメント率を向上させる方法を学びます。',
          tips: ['質問や投票機能を活用しましょう', 'コメントへの迅速な返信を心がけましょう']
        }
      ]
    },
    {
      id: 'troubleshooting',
      title: 'よくある問題と解決方法',
      description: '使用中によくある問題とその解決方法',
      icon: <Settings className="w-6 h-6" />,
      category: 'troubleshooting',
      difficulty: 'beginner',
      estimatedTime: '20分',
      tags: ['トラブル', '解決', 'FAQ'],
      steps: [
        {
          title: 'ログイン問題',
          description: 'アカウントにログインできない場合の対処法を説明します。',
          tips: ['パスワードを確認しましょう', 'ブラウザのキャッシュをクリアしてみましょう']
        },
        {
          title: 'データ同期エラー',
          description: 'SNSデータが正しく同期されない場合の対処法を説明します。',
          tips: ['SNSアカウントの連携設定を確認しましょう', '再認証を行ってみましょう']
        },
        {
          title: '分析データの不整合',
          description: '分析データが期待通りでない場合の確認方法を説明します。',
          tips: ['データ取得期間を確認しましょう', 'SNS側の設定変更がないか確認しましょう']
        }
      ]
    }
  ];

  const categories = [
    { id: 'all', name: 'すべて', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'getting-started', name: 'はじめに', icon: <Play className="w-4 h-4" /> },
    { id: 'features', name: '機能', icon: <Zap className="w-4 h-4" /> },
    { id: 'tips', name: 'コツ', icon: <Lightbulb className="w-4 h-4" /> },
    { id: 'troubleshooting', name: 'トラブル', icon: <Settings className="w-4 h-4" /> }
  ];

  const difficulties = [
    { id: 'all', name: 'すべて', color: 'bg-gray-100 text-gray-700' },
    { id: 'beginner', name: '初級', color: 'bg-green-100 text-green-700' },
    { id: 'intermediate', name: '中級', color: 'bg-yellow-100 text-yellow-700' },
    { id: 'advanced', name: '上級', color: 'bg-red-100 text-red-700' }
  ];

  const filteredSections = guideSections.filter(section => {
    const matchesSearch = section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         section.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         section.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || section.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || section.difficulty === selectedDifficulty;

    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const featuredSections = guideSections.filter(section => section.featured);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-700';
      case 'intermediate': return 'bg-yellow-100 text-yellow-700';
      case 'advanced': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '初級';
      case 'intermediate': return '中級';
      case 'advanced': return '上級';
      default: return '不明';
    }
  };

  return (
    <SNSLayout currentSNS={currentSNS} customTitle="使い方ガイド" customDescription="Signalの機能と使い方を詳しく解説します">
      <div className="max-w-6xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">使い方ガイド</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Signalの機能を効果的に活用して、SNS運用を成功させましょう。
            初心者から上級者まで、レベルに応じたガイドを提供します。
          </p>
        </div>

        {/* 検索・フィルター */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            {/* 検索 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="ガイドを検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* カテゴリフィルター */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            {/* 難易度フィルター */}
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {difficulties.map(difficulty => (
                <option key={difficulty.id} value={difficulty.id}>
                  {difficulty.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* おすすめガイド */}
        {searchTerm === '' && selectedCategory === 'all' && selectedDifficulty === 'all' && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Star className="w-6 h-6 text-yellow-500 mr-2" />
              おすすめガイド
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredSections.map((section) => (
                <div
                  key={section.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center`}>
                      {section.icon}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(section.difficulty)}`}>
                      {getDifficultyLabel(section.difficulty)}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{section.title}</h3>
                  <p className="text-gray-600 text-sm mb-4">{section.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {section.estimatedTime}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ガイド一覧 */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">すべてのガイド</h2>
          {filteredSections.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">ガイドが見つかりませんでした</h3>
              <p className="text-gray-600">
                検索条件を変更して再度お試しください。
              </p>
            </div>
          ) : (
            filteredSections.map((section) => (
              <div
                key={section.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className={`w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0`}>
                        {section.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">{section.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(section.difficulty)}`}>
                            {getDifficultyLabel(section.difficulty)}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-3">{section.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {section.estimatedTime}
                          </span>
                          <div className="flex items-center space-x-1">
                            {section.tags.map((tag, index) => (
                              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedSection === section.id ? 'rotate-90' : ''
                    }`} />
                  </div>
                </div>

                {/* 展開されたステップ */}
                {expandedSection === section.id && (
                  <div className="border-t border-gray-200 p-6 bg-gray-50">
                    <div className="space-y-6">
                      {section.steps.map((step, index) => (
                        <div key={index} className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                              {index + 1}
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-medium text-gray-900 mb-2">{step.title}</h4>
                            <p className="text-gray-600 mb-3">{step.description}</p>
                            {step.tips && step.tips.length > 0 && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <h5 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                                  <Lightbulb className="w-4 h-4 mr-1" />
                                  コツ
                                </h5>
                                <ul className="space-y-1">
                                  {step.tips.map((tip, tipIndex) => (
                                    <li key={tipIndex} className="text-sm text-blue-800 flex items-start">
                                      <CheckCircle className="w-3 h-3 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                                      {tip}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* ヘルプセクション */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-blue-900 mb-2">まだお困りですか？</h3>
            <p className="text-blue-700 mb-4">
              ガイドで解決しない問題がある場合は、AIチャットでお気軽にお尋ねください。
            </p>
            <div className="flex justify-center space-x-4">
              <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                AIチャットを開く
              </button>
              <button className="bg-white text-blue-600 border border-blue-600 px-6 py-2 rounded-lg hover:bg-blue-50 transition-colors">
                お問い合わせ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AIチャットウィジェット */}
      <AIChatWidget />
    </SNSLayout>
  );
}
