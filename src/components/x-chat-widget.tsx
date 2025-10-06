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

interface XChatWidgetProps {
  contextData?: Record<string, unknown>;
}

export const XChatWidget: React.FC<XChatWidgetProps> = ({ contextData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { userProfile } = useUserProfile();
  const { user } = useAuth();

  // X版用テンプレート
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
      id: 'tweet-strategy',
      title: 'ツイート戦略',
      message: 'ツイートの投稿戦略について教えてください。'
    },
    {
      id: 'thread-strategy',
      title: 'スレッド戦略',
      message: 'スレッドの投稿戦略について教えてください。'
    },
    {
      id: 'reply-strategy',
      title: 'リプライ戦略',
      message: 'リプライの投稿戦略について教えてください。'
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 初回メッセージを追加
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const displayName = userProfile?.name || user?.displayName || 'ユーザー';
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: `${displayName}さん、X版AIアシスタントへようこそ！\n\nX（旧Twitter）の運用について何でもお聞きください。ツイート、スレッド、リプライの戦略など、お手伝いします！`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length, userProfile, user]);

  const handleTemplateClick = (template: typeof planTemplates[0]) => {
    setInputMessage(template.message);
    setShowTemplates(false);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

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
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage.trim(),
          contextData: {
            ...contextData,
            platform: 'x',
            snsType: 'X（旧Twitter）'
          },
          userId: user?.uid || 'x-user',
          pageType: 'x-plan'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response || '申し訳ございません。現在X版のAIチャット機能を準備中です。',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('AIチャットエラー');
      }
    } catch (error) {
      console.error('チャットエラー:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'X版のAIチャット機能は準備中です。しばらくお待ちください。',
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

  return (
    <>
      {/* チャットボタン */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-[9999]">
          <div className="relative">
            {/* 通知バッジ */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            
            {/* 吹き出し */}
            <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div className="flex items-center space-x-2">
                <Bot size={16} className="text-blue-400" />
                <span>X版AIチャットで質問</span>
              </div>
              {/* 吹き出しの矢印 */}
              <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
            </div>
          </div>
          
          {/* チャットボタン */}
          <button
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
            aria-label="X版AIチャットを開く"
          >
            <Bot size={24} className="group-hover:scale-110 transition-transform duration-200" />
          </button>
        </div>
      )}

      {/* チャットウィンドウ */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-[9999]">
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100 rounded-t-lg">
            <div className="flex items-center space-x-2">
              <Bot size={20} className="text-blue-600" />
              <h3 className="font-semibold text-gray-800">X版AIアシスタント</h3>
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
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.role === 'assistant' && (
                      <Bot size={16} className="mt-0.5 text-blue-600 flex-shrink-0" />
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
                    <Bot size={16} className="text-blue-600" />
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
                  <Lightbulb size={16} className="text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">よく使われる質問</span>
                </div>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {planTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateClick(template)}
                    className="p-2 text-left bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors"
                  >
                    <div className="text-xs font-medium text-gray-800 mb-1">
                      {template.title}
                    </div>
                    <div className="text-xs text-gray-600 line-clamp-2">
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
                className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
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
                placeholder="X版の運用について質問してください..."
                className="flex-1 p-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center justify-center"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
