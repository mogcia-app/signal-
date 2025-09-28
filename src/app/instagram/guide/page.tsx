'use client';

import React, { useState, useEffect } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { AIChatWidget } from '../../../components/ai-chat-widget';
import { 
  BookOpen, 
  Play, 
  CheckCircle, 
  ArrowRight, 
  Search,
  BarChart3,
  Settings,
  MessageSquare,
  Target,
  Zap,
  Shield,
  Users,
  FileText,
  Lightbulb,
  TrendingUp,
  Calendar,
  Star,
  Bell,
  Eye,
  Download
} from 'lucide-react';

interface GuideSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  steps: GuideStep[];
  tips?: string[];
}

interface GuideStep {
  title: string;
  description: string;
  action?: string;
  icon?: React.ReactNode;
}

export default function InstagramGuidePage() {
  const [activeSection, setActiveSection] = useState<string>('getting-started');
  const [searchQuery, setSearchQuery] = useState('');

  // デバッグ用のuseEffect
  useEffect(() => {
    console.log('🎯 ガイドページがマウントされました！', {
      timestamp: Date.now(),
      pathname: window.location.pathname,
      search: window.location.search
    });
    
    return () => {
      console.log('🎯 ガイドページがアンマウントされました！');
    };
  }, []);

  const guideSections: GuideSection[] = [
    {
      id: 'getting-started',
      title: 'はじめに',
      icon: <Play className="w-6 h-6" />,
      description: 'Signalの基本的な使い方を学びましょう',
      steps: [
        {
          title: 'アカウント作成・ログイン',
          description: 'メールアドレスとパスワードでアカウントを作成し、ログインします。',
          action: 'ログインページへ',
          icon: <Users className="w-5 h-5" />
        },
        {
          title: 'SNS選択',
          description: '利用したいSNS（Instagram、TikTok、X、YouTube）を選択します。',
          action: 'SNS選択ページへ',
          icon: <Target className="w-5 h-5" />
        },
        {
          title: 'プロフィール設定',
          description: '基本情報、ビジネス情報、AI設定を入力します。',
          action: 'マイアカウントページへ',
          icon: <Settings className="w-5 h-5" />
        },
        {
          title: 'プラン作成',
          description: 'AI戦略に基づいて投稿プランを作成します。',
          action: 'プランページへ',
          icon: <FileText className="w-5 h-5" />
        }
      ]
    },
    {
      id: 'ai-features',
      title: 'AI機能の使い方',
      icon: <Zap className="w-6 h-6" />,
      description: 'AIを活用した投稿戦略とコンテンツ作成',
      steps: [
        {
          title: 'AI戦略生成',
          description: '現在のアカウント状況を分析し、最適な戦略を提案します。',
          action: 'AI戦略ページへ',
          icon: <TrendingUp className="w-5 h-5" />
        },
        {
          title: 'AI診断',
          description: '投稿パフォーマンスを分析し、改善点を特定します。',
          action: 'AI診断ページへ',
          icon: <BarChart3 className="w-5 h-5" />
        },
        {
          title: 'AI投稿生成',
          description: '戦略に基づいて投稿内容を自動生成します。',
          action: '投稿生成ページへ',
          icon: <MessageSquare className="w-5 h-5" />
        },
        {
          title: 'A/Bテスト',
          description: '異なる投稿パターンをテストして最適化します。',
          action: 'A/Bテストページへ',
          icon: <Target className="w-5 h-5" />
        }
      ],
      tips: [
        'AI戦略は定期的に更新することで効果的です',
        '投稿データが多いほど、AIの提案精度が向上します',
        'A/Bテストの結果を必ず確認して戦略に反映させましょう'
      ]
    },
    {
      id: 'analytics',
      title: '分析・レポート',
      icon: <BarChart3 className="w-6 h-6" />,
      description: 'パフォーマンス分析とレポート機能',
      steps: [
        {
          title: 'リアルタイム分析',
          description: '投稿のリアルタイムパフォーマンスを確認します。',
          action: '分析ページへ',
          icon: <Eye className="w-5 h-5" />
        },
        {
          title: '月次レポート',
          description: '月単位でのパフォーマンスレポートを生成します。',
          action: '月次レポートページへ',
          icon: <Calendar className="w-5 h-5" />
        },
        {
          title: 'データエクスポート',
          description: '分析データをCSV形式でダウンロードできます。',
          action: 'データダウンロード',
          icon: <Download className="w-5 h-5" />
        }
      ],
      tips: [
        '定期的にレポートを確認してトレンドを把握しましょう',
        'エンゲージメント率の変化に注目してください',
        'ベストパフォーマンス投稿の特徴を分析しましょう'
      ]
    },
    {
      id: 'notifications',
      title: '通知・お知らせ',
      icon: <Bell className="w-6 h-6" />,
      description: 'システム通知とお知らせの管理',
      steps: [
        {
          title: '通知設定',
          description: '重要な通知の受信設定を管理します。',
          action: '通知設定へ',
          icon: <Settings className="w-5 h-5" />
        },
        {
          title: 'お知らせ確認',
          description: 'システムのお知らせやアップデート情報を確認します。',
          action: 'お知らせページへ',
          icon: <Bell className="w-5 h-5" />
        },
        {
          title: '重要度フィルタ',
          description: '通知の重要度に応じてフィルタリングできます。',
          action: 'フィルタ設定',
          icon: <Star className="w-5 h-5" />
        }
      ]
    },
    {
      id: 'ai-chat',
      title: 'AIチャット',
      icon: <MessageSquare className="w-6 h-6" />,
      description: 'AIアシスタントとの対話機能',
      steps: [
        {
          title: 'チャット開始',
          description: '画面右下のチャットアイコンをクリックしてAIと対話します。',
          action: 'チャット開始',
          icon: <MessageSquare className="w-5 h-5" />
        },
        {
          title: '質問・相談',
          description: 'SNS運用に関する質問や相談をAIに投げかけます。',
          action: '質問する',
          icon: <Lightbulb className="w-5 h-5" />
        },
        {
          title: 'コンテキスト連携',
          description: '現在のページ情報を基にした具体的なアドバイスを受けられます。',
          action: '詳細確認',
          icon: <Shield className="w-5 h-5" />
        }
      ],
      tips: [
        '具体的な質問をするほど、より有用な回答が得られます',
        '現在のページの情報を活用してより詳細なアドバイスを求めましょう',
        '定期的にAIと対話して新しいアイデアを得ましょう'
      ]
    },
    {
      id: 'troubleshooting',
      title: 'トラブルシューティング',
      icon: <Shield className="w-6 h-6" />,
      description: 'よくある問題と解決方法',
      steps: [
        {
          title: 'ログインできない',
          description: 'パスワードを忘れた場合は、パスワードリセット機能を使用してください。',
          action: 'パスワードリセット',
          icon: <Users className="w-5 h-5" />
        },
        {
          title: 'データが表示されない',
          description: 'ブラウザのキャッシュをクリアし、ページを再読み込みしてください。',
          action: 'ページ再読み込み',
          icon: <Eye className="w-5 h-5" />
        },
        {
          title: 'AI機能が動作しない',
          description: 'インターネット接続を確認し、しばらく待ってから再試行してください。',
          action: '接続確認',
          icon: <Zap className="w-5 h-5" />
        },
        {
          title: '分析データが更新されない',
          description: 'SNSアカウントの連携状況を確認し、必要に応じて再認証してください。',
          action: 'アカウント連携確認',
          icon: <BarChart3 className="w-5 h-5" />
        }
      ],
      tips: [
        '問題が解決しない場合は、サポートチームにお問い合わせください',
        'エラーメッセージのスクリーンショットを保存しておくと解決が早くなります',
        '定期的にブラウザを更新して最新の機能を利用しましょう'
      ]
    }
  ];

  const filteredSections = guideSections.filter(section => 
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.steps.some(step => 
      step.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      step.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const getStepIcon = (step: GuideStep) => {
    return step.icon || <CheckCircle className="w-5 h-5 text-green-600" />;
  };

  return (
    <>
      <SNSLayout 
        currentSNS="instagram"
        customTitle="使い方ガイド"
        customDescription="Signalの機能と使い方を詳しく解説"
      >
        <div className="max-w-7xl mx-auto p-6">
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Signal 使い方ガイド</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              AIを活用したSNS運用を効率化するSignalの全機能を詳しく解説します。
              初心者の方でも簡単に始められるよう、ステップバイステップでご案内します。
            </p>
          </div>

          {/* 検索バー */}
          <div className="mb-8">
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="ガイドを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* サイドバーとメインコンテンツ */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* サイドバー */}
            <div className="lg:w-1/4">
              <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">目次</h3>
                <nav className="space-y-2">
                  {guideSections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full text-left flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                        activeSection === section.id
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {section.icon}
                      </div>
                      <span className="text-sm font-medium">{section.title}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* メインコンテンツ */}
            <div className="lg:w-3/4">
              {filteredSections.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">検索結果が見つかりません</h3>
                  <p className="text-gray-600">別のキーワードで検索してみてください</p>
                </div>
              ) : (
                filteredSections.map((section) => (
                  <div
                    key={section.id}
                    className={`bg-white rounded-lg border border-gray-200 p-8 mb-8 ${
                      activeSection === section.id ? 'block' : 'hidden'
                    }`}
                  >
                    {/* セクションヘッダー */}
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        {section.icon}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{section.title}</h2>
                        <p className="text-gray-600">{section.description}</p>
                      </div>
                    </div>

                    {/* ステップ一覧 */}
                    <div className="space-y-6">
                      {section.steps.map((step, index) => (
                        <div key={index} className="flex items-start space-x-4 p-6 bg-gray-50 rounded-lg">
                          <div className="flex-shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center border-2 border-blue-200">
                            <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              {getStepIcon(step)}
                              <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                            </div>
                            <p className="text-gray-600 mb-3">{step.description}</p>
                            {step.action && (
                              <button className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium">
                                <span>{step.action}</span>
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ヒント */}
                    {section.tips && section.tips.length > 0 && (
                      <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-4">
                          <Lightbulb className="w-5 h-5 text-yellow-600" />
                          <h4 className="text-lg font-semibold text-yellow-800">💡 ヒント</h4>
                        </div>
                        <ul className="space-y-2">
                          {section.tips.map((tip, index) => (
                            <li key={index} className="flex items-start space-x-2 text-yellow-700">
                              <CheckCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* サポート情報 */}
          <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-8 text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-4">まだ質問がありますか？</h3>
            <p className="text-gray-600 mb-6">
              AIチャット機能を使って、いつでも質問や相談ができます。
              画面右下のチャットアイコンをクリックしてお気軽にお声がけください。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <MessageSquare className="w-5 h-5" />
                <span>AIチャットを開く</span>
              </button>
              <button className="inline-flex items-center space-x-2 px-6 py-3 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                <Bell className="w-5 h-5" />
                <span>お知らせを確認</span>
              </button>
            </div>
          </div>
        </div>
      </SNSLayout>

      {/* AIチャットウィジェット */}
      <AIChatWidget 
        contextData={{
          currentPage: 'guide',
          guideSections: guideSections,
          activeSection: activeSection
        }}
      />
    </>
  );
}
