'use client';

import React, { useState, useEffect } from 'react';
import SNSLayout from '../../components/sns-layout';
import { AIChatWidget } from '../../components/ai-chat-widget';
import { 
  Bell, 
  AlertCircle, 
  CheckCircle, 
  Info, 
  AlertTriangle,
  Clock,
  Search,
  Star,
  StarOff,
  ChevronDown,
  X,
  Tag
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../contexts/auth-context';

interface Notification {
  id: string;
  title: string;
  message: string;
  content?: string; // 詳細内容
  type: 'info' | 'warning' | 'success' | 'error';
  priority: 'low' | 'medium' | 'high';
  targetUsers: string[];
  status: 'draft' | 'published' | 'archived';
  scheduledAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  read?: boolean;
  starred?: boolean;
  category?: string; // カテゴリ
  tags?: string[]; // タグ
}

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

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentSNS, setCurrentSNS] = useState<'instagram' | 'x' | 'youtube' | 'tiktok'>('instagram');

  // URLからSNSを判定して設定
  useEffect(() => {
    const sns = getCurrentSNSFromURL();
    setCurrentSNS(sns);
  }, []);

  // 通知データを取得
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // 通知データを取得するクエリ
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('targetUsers', 'array-contains', user.uid),
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const notificationData: Notification[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          notificationData.push({
            id: doc.id,
            title: data.title || '',
            message: data.message || '',
            content: data.content || '',
            type: data.type || 'info',
            priority: data.priority || 'medium',
            targetUsers: data.targetUsers || [],
            status: data.status || 'published',
            scheduledAt: data.scheduledAt || '',
            expiresAt: data.expiresAt || '',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            createdBy: data.createdBy || '',
            read: data.read || false,
            starred: data.starred || false,
            category: data.category || '',
            tags: data.tags || []
          });
        });

        setNotifications(notificationData);
        setLoading(false);
      },
      (err) => {
        console.error('通知データの取得エラー:', err);
        setError('通知データの取得に失敗しました');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // 通知を既読にする関数
  const markAsRead = async (notificationId: string) => {
    try {
      const { updateDoc, doc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('既読更新エラー:', error);
    }
  };

  // 通知をスター付きにする関数
  const toggleStar = async (notificationId: string, currentStarred: boolean) => {
    try {
      const { updateDoc, doc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'notifications', notificationId), {
        starred: !currentStarred,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('スター更新エラー:', error);
    }
  };

  // フィルタリングされた通知を取得
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || notification.type === filterType;
    const matchesPriority = filterPriority === 'all' || notification.priority === filterPriority;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'read' && notification.read) ||
                         (filterStatus === 'unread' && !notification.read) ||
                         (filterStatus === 'starred' && notification.starred);

    return matchesSearch && matchesType && matchesPriority && matchesStatus;
  });

  // 通知タイプのアイコンを取得
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  // 通知タイプの色を取得
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'error': return 'bg-red-50 border-red-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  // 優先度の色を取得
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // 通知詳細モーダルを開く
  const openNotificationModal = (notification: Notification) => {
    setSelectedNotification(notification);
    setShowModal(true);
    
    // 未読の場合は既読にする
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  if (loading) {
    return (
      <SNSLayout currentSNS={currentSNS} customTitle="お知らせ" customDescription="システムからのお知らせを確認できます">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">お知らせを読み込み中...</p>
          </div>
        </div>
      </SNSLayout>
    );
  }

  if (error) {
    return (
      <SNSLayout currentSNS={currentSNS} customTitle="お知らせ" customDescription="システムからのお知らせを確認できます">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">エラーが発生しました</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              再読み込み
            </button>
          </div>
        </div>
      </SNSLayout>
    );
  }

  return (
    <SNSLayout currentSNS={currentSNS} customTitle="お知らせ" customDescription="システムからのお知らせを確認できます">
      <div className="max-w-4xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">お知らせ</h1>
          <p className="text-gray-600">システムからの重要な情報やアップデートをお知らせします</p>
        </div>

        {/* 検索・フィルター */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* 検索 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="お知らせを検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* フィルターボタン */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
            >
              <span>フィルター</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* フィルターオプション */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* タイプフィルター */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">タイプ</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">すべて</option>
                    <option value="info">情報</option>
                    <option value="success">成功</option>
                    <option value="warning">警告</option>
                    <option value="error">エラー</option>
                  </select>
                </div>

                {/* 優先度フィルター */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">優先度</label>
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">すべて</option>
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                </div>

                {/* ステータスフィルター */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ステータス</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">すべて</option>
                    <option value="unread">未読</option>
                    <option value="read">既読</option>
                    <option value="starred">スター付き</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* お知らせ一覧 */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">お知らせがありません</h3>
              <p className="text-gray-600">
                {searchTerm || filterType !== 'all' || filterPriority !== 'all' || filterStatus !== 'all'
                  ? '検索条件に一致するお知らせが見つかりませんでした'
                  : '新しいお知らせはまだありません'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow cursor-pointer ${
                  notification.read ? 'opacity-75' : ''
                } ${getTypeColor(notification.type)}`}
                onClick={() => openNotificationModal(notification)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getTypeIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                        )}
                        {notification.starred && (
                          <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(notification.createdAt).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(notification.priority)}`}>
                          {notification.priority === 'high' ? '高' : notification.priority === 'medium' ? '中' : '低'}
                        </span>
                        {notification.category && (
                          <div className="flex items-center space-x-1">
                            <Tag className="w-3 h-3" />
                            <span>{notification.category}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStar(notification.id, notification.starred || false);
                      }}
                      className={`p-1 rounded hover:bg-gray-100 ${
                        notification.starred ? 'text-yellow-500' : 'text-gray-400'
                      }`}
                    >
                      {notification.starred ? <Star className="w-4 h-4" /> : <StarOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 通知詳細モーダル */}
      {showModal && selectedNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getTypeIcon(selectedNotification.type)}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedNotification.title}
                    </h2>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedNotification.priority)}`}>
                        {selectedNotification.priority === 'high' ? '高優先度' : selectedNotification.priority === 'medium' ? '中優先度' : '低優先度'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(selectedNotification.createdAt).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="prose max-w-none">
                <p className="text-gray-700 mb-4">{selectedNotification.message}</p>
                {selectedNotification.content && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="whitespace-pre-wrap text-gray-700">
                      {selectedNotification.content}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    toggleStar(selectedNotification.id, selectedNotification.starred || false);
                  }}
                  className={`px-4 py-2 rounded-lg border ${
                    selectedNotification.starred
                      ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700'
                  } hover:bg-opacity-80`}
                >
                  {selectedNotification.starred ? (
                    <div className="flex items-center space-x-2">
                      <Star className="w-4 h-4" />
                      <span>スターを外す</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <StarOff className="w-4 h-4" />
                      <span>スターを付ける</span>
                    </div>
                  )}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AIチャットウィジェット */}
      <AIChatWidget />
    </SNSLayout>
  );
}
