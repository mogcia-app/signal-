'use client';

import React, { useState, useEffect, useRef } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { 
  Send, 
  Bot, 
  User, 
  Copy,
  RefreshCw
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

const AI_SUGGESTIONS = [
  "最新の投稿パフォーマンスを分析して",
  "フォロワー増加のための戦略を教えて",
  "エンゲージメント率を改善する方法は？",
  "最適な投稿時間を分析して",
  "ハッシュタグの効果を評価して",
  "競合分析をしてほしい",
  "コンテンツ戦略の提案をして",
  "月次レポートの改善点を教えて"
];

// const AI_PROMPTS = {
//   performance: "📊 パフォーマンス分析について詳しく教えます。どの指標に興味がありますか？",
//   strategy: "🎯 成長戦略について相談しましょう。現在の目標は何ですか？",
//   engagement: "💬 エンゲージメント向上のコツをお伝えします。",
//   timing: "⏰ 最適な投稿時間について分析します。",
//   hashtags: "#️⃣ ハッシュタグ戦略についてアドバイスします。",
//   competition: "🔍 競合分析の方法をお教えします。",
//   content: "✨ コンテンツ戦略について一緒に考えましょう。",
//   report: "📈 レポート改善のための具体的な提案をします。"
// };

export default function InstagramAIChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 初期メッセージを設定
  useEffect(() => {
    const welcomeMessage: Message = {
      id: '1',
      type: 'ai',
      content: 'こんにちは！Instagram分析AIアシスタントです。📊\n\nあなたのInstagramアカウントの成長をサポートします。パフォーマンス分析、戦略提案、改善アドバイスなど、何でもお気軽にご相談ください！',
      timestamp: new Date(),
      suggestions: ['パフォーマンス分析をして', '成長戦略を教えて', '投稿時間の最適化について']
    };
    setMessages([welcomeMessage]);
  }, []);

  // メッセージを最下部にスクロール
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // AI応答を生成（モック）
  const generateAIResponse = async (userMessage: string): Promise<string> => {
    // 実際の実装では OpenAI API を呼び出す
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('パフォーマンス') || lowerMessage.includes('分析')) {
      return "📊 パフォーマンス分析結果をお伝えします：\n\n• 平均エンゲージメント率: 3.2%（業界平均: 2.8%）\n• 最高パフォーマンス投稿: リール投稿（平均5.1%）\n• 投稿頻度の最適化が必要です\n\n詳細な分析レポートをご覧になりたい場合は、月次レポートページをご確認ください。";
    }
    
    if (lowerMessage.includes('戦略') || lowerMessage.includes('成長')) {
      return "🎯 成長戦略の提案です：\n\n1. **リール投稿を週3回に増加**\n   → リーチ率向上が期待できます\n\n2. **ストーリーズの活用強化**\n   → エンゲージメント率+20%向上\n\n3. **ハッシュタグ最適化**\n   → リーチ拡大効果\n\n運用計画ページで具体的な戦略を立てることをお勧めします。";
    }
    
    if (lowerMessage.includes('時間') || lowerMessage.includes('投稿時間')) {
      return "⏰ 最適な投稿時間の分析結果：\n\n**最も効果的な時間帯：**\n• 平日: 18:00-20:00（エンゲージメント率+15%）\n• 週末: 14:00-16:00（リーチ率+12%）\n\n**避けるべき時間帯：**\n• 深夜帯（0:00-6:00）\n• 平日の午前中（8:00-12:00）\n\n投稿ラボでスケジュール機能を活用することをお勧めします。";
    }
    
    if (lowerMessage.includes('ハッシュタグ')) {
      return "#️⃣ ハッシュタグ戦略のアドバイス：\n\n**効果的なハッシュタグの使い方：**\n• ミックス戦略: 大規模(5) + 中規模(10) + 小規模(15)\n• 現在のトップハッシュタグ: #instagood, #photooftheday\n• 業界特化ハッシュタグを追加推奨\n\n**改善提案：**\n• ハッシュタグの定期的な更新\n• 競合分析からの学習\n• トレンドハッシュタグの活用";
    }
    
    if (lowerMessage.includes('競合') || lowerMessage.includes('ライバル')) {
      return "🔍 競合分析のポイント：\n\n**分析すべき要素：**\n• 投稿頻度とタイミング\n• エンゲージメント率の比較\n• コンテンツタイプの傾向\n• ハッシュタグ戦略\n\n**具体的なアクション：**\n• 週1回の競合チェック\n• 成功パターンの学習\n• 差別化ポイントの明確化\n\n詳細な競合分析は月次レポートでご確認いただけます。";
    }
    
    if (lowerMessage.includes('コンテンツ') || lowerMessage.includes('戦略')) {
      return "✨ コンテンツ戦略の提案：\n\n**コンテンツミックス最適化：**\n• リール: 40%（現在25%）\n• フィード: 35%（現在50%）\n• ストーリーズ: 25%（現在25%）\n\n**コンテンツテーマ：**\n• 教育系コンテンツ（+30%エンゲージ）\n• ユーザー生成コンテンツ\n• トレンドを活用したコンテンツ\n\n投稿ラボでコンテンツカレンダーを作成することをお勧めします。";
    }
    
    // デフォルト応答
    return "🤖 ありがとうございます！\n\nその質問について詳しくお答えします。Instagramの成長には以下の要素が重要です：\n\n• **一貫した投稿スケジュール**\n• **エンゲージメントの向上**\n• **適切なハッシュタグ戦略**\n• **コンテンツの多様化**\n\nより具体的なアドバイスが必要でしたら、どの分野に特に関心があるか教えてください。";
  };

  // メッセージ送信
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const aiResponse = await generateAIResponse(userMessage.content);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date(),
        suggestions: ['もっと詳しく教えて', '他の戦略は？', '具体的な方法を教えて']
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI応答エラー:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: '申し訳ございません。一時的にエラーが発生しました。もう一度お試しください。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  // 提案メッセージをクリック
  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
  };

  // メッセージをコピー
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  // チャット履歴をクリア
  const handleClearChat = () => {
    if (confirm('チャット履歴をクリアしますか？')) {
      const welcomeMessage: Message = {
        id: '1',
        type: 'ai',
        content: 'チャット履歴をクリアしました。新しい会話を始めましょう！📊\n\n何かご質問があれば、お気軽にお聞きください。',
        timestamp: new Date(),
        suggestions: ['パフォーマンス分析をして', '成長戦略を教えて', '投稿時間の最適化について']
      };
      setMessages([welcomeMessage]);
    }
  };

  return (
    <SNSLayout 
      currentSNS="instagram"
      customTitle="AIチャット"
      customDescription="Instagram分析AIアシスタント"
    >
      <div className="max-w-4xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Instagram分析AI</h1>
              <p className="text-sm text-gray-500">
                {isTyping ? '入力中...' : 'オンライン'}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleClearChat}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>履歴クリア</span>
          </button>
        </div>

        {/* メッセージエリア */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white min-h-[60vh]">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-3xl ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                <div className={`flex items-start space-x-3 ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {/* アバター */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.type === 'user' 
                      ? 'bg-blue-500' 
                      : 'bg-gradient-to-r from-purple-500 to-pink-500'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>

                  {/* メッセージコンテンツ */}
                  <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                    message.type === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200 shadow-md'
                  }`}>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    
                    {/* タイムスタンプ */}
                    <div className={`text-xs mt-2 ${
                      message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString('ja-JP', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>

                    {/* コピーボタン */}
                    <button
                      onClick={() => handleCopyMessage(message.content)}
                      className={`mt-2 p-1 rounded hover:bg-opacity-20 transition-colors ${
                        message.type === 'user' ? 'hover:bg-white' : 'hover:bg-gray-100'
                      }`}
                      title="メッセージをコピー"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* 提案メッセージ */}
                {message.suggestions && message.type === 'ai' && (
                  <div className="mt-3 ml-11 space-y-2">
                    <p className="text-xs text-gray-500">提案メッセージ:</p>
                    <div className="flex flex-wrap gap-2">
                      {message.suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* タイピングインジケーター */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="max-w-3xl">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-md">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 入力エリア */}
        <div className="bg-white border-t border-gray-200 p-4 shadow-lg">
          {/* クイックアクション */}
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-2">クイックアクション:</p>
            <div className="flex flex-wrap gap-2">
              {AI_SUGGESTIONS.slice(0, 4).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={isLoading}
                  className="px-3 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* 入力フォーム */}
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Instagramの分析について質問してください..."
                disabled={isLoading}
                className="w-full px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center hover:from-blue-600 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </SNSLayout>
  );
}
