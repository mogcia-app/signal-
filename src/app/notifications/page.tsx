"use client";

import React, { useState, useEffect } from "react";
import SNSLayout from "../../components/sns-layout";
import { Bell, AlertCircle, Clock, Tag, ChevronDown } from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { useAuth } from "../../contexts/auth-context";
import { auth } from "../../lib/firebase";

interface Notification {
  id: string;
  title: string;
  message: string;
  content?: string; // 詳細内容
  type: "info" | "warning" | "success" | "error";
  priority: "low" | "medium" | "high";
  targetUsers: string[];
  status: "draft" | "published" | "archived";
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

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  // const [currentSNS, setCurrentSNS] = useState<'instagram' | 'x' | 'tiktok' | 'youtube'>('instagram');
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());

  // SNS判定のuseEffect
  // useEffect(() => {
  //   const detectedSNS = getCurrentSNS();
  //   setCurrentSNS(detectedSNS);
  //
  //   console.log('🎯 お知らせページ - SNS判定:', {
  //     detectedSNS: detectedSNS,
  //     referrer: typeof window !== 'undefined' ? document.referrer : 'SSR',
  //     pathname: typeof window !== 'undefined' ? window.location.pathname : 'SSR'
  //   });
  // }, []);

  useEffect(() => {
    console.log("🔍 認証状態の変化を監視:", { user, uid: user?.uid });

    if (user?.uid) {
      // 通知データの初期化
      const unsubscribe = initializeNotifications();

      // クリーンアップ関数
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    } else {
      console.log("❌ ユーザーが認証されていないため、通知データを初期化しません");
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // フィルタリング処理
    filterNotifications();
  }, [notifications]); // eslint-disable-line react-hooks/exhaustive-deps

  // Firestoreのデータを適切な形式に変換
  const convertFirestoreData = (data: Record<string, unknown>): Notification => {
    return {
      ...data,
      id: data.id as string,
      title: data.title as string,
      message: data.message as string,
      type: data.type as "info" | "warning" | "success" | "error",
      priority: data.priority as "low" | "medium" | "high",
      targetUsers: data.targetUsers as string[],
      status: data.status as "draft" | "published" | "archived",
      createdAt:
        (data.createdAt as { toDate?: () => Date })?.toDate?.()?.toISOString() ||
        (data.createdAt as string),
      updatedAt:
        (data.updatedAt as { toDate?: () => Date })?.toDate?.()?.toISOString() ||
        (data.updatedAt as string),
      createdBy: data.createdBy as string,
      scheduledAt:
        (data.scheduledAt as { toDate?: () => Date })?.toDate?.()?.toISOString() ||
        (data.scheduledAt as string | undefined),
      expiresAt:
        (data.expiresAt as { toDate?: () => Date })?.toDate?.()?.toISOString() ||
        (data.expiresAt as string | undefined),
      read: data.read as boolean | undefined,
      starred: data.starred as boolean | undefined,
      content: data.content as string | undefined,
      category: data.category as string | undefined,
      tags: data.tags as string[] | undefined,
    };
  };

  const fetchNotifications = async () => {
    console.log("🔍 認証状態を確認:", { user, uid: user?.uid, isAuthenticated: !!user });

    if (!user?.uid) {
      console.log("❌ ユーザーが認証されていません");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Firebase認証トークンを取得
      const token = await auth.currentUser?.getIdToken();
      console.log("🔑 認証トークンを取得:", { hasToken: !!token });

      const params = new URLSearchParams({
        userId: user.uid,
      });

      const response = await fetch(`/api/notifications?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();

      if (result.success) {
        // Firestoreデータを変換
        const convertedData = result.data.map(convertFirestoreData);

        // ユーザーごとのアクション状態を取得
        const notificationsWithActions = await Promise.all(
          convertedData.map(async (notification: Notification) => {
            try {
              if (!user?.uid) {
                console.log("❌ アクション実行時: ユーザーが認証されていません");
                return notification;
              }

              // Firebase認証トークンを取得
              const token = await auth.currentUser?.getIdToken();
              const actionResponse = await fetch(
                `/api/notifications/${notification.id}/actions?userId=${user.uid}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                }
              );
              const actionResult = await actionResponse.json();

              return {
                ...notification,
                read: actionResult.success ? actionResult.data.read : false,
                starred: actionResult.success ? actionResult.data.starred : false,
              };
            } catch (error) {
              console.error("アクション状態取得エラー:", error);
              return {
                ...notification,
                read: false,
                starred: false,
              };
            }
          })
        );

        setNotifications(notificationsWithActions);
      } else {
        console.error("通知取得エラー:", result.error);
        setNotifications([]);
      }
    } catch (error) {
      console.error("通知取得エラー:", error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeNotifications = (): (() => void) | null => {
    fetchNotifications();

    // リアルタイムリスナーを設定
    return setupRealtimeListener();
  };

  const setupRealtimeListener = (): (() => void) | null => {
    try {
      const notificationsRef = collection(db, "notifications");
      const q = query(
        notificationsRef,
        where("status", "==", "published"),
        orderBy("createdAt", "desc")
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const realtimeNotifications = snapshot.docs.map((doc) => {
            const data = doc.data();
            return convertFirestoreData({
              id: doc.id,
              ...data,
            });
          });

          if (realtimeNotifications.length > 0) {
            // ユーザーごとのアクション状態を取得
            Promise.all(
              realtimeNotifications.map(async (notification) => {
                try {
                  if (!user?.uid) {
                    return {
                      ...notification,
                      read: false,
                      starred: false,
                    };
                  }

                  // Firebase認証トークンを取得
                  const token = await auth.currentUser?.getIdToken();
                  const actionResponse = await fetch(
                    `/api/notifications/${notification.id}/actions?userId=${user.uid}`,
                    {
                      headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                      },
                    }
                  );
                  const actionResult = await actionResponse.json();

                  return {
                    ...notification,
                    read: actionResult.success ? actionResult.data.read : false,
                    starred: actionResult.success ? actionResult.data.starred : false,
                  };
                } catch (error) {
                  console.error("アクション状態取得エラー:", error);
                  return {
                    ...notification,
                    read: false,
                    starred: false,
                  };
                }
              })
            ).then((notificationsWithActions) => {
              setNotifications(notificationsWithActions);
              setIsLoading(false);
            });
          } else {
            // データがない場合もローディングを終了
            setNotifications([]);
            setIsLoading(false);
          }
        },
        (error) => {
          console.error("リアルタイムリスナーエラー:", error);
          // エラーが発生した場合は通常のAPIを呼び出す
          fetchNotifications();
        }
      );

      // コンポーネントのアンマウント時にリスナーをクリーンアップ
      return unsubscribe;
    } catch (error) {
      console.error("リアルタイムリスナー設定エラー:", error);
      // エラーが発生した場合は通常のAPIを呼び出す
      fetchNotifications();
      return null;
    }
  };

  const filterNotifications = () => {
    let filtered = [...notifications];

    // 公開済みの通知のみを表示
    filtered = filtered.filter((notification) => notification.status === "published");

    // 作成日時でソート（新しい順）
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setFilteredNotifications(filtered);
  };

  const formatDate = (dateInput: string | Record<string, unknown>) => {
    if (!dateInput) {return "日付不明";}

    let date: Date;

    // FirestoreのTimestampオブジェクトの場合
    if (
      dateInput &&
      typeof dateInput === "object" &&
      "toDate" in dateInput &&
      typeof dateInput.toDate === "function"
    ) {
      date = dateInput.toDate();
    }
    // FirestoreのTimestampオブジェクト（seconds, nanoseconds）の場合
    else if (
      dateInput &&
      typeof dateInput === "object" &&
      "seconds" in dateInput &&
      typeof dateInput.seconds === "number"
    ) {
      date = new Date(dateInput.seconds * 1000);
    }
    // 文字列の場合
    else if (typeof dateInput === "string") {
      date = new Date(dateInput);
    }
    // その他の場合
    else {
      date = new Date(String(dateInput));
    }

    // Invalid Date チェック
    if (isNaN(date.getTime())) {
      console.warn("Invalid date:", dateInput);
      return "日付不明";
    }

    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {return "昨日";}
    if (diffDays <= 7) {return `${diffDays}日前`;}
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const markAsRead = async (notificationId: string) => {
    try {
      console.log("🔍 markAsRead開始:", { notificationId, userId: user?.uid });

      const response = await fetch(`/api/notifications/${notificationId}/actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "read",
          userId: user?.uid,
        }),
      });

      const result = await response.json();
      console.log("📊 markAsRead結果:", result);

      if (result.success) {
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === notificationId ? { ...notification, read: true } : notification
          )
        );

        // サイドバーの通知数を更新するためのカスタムイベントを発火
        console.log("📡 カスタムイベント発火: notificationRead");
        window.dispatchEvent(
          new CustomEvent("notificationRead", {
            detail: { notificationId },
          })
        );

        // 即座にサイドバーの未読数を更新（フォールバック）
        setTimeout(() => {
          console.log("🔄 フォールバック: サイドバー更新を強制実行");
          window.dispatchEvent(
            new CustomEvent("notificationRead", {
              detail: { notificationId },
            })
          );
        }, 100);
      } else {
        console.error("既読更新エラー:", result.error);
      }
    } catch (error) {
      console.error("既読更新エラー:", error);
    }
  };

  const toggleNotificationDetail = (notification: Notification) => {
    const newExpanded = new Set(expandedNotifications);
    if (newExpanded.has(notification.id)) {
      newExpanded.delete(notification.id);
    } else {
      newExpanded.add(notification.id);
      if (!notification.read) {
        markAsRead(notification.id);
      }
    }
    setExpandedNotifications(newExpanded);
  };

  if (isLoading) {
    return (
      <SNSLayout customTitle="お知らせ" customDescription="システムのお知らせと通知">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#FF8A15] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-black mb-2">お知らせを読み込み中...</h2>
            <p className="text-black">通知データを取得しています</p>
          </div>
        </div>
      </SNSLayout>
    );
  }

  return (
    <SNSLayout customTitle="お知らせ" customDescription="システムのお知らせ">
      <div className="max-w-7xl mx-auto p-6">
        {/* 統計情報 */}
        {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black">未読</p>
                  <p className="text-2xl font-bold text-black">{unreadCount}</p>
                </div>
                <Bell className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black">お気に入り</p>
                  <p className="text-2xl font-bold text-black">{starredCount}</p>
                </div>
                <Star className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black">総数</p>
                  <p className="text-2xl font-bold text-black">{filteredNotifications.length}</p>
                </div>
                <Info className="w-8 h-8 text-black" />
              </div>
            </div>
          </div> */}
      </div>

      {/* 通知一覧 */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-black mb-2">お知らせがありません</h3>
            <p className="text-black">
              {/* {selectedFilter === 'unread' && '未読のお知らせはありません'} */}
              {/* {selectedFilter === 'starred' && 'お気に入りのお知らせはありません'} */}
              {/* {selectedFilter === 'archived' && 'アーカイブされたお知らせはありません'} */}
              {/* {selectedFilter === 'all' && '現在表示できるお知らせはありません'} */}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            return (
              <div
                key={notification.id}
                className={`bg-white border-2 transition-all hover:shadow-lg ${
                  notification.read ? "" : "border-l-4 border-l-[#FF8A15]"
                } bg-orange-50 border-orange-200`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* 通知内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3
                            className={`text-xl font-semibold ${notification.read ? "text-gray-700" : "text-black"}`}
                          >
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <div className="w-3 h-3 bg-[#FF8A15] rounded-full"></div>
                          )}
                          <span
                            className={`px-3 py-1 text-sm font-medium rounded-full ${
                              notification.priority === "high" || notification.priority === "medium"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {notification.priority === "high" && "高優先度"}
                            {notification.priority === "medium" && "中優先度"}
                            {notification.priority === "low" && "低優先度"}
                          </span>
                          {notification.category && (
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                              {notification.category}
                            </span>
                          )}
                        </div>

                        <p
                          className={`text-black mb-4 text-lg ${notification.read ? "text-black" : "text-gray-700"}`}
                        >
                          {notification.message}
                        </p>

                        {/* タグ */}
                        {notification.tags && notification.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {notification.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full"
                              >
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-6 text-sm text-black">
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

                          {/* 詳細ボタン */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleNotificationDetail(notification);
                            }}
                            className="flex items-center space-x-1 text-[#FF8A15] hover:text-[#E67A0A] transition-colors px-3 py-1 rounded-md hover:bg-orange-50"
                          >
                            <span className="text-sm font-medium">
                              {expandedNotifications.has(notification.id)
                                ? "詳細を閉じる"
                                : "詳細を見る"}
                            </span>
                            <ChevronDown
                              className={`w-4 h-4 transition-transform ${expandedNotifications.has(notification.id) ? "rotate-180" : ""}`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 展開された詳細内容 */}
                {expandedNotifications.has(notification.id) && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 text-lg leading-relaxed">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </SNSLayout>
  );
}
