'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, User, Lightbulb } from 'lucide-react';
import { useUserProfile } from '../hooks/useUserProfile';
import { useAuth } from '../contexts/auth-context';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatWidgetProps {
  contextData?: Record<string, unknown>;
}

export const AIChatWidget: React.FC<AIChatWidgetProps> = ({ contextData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [usageInfo, setUsageInfo] = useState({
    usageCount: 0,
    maxUsage: 20,
    remainingUsage: 20,
    canUse: true
  });
  const [isCheckingUsage, setIsCheckingUsage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { userProfile } = useUserProfile();
  const { user } = useAuth();

  // 使用回数を取得
  const fetchUsageInfo = async () => {
    if (!user?.uid) return;
    
    try {
      setIsCheckingUsage(true);
      const idToken = await user.getIdToken();
      
      const response = await fetch('/api/ai-chat/usage', {
        headers: {
          'x-user-id': user.uid,
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsageInfo(data);
      }
    } catch (error) {
      console.error('Failed to fetch usage info:', error);
    } finally {
      setIsCheckingUsage(false);
    }
  };

  // 使用回数を記録
  const recordUsage = async () => {
    if (!user?.uid) return false;
    
    try {
      const idToken = await user.getIdToken();
      
      const response = await fetch('/api/ai-chat/usage', {
        method: 'POST',
        headers: {
          'x-user-id': user.uid,
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsageInfo(data);
        return true;
      } else if (response.status === 429) {
        const data = await response.json();
        setUsageInfo(data);
        return false;
      }
    } catch (error) {
      console.error('Failed to record usage:', error);
      return false;
    }
    
    return false;
  };

  // デバッグ用ログ（削除）
  // console.log('AIChatWidget rendered, isOpen:', isOpen, 'contextData:', contextData);

  // 計画系テンプレート
  const planTemplates = [
    {
      id: 'current-goal',
      title: '現在の目標確認',
      message: '現在の目標フォロワー数と達成期限を確認したいです。'
    },
    {
      id: 'simulation-result',
      title: 'シミュレーション結果',
      message: 'シミュレーション結果について詳しく教えてください。'
    },
    {
      id: 'posting-strategy',
      title: '投稿戦略の確認',
      message: '推奨されている投稿戦略について教えてください。'
    },
    {
      id: 'feasibility-check',
      title: '実現可能性の確認',
      message: 'この計画の実現可能性はどの程度ですか？'
    },
    {
      id: 'workload-check',
      title: '作業負荷の確認',
      message: '週間・月間の作業負荷について詳しく教えてください。'
    },
    {
      id: 'improvement-tips',
      title: '改善のヒント',
      message: '計画を改善するための具体的なヒントを教えてください。'
    }
  ];

  // Instagram全体アドバイザーテンプレート
  const instagramTemplates = [
    {
      id: 'strategy-overview',
      title: '戦略全体の確認',
      message: '現在のInstagram戦略全体について分析し、改善点を教えてください。'
    },
    {
      id: 'content-advice',
      title: 'コンテンツアドバイス',
      message: 'より効果的なコンテンツ作成のアドバイスをください。'
    },
    {
      id: 'engagement-tips',
      title: 'エンゲージメント向上',
      message: 'フォロワーとのエンゲージメントを向上させる方法を教えてください。'
    },
    {
      id: 'posting-schedule',
      title: '投稿スケジュール',
      message: '最適な投稿タイミングと頻度についてアドバイスをください。'
    },
    {
      id: 'hashtag-strategy',
      title: 'ハッシュタグ戦略',
      message: '効果的なハッシュタグの選び方と使い方を教えてください。'
    },
    {
      id: 'analytics-insight',
      title: '分析データ活用',
      message: '分析データを活用した改善策を提案してください。'
    }
  ];

  // メッセージの自動スクロール
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 初期メッセージ
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const displayName = userProfile?.name || user?.displayName || 'ユーザー';
      const welcomeMessage: Message = {
        id: '1',
        role: 'assistant',
        content: `${displayName}さん、こんにちは！Instagram運用について何でもお聞きください。現在の計画内容を把握しているので、具体的なアドバイスをお伝えできます。`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length, userProfile, user]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    // 使用制限をチェック
    if (!usageInfo.canUse) {
      alert('今月の使用回数が上限に達しています。来月までお待ちください。');
      return;
    }

    // 使用回数を記録
    const canUse = await recordUsage();
    if (!canUse) {
      alert('今月の使用回数が上限に達しています。来月までお待ちください。');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // 実際のAI APIを呼び出し
      const idToken = user ? await user.getIdToken() : null;
      
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken && { 'Authorization': `Bearer ${idToken}` })
        },
        body: JSON.stringify({
          message: inputMessage.trim(),
          context: contextData,
          userId: user?.uid,
          pageType: 'instagram' // Instagramページからのチャット
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      console.log('AI API response:', data);
      
      if (data.success && data.response) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to get AI response');
      }

      // テンプレート返答の場合はログ出力
      if (data.isTemplateResponse) {
        console.log('Template response used - no AI tokens consumed');
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '申し訳ございません。エラーが発生しました。しばらくしてから再度お試しください。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTemplateClick = (template: typeof planTemplates[0] | typeof instagramTemplates[0]) => {
    setInputMessage(template.message);
    setShowTemplates(false);
  };

  return (
    <>
      {/* チャットボタン */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-[9999]">
          {/* ようこそ吹き出し */}
          <div className="absolute bottom-16 right-0 mb-2">
            <div className="bg-white rounded-full shadow-lg border border-gray-200 px-4 py-2">
              <div className="flex items-center space-x-2">
                <Bot size={16} className="text-orange-600" />
                <p className="text-sm font-medium text-black whitespace-nowrap">
                  {userProfile?.name ? `${userProfile.name}さん、Instagram運用を相談しよう！` : 'Instagram運用を相談しよう！'}
                </p>
              </div>
              {/* 吹き出しの矢印 */}
              <div className="absolute bottom-0 right-4 transform translate-y-full">
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white"></div>
              </div>
            </div>
          </div>
          
          {/* チャットボタン */}
          <button
            onClick={() => {
              setIsOpen(true);
              fetchUsageInfo();
            }}
            className="w-14 h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group relative"
            aria-label="AIチャットを開く"
          >
            <Bot size={24} className="group-hover:scale-110 transition-transform duration-200" />
            {usageInfo.remainingUsage < 3 && usageInfo.remainingUsage > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                {usageInfo.remainingUsage}
              </span>
            )}
          </button>
          {isCheckingUsage && (
            <div className="absolute -top-12 right-0 bg-gray-800 text-white text-xs px-2 py-1 rounded">
              確認中...
            </div>
          )}
        </div>
      )}

      {/* チャットウィンドウ */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-[9999]">
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100 rounded-t-lg">
            <div className="flex items-center space-x-2">
              <Bot size={20} className="text-orange-600" />
              <div>
                <h3 className="font-semibold text-gray-800">AI運用アドバイザー</h3>
                <p className="text-xs text-black">
                  残り使用回数: {usageInfo.remainingUsage}/{usageInfo.maxUsage}回
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              aria-label="チャットを閉じる"
            >
              <X size={16} />
            </button>
          </div>

          {/* メッセージエリア */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.role === 'assistant' && (
                      <Bot size={16} className="mt-0.5 text-orange-600 flex-shrink-0" />
                    )}
                    {message.role === 'user' && (
                      <User size={16} className="mt-0.5 flex-shrink-0" />
                    )}
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Bot size={16} className="text-orange-600" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* テンプレートエリア */}
          {showTemplates && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Lightbulb size={16} className="text-orange-600" />
                  <span className="text-sm font-medium text-gray-700">よく使われる質問</span>
                </div>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="text-black hover:text-black"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {instagramTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateClick(template)}
                    className="p-2 text-left bg-white border border-gray-200 rounded-lg hover:bg-orange-50 hover:border-orange-200 transition-colors"
                  >
                    <div className="text-xs font-medium text-gray-800 mb-1">
                      {template.title}
                    </div>
                    <div className="text-xs text-black line-clamp-2">
                      {template.message}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 入力エリア */}
          <div className="p-4 border-t border-gray-200">
            {/* テンプレートボタン */}
            <div className="mb-2">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center space-x-1 text-xs text-orange-600 hover:text-orange-700 transition-colors"
              >
                <Lightbulb size={12} />
                <span>よく使われる質問</span>
              </button>
            </div>
            
            <div className="flex space-x-2">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Instagram運用について質問してください..."
                className="flex-1 p-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                rows={2}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading || !usageInfo.canUse}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center justify-center relative"
              >
                <Send size={16} />
                {!usageInfo.canUse && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    !
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
