'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../contexts/auth-context';
import SNSLayout from '../../../../components/sns-layout';
import { Calendar, Clock, Image as ImageIcon, Heart, MessageCircle, Share, Eye as EyeIcon, ArrowLeft } from 'lucide-react';

interface PostData {
  id: string;
  userId: string;
  title: string;
  content: string;
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
    reach?: number;
    engagementRate?: number;
    publishedAt?: Date;
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
          {/* サムネ画像 */}
          {post.imageUrl ? (
            <div className="aspect-video bg-gray-100 relative overflow-hidden">
              <Image
                src={post.imageUrl}
                alt={post.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          ) : (
            <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 relative flex items-center justify-center">
              <div className="text-center">
                <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">画像なし</p>
              </div>
            </div>
          )}

          {/* コンテンツ */}
          <div className="p-6">
            {/* タイトル */}
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{post.title}</h2>

            {/* 投稿文全文 */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">投稿文</h3>
              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{post.content}</p>
              </div>
            </div>

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
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">ハッシュタグ</h3>
                <div className="flex flex-wrap gap-2">
                  {post.hashtags.map((tag, index) => (
                    <span key={index} className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-100 transition-colors">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* スケジュール情報 */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">スケジュール情報</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center text-gray-700">
                    <Calendar size={18} className="mr-3 text-blue-500" />
                    <div>
                      <div className="text-sm text-gray-500">投稿予定日</div>
                      <div className="font-medium">{formatDate(post.scheduledDate)}</div>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Clock size={18} className="mr-3 text-green-500" />
                    <div>
                      <div className="text-sm text-gray-500">投稿予定時刻</div>
                      <div className="font-medium">{formatTime(post.scheduledTime)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 分析データ */}
            {post.analytics && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">分析データ</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {post.analytics.likes !== undefined && (
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <Heart size={24} className="text-red-500 mx-auto mb-2" />
                        <div className="text-sm text-gray-600 mb-1">いいね</div>
                        <div className="text-xl font-bold text-gray-900">{post.analytics.likes.toLocaleString()}</div>
                      </div>
                    )}
                    {post.analytics.comments !== undefined && (
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <MessageCircle size={24} className="text-blue-500 mx-auto mb-2" />
                        <div className="text-sm text-gray-600 mb-1">コメント</div>
                        <div className="text-xl font-bold text-gray-900">{post.analytics.comments.toLocaleString()}</div>
                      </div>
                    )}
                    {post.analytics.shares !== undefined && (
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <Share size={24} className="text-green-500 mx-auto mb-2" />
                        <div className="text-sm text-gray-600 mb-1">シェア</div>
                        <div className="text-xl font-bold text-gray-900">{post.analytics.shares.toLocaleString()}</div>
                      </div>
                    )}
                    {post.analytics.reach !== undefined && (
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <EyeIcon size={24} className="text-purple-500 mx-auto mb-2" />
                        <div className="text-sm text-gray-600 mb-1">リーチ</div>
                        <div className="text-xl font-bold text-gray-900">{post.analytics.reach.toLocaleString()}</div>
                      </div>
                    )}
                    {post.analytics.engagementRate !== undefined && (
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <div className="w-6 h-6 bg-orange-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">%</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-1">エンゲージメント率</div>
                        <div className="text-xl font-bold text-gray-900">{post.analytics.engagementRate.toFixed(1)}%</div>
                      </div>
                    )}
                    {post.analytics.publishedAt && (
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <Calendar size={24} className="text-indigo-500 mx-auto mb-2" />
                        <div className="text-sm text-gray-600 mb-1">投稿日時</div>
                        <div className="text-sm font-bold text-gray-900">
                          {new Date(post.analytics.publishedAt).toLocaleDateString('ja-JP')}
                        </div>
                        <div className="text-xs text-gray-600">
                          {new Date(post.analytics.publishedAt).toLocaleTimeString('ja-JP', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* メタ情報 */}
            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">メタ情報</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">作成日:</span>
                    <span className="ml-2 font-medium text-gray-700">{formatDate(post.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">更新日:</span>
                    <span className="ml-2 font-medium text-gray-700">{formatDate(post.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SNSLayout>
  );
}
