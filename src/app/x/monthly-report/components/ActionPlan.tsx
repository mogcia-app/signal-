'use client';

import React, { useState } from 'react';
import { Target, CheckCircle, Circle, Plus, AlertTriangle, TrendingUp, Users, MessageCircle, Calendar } from 'lucide-react';

interface ActionItem {
  id: string;
  title: string;
  description: string;
  category: 'content' | 'engagement' | 'growth' | 'optimization';
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: string;
  impact: string;
}

interface ActionPlanProps {
  currentData: {
    totalLikes: number;
    totalRetweets: number;
    totalComments: number;
    totalImpressions: number;
    totalFollowers: number;
    engagementRate: number;
  };
  previousData?: {
    totalLikes: number;
    totalRetweets: number;
    totalComments: number;
    totalImpressions: number;
    totalFollowers: number;
    engagementRate: number;
  };
}

export function ActionPlan({ currentData: _currentData, previousData: _previousData }: ActionPlanProps) {
  const [actionItems, setActionItems] = useState<ActionItem[]>([
    {
      id: '1',
      title: 'エンゲージメント率の改善',
      description: '現在のエンゲージメント率を分析し、より魅力的なコンテンツ作成に取り組む',
      category: 'engagement',
      priority: 'high',
      status: 'pending',
      dueDate: '2024-11-15',
      impact: 'エンゲージメント率 +2%'
    },
    {
      id: '2',
      title: '投稿頻度の最適化',
      description: '最適な投稿時間帯を見つけ、投稿頻度を調整する',
      category: 'content',
      priority: 'medium',
      status: 'in_progress',
      dueDate: '2024-11-10',
      impact: 'リーチ +15%'
    },
    {
      id: '3',
      title: 'ハッシュタグ戦略の見直し',
      description: 'トレンドハッシュタグを活用し、リーチを拡大する',
      category: 'growth',
      priority: 'medium',
      status: 'pending',
      dueDate: '2024-11-20',
      impact: 'インプレッション +20%'
    },
    {
      id: '4',
      title: 'フォロワーとの交流促進',
      description: 'リプライやリツイートを増やし、コミュニティを活性化する',
      category: 'engagement',
      priority: 'high',
      status: 'pending',
      dueDate: '2024-11-12',
      impact: 'フォロワー定着率 +10%'
    }
  ]);

  const [newAction, setNewAction] = useState<{
    title: string;
    description: string;
    category: 'content' | 'engagement' | 'growth' | 'optimization';
    priority: 'high' | 'medium' | 'low';
    dueDate: string;
    impact: string;
  }>({
    title: '',
    description: '',
    category: 'content',
    priority: 'medium',
    dueDate: '',
    impact: ''
  });

  const [showAddForm, setShowAddForm] = useState(false);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'content': return <MessageCircle className="w-4 h-4" />;
      case 'engagement': return <Users className="w-4 h-4" />;
      case 'growth': return <TrendingUp className="w-4 h-4" />;
      case 'optimization': return <Target className="w-4 h-4" />;
      default: return <Circle className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'content': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'engagement': return 'bg-green-100 text-green-800 border-green-200';
      case 'growth': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'optimization': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const toggleActionStatus = (id: string) => {
    setActionItems(items =>
      items.map(item =>
        item.id === id
          ? {
              ...item,
              status: item.status === 'completed' ? 'pending' : 'completed'
            }
          : item
      )
    );
  };

  const addNewAction = () => {
    if (newAction.title.trim()) {
      const newItem: ActionItem = {
        id: Date.now().toString(),
        title: newAction.title,
        description: newAction.description,
        category: newAction.category,
        priority: newAction.priority,
        status: 'pending',
        dueDate: newAction.dueDate || undefined,
        impact: newAction.impact
      };
      setActionItems([...actionItems, newItem]);
      setNewAction({
        title: '',
        description: '',
        category: 'content',
        priority: 'medium',
        dueDate: '',
        impact: ''
      });
      setShowAddForm(false);
    }
  };

  const completedCount = actionItems.filter(item => item.status === 'completed').length;
  const completionRate = Math.round((completedCount / actionItems.length) * 100);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Target className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">アクションプラン</h3>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} className="mr-1" />
          新規追加
        </button>
      </div>

      {/* 進捗サマリー */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-700">進捗状況</h4>
            <p className="text-2xl font-bold text-gray-900">{completedCount}/{actionItems.length}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{completionRate}%</div>
            <div className="text-sm text-gray-500">完了率</div>
          </div>
          <div className="w-16 h-16">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-200"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-blue-600"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={`${completionRate}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 新規追加フォーム */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-3">新しいアクションを追加</h4>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="アクションタイトル"
              value={newAction.title}
              onChange={(e) => setNewAction({ ...newAction, title: e.target.value })}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <textarea
              placeholder="詳細説明"
              value={newAction.description}
              onChange={(e) => setNewAction({ ...newAction, description: e.target.value })}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={newAction.category}
                onChange={(e) => setNewAction({ ...newAction, category: e.target.value as typeof newAction.category })}
                className="px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="content">コンテンツ</option>
                <option value="engagement">エンゲージメント</option>
                <option value="growth">成長</option>
                <option value="optimization">最適化</option>
              </select>
              <select
                value={newAction.priority}
                onChange={(e) => setNewAction({ ...newAction, priority: e.target.value as typeof newAction.priority })}
                className="px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={newAction.dueDate}
                onChange={(e) => setNewAction({ ...newAction, dueDate: e.target.value })}
                className="px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="期待される効果"
                value={newAction.impact}
                onChange={(e) => setNewAction({ ...newAction, impact: e.target.value })}
                className="px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={addNewAction}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                追加
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* アクションアイテム一覧 */}
      <div className="space-y-4">
        {actionItems.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-lg border ${
              item.status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-start space-x-3">
              <button
                onClick={() => toggleActionStatus(item.id)}
                className={`mt-1 ${item.status === 'completed' ? 'text-green-600' : 'text-gray-400 hover:text-green-600'}`}
              >
                {item.status === 'completed' ? <CheckCircle size={20} /> : <Circle size={20} />}
              </button>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h4 className={`font-medium ${item.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                    {item.title}
                  </h4>
                  <span className={`px-2 py-1 text-xs rounded-full border ${getCategoryColor(item.category)}`}>
                    <div className="flex items-center space-x-1">
                      {getCategoryIcon(item.category)}
                      <span>{item.category}</span>
                    </div>
                  </span>
                  <span className={`text-xs font-medium ${getPriorityColor(item.priority)}`}>
                    {item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低'}優先度
                  </span>
                </div>
                
                <p className={`text-sm mb-3 ${item.status === 'completed' ? 'text-gray-500' : 'text-gray-600'}`}>
                  {item.description}
                </p>
                
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  {item.dueDate && (
                    <div className="flex items-center space-x-1">
                      <Calendar size={12} />
                      <span>期限: {new Date(item.dueDate).toLocaleDateString('ja-JP')}</span>
                    </div>
                  )}
                  {item.impact && (
                    <div className="flex items-center space-x-1">
                      <TrendingUp size={12} />
                      <span>効果: {item.impact}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 推奨アクション */}
      <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex items-center space-x-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <h4 className="text-sm font-medium text-yellow-900">今月の推奨アクション</h4>
        </div>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• エンゲージメント率が低い場合は、質問形式の投稿を増やす</li>
          <li>• リツイート数が少ない場合は、トレンドトピックを活用する</li>
          <li>• フォロワー増加が鈍化している場合は、ハッシュタグ戦略を見直す</li>
        </ul>
      </div>
    </div>
  );
}
