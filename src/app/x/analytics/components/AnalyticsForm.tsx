'use client';

import React, { useState } from 'react';
import { Search, TrendingUp, Eye, Heart, MessageCircle, Repeat2 } from 'lucide-react';

interface PostData {
  id: string;
  content: string;
  mediaUrls?: string[];
  timestamp: string;
  metrics: {
    impressions: number;
    engagements: number;
    retweets: number;
    likes: number;
    replies: number;
    clicks: number;
    profileClicks: number;
    linkClicks: number;
  };
}

interface AnalyticsFormProps {
  onPostAnalysis: (post: PostData) => void;
  selectedPost: PostData | null;
  posts: PostData[];
}

export default function AnalyticsForm({ onPostAnalysis, selectedPost, posts }: AnalyticsFormProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'engagement' | 'impressions' | 'likes'>('date');
  const [filterBy, setFilterBy] = useState<'all' | 'high_engagement' | 'low_engagement' | 'recent'>('all');

  // フィルタリングとソート
  const filteredPosts = posts
    .filter(post => {
      const matchesSearch = post.content.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesFilter = true;
      if (filterBy === 'high_engagement') {
        matchesFilter = post.metrics.engagements > 100;
      } else if (filterBy === 'low_engagement') {
        matchesFilter = post.metrics.engagements < 50;
      } else if (filterBy === 'recent') {
        const postDate = new Date(post.timestamp);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        matchesFilter = postDate > weekAgo;
      }
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'engagement':
          return b.metrics.engagements - a.metrics.engagements;
        case 'impressions':
          return b.metrics.impressions - a.metrics.impressions;
        case 'likes':
          return b.metrics.likes - a.metrics.likes;
        case 'date':
        default:
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
    });

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getEngagementRate = (post: PostData) => {
    return post.metrics.impressions > 0 
      ? ((post.metrics.engagements / post.metrics.impressions) * 100).toFixed(1)
      : '0.0';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">投稿分析</h3>
        
        {/* 検索とフィルター */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="投稿を検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'engagement' | 'impressions' | 'likes')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date">投稿日時</option>
              <option value="engagement">エンゲージメント</option>
              <option value="impressions">インプレッション</option>
              <option value="likes">いいね数</option>
            </select>
            
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as 'all' | 'high_engagement' | 'low_engagement' | 'recent')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">すべて</option>
              <option value="high_engagement">高エンゲージメント</option>
              <option value="low_engagement">低エンゲージメント</option>
              <option value="recent">最近の投稿</option>
            </select>
          </div>
        </div>

        {/* 統計情報 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">総投稿数</p>
                <p className="text-xl font-semibold text-blue-600">{posts.length}</p>
              </div>
              <MessageCircle className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">平均エンゲージメント率</p>
                <p className="text-xl font-semibold text-green-600">
                  {posts.length > 0 
                    ? (posts.reduce((sum, post) => sum + parseFloat(getEngagementRate(post)), 0) / posts.length).toFixed(1)
                    : '0.0'
                  }%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">総インプレッション</p>
                <p className="text-xl font-semibold text-purple-600">
                  {formatNumber(posts.reduce((sum, post) => sum + post.metrics.impressions, 0))}
                </p>
              </div>
              <Eye className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          
          <div className="bg-red-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">総いいね数</p>
                <p className="text-xl font-semibold text-red-600">
                  {formatNumber(posts.reduce((sum, post) => sum + post.metrics.likes, 0))}
                </p>
              </div>
              <Heart className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 投稿一覧 */}
      <div className="divide-y">
        {filteredPosts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>投稿が見つかりません</p>
            {searchTerm && (
              <p className="text-sm mt-2">「{searchTerm}」で検索した結果がありません</p>
            )}
          </div>
        ) : (
          filteredPosts.map((post) => (
            <div
              key={post.id}
              className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                selectedPost?.id === post.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              }`}
              onClick={() => onPostAnalysis(post)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-gray-700 line-clamp-2 mb-2">{post.content}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{new Date(post.timestamp).toLocaleDateString('ja-JP')}</span>
                    <span>エンゲージメント率: {getEngagementRate(post)}%</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-3">
                <div className="flex items-center space-x-1">
                  <Eye className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{formatNumber(post.metrics.impressions)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Heart className="h-4 w-4 text-red-400" />
                  <span className="text-sm text-gray-600">{formatNumber(post.metrics.likes)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Repeat2 className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-gray-600">{formatNumber(post.metrics.retweets)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageCircle className="h-4 w-4 text-blue-400" />
                  <span className="text-sm text-gray-600">{formatNumber(post.metrics.replies)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-4 w-4 text-purple-400" />
                  <span className="text-sm text-gray-600">{formatNumber(post.metrics.engagements)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {filteredPosts.length > 0 && (
        <div className="p-4 bg-gray-50 text-center text-sm text-gray-600">
          {filteredPosts.length}件中 {filteredPosts.length}件を表示
        </div>
      )}
    </div>
  );
}
