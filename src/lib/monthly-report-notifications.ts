import { db } from "./firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";

export interface MonthlyReportNotification {
  title: string;
  message: string;
  type: "success" | "info" | "warning" | "error";
  priority: "low" | "medium" | "high";
  targetUsers: string[];
  status: "draft" | "published" | "archived";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  category?: string;
  tags?: string[];
  data?: {
    reportType: "monthly";
    dataCount: number;
    userId: string;
    reportUrl: string;
  };
}

/**
 * 月次レポート用の通知を作成
 */
export async function createMonthlyReportNotification(
  userId: string,
  dataCount: number,
  reportUrl: string = "/instagram/monthly-report"
): Promise<void> {
  try {
    console.log("📊 月次レポート通知作成開始:", { userId, dataCount, reportUrl });

    const notificationData: Omit<MonthlyReportNotification, "id"> = {
      title: "月次レポートが利用可能になりました！",
      message: `投稿データが${dataCount}件に達しました。詳細な月次レポートをご確認いただけます。`,
      type: "success",
      priority: "high",
      targetUsers: [userId],
      status: "published",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
      category: "monthly-report",
      tags: ["report", "analytics", "monthly"],
      data: {
        reportType: "monthly",
        dataCount,
        userId,
        reportUrl,
      },
    };

    // Firestoreに通知を保存
    await addDoc(collection(db, "notifications"), notificationData);

    console.log("✅ 月次レポート通知作成完了");
  } catch (error) {
    console.error("❌ 月次レポート通知作成エラー:", error);
    throw error;
  }
}

/**
 * ユーザーの投稿データ件数をチェック
 */
export async function checkUserDataCount(userId: string): Promise<{
  analyticsCount: number;
  postsCount: number;
  totalCount: number;
}> {
  try {
    console.log("🔍 ユーザーデータ件数チェック開始:", { userId });

    // アナリティクスデータの件数を取得
    const analyticsRef = collection(db, "analytics");
    const analyticsQuery = query(analyticsRef, where("userId", "==", userId));
    const analyticsSnapshot = await getDocs(analyticsQuery);
    const analyticsCount = analyticsSnapshot.docs.length;

    // 投稿データの件数を取得
    const postsRef = collection(db, "posts");
    const postsQuery = query(postsRef, where("userId", "==", userId));
    const postsSnapshot = await getDocs(postsQuery);
    const postsCount = postsSnapshot.docs.length;

    const totalCount = analyticsCount + postsCount;

    console.log("📊 データ件数チェック結果:", {
      analyticsCount,
      postsCount,
      totalCount,
    });

    return {
      analyticsCount,
      postsCount,
      totalCount,
    };
  } catch (error) {
    console.error("❌ データ件数チェックエラー:", error);
    throw error;
  }
}

/**
 * 月次レポート通知が必要かチェック
 */
export async function shouldCreateMonthlyReportNotification(
  userId: string,
  minDataCount: number = 15
): Promise<{
  shouldCreate: boolean;
  dataCount: number;
  hasExistingNotification: boolean;
}> {
  try {
    console.log("🔍 月次レポート通知必要性チェック開始:", { userId, minDataCount });

    // データ件数をチェック
    const { totalCount } = await checkUserDataCount(userId);

    // 既存の月次レポート通知があるかチェック
    const notificationsRef = collection(db, "notifications");
    const notificationQuery = query(
      notificationsRef,
      where("targetUsers", "array-contains", userId),
      where("category", "==", "monthly-report"),
      where("status", "==", "published")
    );
    const notificationSnapshot = await getDocs(notificationQuery);
    const hasExistingNotification = notificationSnapshot.docs.length > 0;

    const shouldCreate = totalCount >= minDataCount && !hasExistingNotification;

    console.log("📊 通知必要性チェック結果:", {
      shouldCreate,
      dataCount: totalCount,
      hasExistingNotification,
      minDataCount,
    });

    return {
      shouldCreate,
      dataCount: totalCount,
      hasExistingNotification,
    };
  } catch (error) {
    console.error("❌ 通知必要性チェックエラー:", error);
    throw error;
  }
}

/**
 * データ保存時に月次レポート通知をチェック・作成
 */
export async function checkAndCreateMonthlyReportNotification(
  userId: string,
  minDataCount: number = 15
): Promise<boolean> {
  try {
    console.log("🔍 月次レポート通知自動チェック開始:", { userId, minDataCount });

    const { shouldCreate, dataCount } = await shouldCreateMonthlyReportNotification(
      userId,
      minDataCount
    );

    if (shouldCreate) {
      await createMonthlyReportNotification(userId, dataCount);
      console.log("✅ 月次レポート通知を自動作成しました");
      return true;
    } else {
      console.log("ℹ️ 月次レポート通知は不要です");
      return false;
    }
  } catch (error) {
    console.error("❌ 月次レポート通知自動チェックエラー:", error);
    return false;
  }
}
