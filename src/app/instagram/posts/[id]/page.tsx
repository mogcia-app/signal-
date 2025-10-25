'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../contexts/auth-context';
import SNSLayout from '../../../../components/sns-layout';
import { Calendar, Clock, Image as ImageIcon, Heart, MessageCircle, Share, Eye as EyeIcon, ArrowLeft } from 'lucide-react';

interface PostData {
  id: string;
  userId: string;
  title: string;
  description: string;
  postType: 'feed' | 'reel' | 'story';
  scheduledDate: string;
  scheduledTime: string;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
  hashtags?: string[];
  analytics?: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
  };
}

export default function PostDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      if (!user?.uid || !id) return;

      try {
        const { auth } = await import('../../../../lib/firebase');
        const token = await auth.currentUser?.getIdToken();

        const response = await fetch(`/api/posts?userId=${user.uid}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-user-id': user.uid,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        const foundPost = result.posts.find((p: PostData) => p.id === id);

        if (foundPost) {
          setPost(foundPost);
        } else {
          setError('投稿が見つかりません');
        }
      } catch (err) {
        console.error('投稿取得エラー:', err);
        setError('投稿の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [user?.uid, id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  if (loading) {
    return (
      <SNSLayout customTitle="投稿詳細" customDescription="投稿の詳細情報を表示">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">読み込み中...</p>
          </div>
        </div>
      </SNSLayout>
    );
  }

  if (error || !post) {
    return (
      <SNSLayout customTitle="投稿詳細" customDescription="投稿の詳細情報を表示">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">エラー</h1>
            <p className="text-gray-600 mb-6">{error || '投稿が見つかりません'}</p>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              戻る
            </button>
          </div>
        </div>
      </SNSLayout>
    );
  }

  return (
    <SNSLayout customTitle="投稿詳細" customDescription="投稿の詳細情報を表示">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* ヘッダー */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            投稿一覧に戻る
          </button>
          <h1 className="text-2xl font-bold text-gray-900">投稿詳細</h1>
        </div>

        {/* 投稿カード */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* 画像 */}
          {post.imageUrl && (
            <div className="aspect-video bg-gray-100 relative">
              <ImageIcon className="w-16 h-16 text-gray-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
          )}

          {/* コンテンツ */}
          <div className="p-6">
            {/* タイトル */}
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{post.title}</h2>

            {/* 説明 */}
            <p className="text-gray-700 mb-4 leading-relaxed">{post.description}</p>

            {/* 投稿タイプ */}
            <div className="mb-4">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                post.postType === 'feed' ? 'bg-blue-100 text-blue-800' :
                post.postType === 'reel' ? 'bg-purple-100 text-purple-800' :
                'bg-pink-100 text-pink-800'
              }`}>
                {post.postType === 'feed' ? 'フィード' : 
                 post.postType === 'reel' ? 'リール' : 'ストーリー'}
              </span>
            </div>

            {/* ハッシュタグ */}
            {post.hashtags && post.hashtags.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {post.hashtags.map((tag, index) => (
                    <span key={index} className="text-blue-600 text-sm">#{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* スケジュール情報 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center text-gray-600">
                <Calendar size={16} className="mr-2" />
                <span className="text-sm">投稿予定日: {formatDate(post.scheduledDate)}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Clock size={16} className="mr-2" />
                <span className="text-sm">投稿予定時刻: {formatTime(post.scheduledTime)}</span>
              </div>
            </div>

            {/* 分析データ */}
            {post.analytics && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">分析データ</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {post.analytics.likes !== undefined && (
                    <div className="text-center">
                      <Heart size={20} className="text-red-500 mx-auto mb-1" />
                      <div className="text-sm text-gray-600">いいね</div>
                      <div className="font-semibold text-gray-900">{post.analytics.likes}</div>
                    </div>
                  )}
                  {post.analytics.comments !== undefined && (
                    <div className="text-center">
                      <MessageCircle size={20} className="text-blue-500 mx-auto mb-1" />
                      <div className="text-sm text-gray-600">コメント</div>
                      <div className="font-semibold text-gray-900">{post.analytics.comments}</div>
                    </div>
                  )}
                  {post.analytics.shares !== undefined && (
                    <div className="text-center">
                      <Share size={20} className="text-green-500 mx-auto mb-1" />
                      <div className="text-sm text-gray-600">シェア</div>
                      <div className="font-semibold text-gray-900">{post.analytics.shares}</div>
                    </div>
                  )}
                  {post.analytics.views !== undefined && (
                    <div className="text-center">
                      <EyeIcon size={20} className="text-purple-500 mx-auto mb-1" />
                      <div className="text-sm text-gray-600">表示回数</div>
                      <div className="font-semibold text-gray-900">{post.analytics.views}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* メタ情報 */}
            <div className="border-t pt-4 mt-6">
              <div className="text-sm text-gray-500 space-y-1">
                <div>作成日: {formatDate(post.createdAt)}</div>
                <div>更新日: {formatDate(post.updatedAt)}</div>
                <div>投稿ID: {post.id}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SNSLayout>
  );
}
