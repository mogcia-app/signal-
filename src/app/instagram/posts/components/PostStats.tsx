'use client';

import React from 'react';
import Image from 'next/image';

interface ScheduledPost {
  day: string;
  date: string;
  type: string;
  title: string;
  time: string;
  status: string;
}

interface UnanalyzedPost {
  id: string;
  title: string;
  type: string;
  imageUrl: string | null;
  createdAt: string;
  status: string;
}

interface PostStatsProps {
  scheduledPosts: ScheduledPost[];
  unanalyzedPosts: UnanalyzedPost[];
}

const PostStats: React.FC<PostStatsProps> = ({
  scheduledPosts,
  unanalyzedPosts
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* 今週の投稿予定 */}
      <div className="bg-white shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <span className="text-2xl mr-2">📅</span>
            今週の投稿予定
          </h2>
          <a href="/instagram/plan" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
            投稿管理 →
          </a>
        </div>
        <div className="p-6 space-y-3">
          {scheduledPosts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-2">📅</div>
              <p className="text-gray-600">今週の投稿予定はありません</p>
            </div>
          ) : (
            scheduledPosts.map((post, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center flex-1">
                  <div className="text-center mr-4 min-w-[50px]">
                    <div className="text-xs text-gray-500">{post.day}</div>
                    <div className="text-sm font-semibold text-gray-900">{post.date}</div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <span className={`inline-flex items-center px-2 py-1  text-xs font-medium mr-2 ${
                        post.type === 'reel' ? 'bg-purple-100 text-purple-800' :
                        post.type === 'feed' ? 'bg-blue-100 text-blue-800' :
                        'bg-pink-100 text-pink-800'
                      }`}>
                        {post.type === 'reel' ? '🎬' : post.type === 'feed' ? '📸' : '📱'}
                        {post.type}
                      </span>
                      <span className="inline-flex items-center px-2 py-1  text-xs font-medium bg-yellow-100 text-yellow-800">
                        ⏳ {post.status}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-gray-900 line-clamp-1">{post.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      <span className="mr-2">⏰ {post.time}</span>
                      <span className="text-gray-400">|</span>
                      <span className="ml-2">📅 投稿予定</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 分析待ちの投稿 */}
      <div className="bg-white shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <span className="text-2xl mr-2">📊</span>
            分析待ちの投稿
          </h2>
          <a href="/instagram/analytics" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
            分析する →
          </a>
        </div>
        <div className="p-6 space-y-3">
          {unanalyzedPosts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-2">✅</div>
              <p className="text-gray-600">分析待ちの投稿はありません</p>
              <p className="text-sm text-gray-500 mt-1">すべての投稿が分析済みです</p>
            </div>
          ) : (
            unanalyzedPosts.map((post, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-orange-50 hover:bg-orange-100 transition-colors border border-orange-200">
                <div className="flex items-center flex-1">
                  <div className="w-12 h-12 mr-3 flex-shrink-0">
                    {post.imageUrl ? (
                      <Image 
                        src={post.imageUrl} 
                        alt={post.title}
                        width={64}
                        height={64}
                        quality={85}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400 text-xs">📷</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <span className={`inline-flex items-center px-2 py-1  text-xs font-medium mr-2 ${
                        post.type === 'reel' ? 'bg-purple-100 text-purple-800' :
                        post.type === 'feed' ? 'bg-blue-100 text-blue-800' :
                        'bg-pink-100 text-pink-800'
                      }`}>
                        {post.type === 'reel' ? '🎬' : post.type === 'feed' ? '📸' : '📱'}
                        {post.type}
                      </span>
                      <span className="inline-flex items-center px-2 py-1  text-xs font-medium bg-orange-100 text-orange-800">
                        ⏳ 分析未設定
                      </span>
                    </div>
                    <div className="text-sm font-medium text-gray-900 line-clamp-1">{post.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      <span className="mr-2">📅 {post.createdAt}</span>
                      <span className="text-gray-400">|</span>
                      <span className="ml-2">📊 分析データなし</span>
                    </div>
                  </div>
                </div>
                <div className="ml-3">
                  <a 
                    href={`/instagram/analytics?postId=${post.id}`}
                    className="inline-flex items-center px-3 py-1.5 bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 transition-colors"
                  >
                    分析する
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PostStats;
