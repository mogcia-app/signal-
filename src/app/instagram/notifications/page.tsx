'use client';

import React, { useState, useEffect } from 'react';
import SNSLayout from '../../../components/sns-layout';
import { AIChatWidget } from '../../../components/ai-chat-widget';
import { 
  Bell, 
  AlertCircle, 
  CheckCircle, 
  Info, 
  AlertTriangle,
  Clock,
  Search,
  Archive,
  Eye,
  Star,
  StarOff
} from 'lucide-react';
import { db } from '../../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

interface Notification {
  id: string;
  title: string;
  message: string;
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
}

export default function InstagramNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | 'starred' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // モックデータの初期化
    const unsubscribe = initializeMockNotifications();
    
    // クリーンアップ関数
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // フィルタリング処理
    filterNotifications();
  }, [notifications, selectedFilter, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // フィルタや検索が変更されたときにAPIを再呼び出し
  useEffect(() => {
    if (selectedFilter !== 'all' || searchQuery.trim()) {
      fetchNotifications();
    }
  }, [selectedFilter, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        userId: 'current-user',
        filter: selectedFilter,
        ...(searchQuery && { search: searchQuery })
      });

      const response = await fetch(`/api/notifications?${params}`);
      const result = await response.json();

      if (result.success) {
        // ユーザーごとのアクション状態を取得
        const notificationsWithActions = await Promise.all(
          result.data.map(async (notification: Notification) => {
            try {
              const actionResponse = await fetch(`/api/notifications/${notification.id}/actions?userId=current-user`);
              const actionResult = await actionResponse.json();
              
              return {
                ...notification,
                read: actionResult.success ? actionResult.data.read : false,
                starred: actionResult.success ? actionResult.data.starred : false
              };
            } catch (error) {
              console.error('アクション状態取得エラー:', error);
              return {
                ...notification,
                read: false,
                starred: false
              };
            }
          })
        );

        setNotifications(notificationsWithActions);
      } else {
        console.error('通知取得エラー:', result.error);
        setNotifications([]);
      }
    } catch (error) {
      console.error('通知取得エラー:', error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeMockNotifications = (): (() => void) | null => {
    fetchNotifications();
    
    // リアルタイムリスナーを設定
    return setupRealtimeListener();
  };

  const setupRealtimeListener = (): (() => void) | null => {
    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('status', '==', 'published'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const realtimeNotifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Notification));

        if (realtimeNotifications.length > 0) {
          // ユーザーごとのアクション状態を取得
          Promise.all(
            realtimeNotifications.map(async (notification) => {
              try {
                const actionResponse = await fetch(`/api/notifications/${notification.id}/actions?userId=current-user`);
                const actionResult = await actionResponse.json();
                
                return {
                  ...notification,
                  read: actionResult.success ? actionResult.data.read : false,
                  starred: actionResult.success ? actionResult.data.starred : false
                };
              } catch (error) {
                console.error('アクション状態取得エラー:', error);
                return {
                  ...notification,
                  read: false,
                  starred: false
                };
              }
            })
          ).then(notificationsWithActions => {
            setNotifications(notificationsWithActions);
            setIsLoading(false);
          });
        }
      }, (error) => {
        console.error('リアルタイムリスナーエラー:', error);
        // エラーが発生した場合は通常のAPIを呼び出す
        fetchNotifications();
      });

      // コンポーネントのアンマウント時にリスナーをクリーンアップ
      return unsubscribe;
    } catch (error) {
      console.error('リアルタイムリスナー設定エラー:', error);
      // エラーが発生した場合は通常のAPIを呼び出す
      fetchNotifications();
      return null;
    }
  };

  const filterNotifications = () => {
    let filtered = [...notifications];

    // ステータスフィルタ
    if (selectedFilter === 'unread') {
      filtered = filtered.filter(notification => !notification.read);
    } else if (selectedFilter === 'starred') {
      filtered = filtered.filter(notification => notification.starred);
    } else if (selectedFilter === 'archived') {
      filtered = filtered.filter(notification => notification.status === 'archived');
    } else {
      filtered = filtered.filter(notification => notification.status === 'published');
    }

    // 検索フィルタ
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(notification => 
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query)
      );
    }

    // 作成日時でソート（新しい順）
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setFilteredNotifications(filtered);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-600" />;
      default: return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'error': return 'bg-red-50 border-red-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '昨日';
    if (diffDays <= 7) return `${diffDays}日前`;
    return date.toLocaleDateString('ja-JP', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'read',
          userId: 'current-user'
        }),
      });

      const result = await response.json();

      if (result.success) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, read: true }
              : notification
          )
        );
      } else {
        console.error('既読更新エラー:', result.error);
      }
    } catch (error) {
      console.error('既読更新エラー:', error);
    }
  };

  const toggleStar = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'star',
          userId: 'current-user'
        }),
      });

      const result = await response.json();

      if (result.success) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, starred: result.data.starred }
              : notification
          )
        );
      } else {
        console.error('お気に入り更新エラー:', result.error);
      }
    } catch (error) {
      console.error('お気に入り更新エラー:', error);
    }
  };

  const archiveNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'archive',
          userId: 'current-user'
        }),
      });

      const result = await response.json();

      if (result.success) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, status: 'archived' as const }
              : notification
          )
        );
      } else {
        console.error('アーカイブ更新エラー:', result.error);
      }
    } catch (error) {
      console.error('アーカイブ更新エラー:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read && n.status === 'published').length;
  const starredCount = notifications.filter(n => n.starred && n.status === 'published').length;

  if (isLoading) {
    return (
      <SNSLayout 
        currentSNS="instagram"
        customTitle="お知らせ"
        customDescription="システムのお知らせと通知"
      >
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">お知らせを読み込み中...</h2>
            <p className="text-gray-600">通知データを取得しています</p>
          </div>
        </div>
      </SNSLayout>
    );
  }

  return (
    <SNSLayout 
      currentSNS="instagram"
      customTitle="お知らせ"
      customDescription="システムのお知らせと通知"
    >
      <div className="max-w-4xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Bell className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">お知らせ</h1>
              <p className="text-gray-600">システムのお知らせと重要な通知</p>
            </div>
          </div>

          {/* 統計情報 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">未読</p>
                  <p className="text-2xl font-bold text-gray-900">{unreadCount}</p>
                </div>
                <Bell className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">お気に入り</p>
                  <p className="text-2xl font-bold text-gray-900">{starredCount}</p>
                </div>
                <Star className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">総数</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredNotifications.length}</p>
                </div>
                <Info className="w-8 h-8 text-gray-600" />
              </div>
            </div>
          </div>

          {/* フィルターと検索 */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* フィルター */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {[
                { id: 'all', label: 'すべて', count: notifications.filter(n => n.status === 'published').length },
                { id: 'unread', label: '未読', count: unreadCount },
                { id: 'starred', label: 'お気に入り', count: starredCount },
                { id: 'archived', label: 'アーカイブ', count: notifications.filter(n => n.status === 'archived').length }
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter.id as 'all' | 'unread' | 'starred' | 'archived')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedFilter === filter.id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span>{filter.label}</span>
                  {filter.count > 0 && (
                    <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-xs">
                      {filter.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* 検索 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="お知らせを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* 通知一覧 */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">お知らせがありません</h3>
              <p className="text-gray-600">
                {selectedFilter === 'unread' && '未読のお知らせはありません'}
                {selectedFilter === 'starred' && 'お気に入りのお知らせはありません'}
                {selectedFilter === 'archived' && 'アーカイブされたお知らせはありません'}
                {selectedFilter === 'all' && '現在表示できるお知らせはありません'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-lg border-2 p-6 transition-all hover:shadow-md ${
                  notification.read ? '' : 'border-l-4 border-l-blue-500'
                } ${getNotificationBgColor(notification.type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {/* 通知アイコン */}
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* 通知内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className={`text-lg font-semibold ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(notification.priority)}`}>
                          {notification.priority === 'high' && '高'}
                          {notification.priority === 'medium' && '中'}
                          {notification.priority === 'low' && '低'}
                        </span>
                      </div>

                      <p className={`text-gray-600 mb-3 ${notification.read ? 'text-gray-500' : 'text-gray-700'}`}>
                        {notification.message}
                      </p>

                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(notification.createdAt)}</span>
                        </div>
                        {notification.expiresAt && (
                          <div className="flex items-center space-x-1">
                            <AlertCircle className="w-4 h-4" />
                            <span>期限: {formatDate(notification.expiresAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex items-center space-x-2 ml-4">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="既読にする"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => toggleStar(notification.id)}
                      className={`p-2 transition-colors ${
                        notification.starred 
                          ? 'text-yellow-500 hover:text-yellow-600' 
                          : 'text-gray-400 hover:text-yellow-500'
                      }`}
                      title={notification.starred ? 'お気に入りを解除' : 'お気に入りに追加'}
                    >
                      {notification.starred ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                    </button>

                    {notification.status === 'published' && (
                      <button
                        onClick={() => archiveNotification(notification.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="アーカイブ"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* AIチャットウィジェット */}
        <AIChatWidget 
          contextData={{
            notifications: notifications,
            selectedFilter: selectedFilter
          }}
        />
      </div>
    </SNSLayout>
  );
}
