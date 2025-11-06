import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  priority: "low" | "medium" | "high";
  targetUsers: string[];
  status: "draft" | "published" | "archived";
  scheduledAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// モックデータは削除し、Firestoreの実データのみを使用

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: notificationId } = await params;
    // const userId = request.nextUrl.searchParams.get('userId') || 'current-user';

    // Firestoreから取得
    const docRef = doc(db, "notifications", notificationId);
    const docSnap = await getDoc(docRef);

    let notification: Notification | undefined;

    if (docSnap.exists()) {
      notification = {
        id: docSnap.id,
        ...docSnap.data(),
      } as Notification;
    } else {
      // Firestoreにデータがない場合はnullを返す
      notification = undefined;
    }

    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          error: "通知が見つかりません",
        },
        { status: 404 }
      );
    }

    // 実際の実装では、ユーザーごとの既読状態やお気に入り状態も取得
    // const userNotificationRef = doc(db, 'userNotifications', `${userId}_${notificationId}`);
    // const userNotificationSnap = await getDoc(userNotificationRef);

    return NextResponse.json({
      success: true,
      data: {
        ...notification,
        read: false, // 実際の実装では userNotificationSnap.data()?.read || false
        starred: false, // 実際の実装では userNotificationSnap.data()?.starred || false
      },
    });
  } catch (error) {
    console.error("通知取得エラー:", error);
    return NextResponse.json(
      {
        success: false,
        error: "通知の取得に失敗しました",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: notificationId } = await params;
    const body = await request.json();
    const { title, message, type, priority, targetUsers, status } = body;

    // Firestoreで更新
    const docRef = doc(db, "notifications", notificationId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        {
          success: false,
          error: "通知が見つかりません",
        },
        { status: 404 }
      );
    }

    await updateDoc(docRef, {
      title: title || docSnap.data().title,
      message: message || docSnap.data().message,
      type: type || docSnap.data().type,
      priority: priority || docSnap.data().priority,
      targetUsers: targetUsers || docSnap.data().targetUsers,
      status: status || docSnap.data().status,
      updatedAt: new Date().toISOString(),
    });

    // 更新されたデータを取得
    const updatedDocSnap = await getDoc(docRef);
    const updatedNotification = {
      id: updatedDocSnap.id,
      ...updatedDocSnap.data(),
    } as Notification;

    return NextResponse.json({
      success: true,
      data: updatedNotification,
      message: "通知が更新されました",
    });
  } catch (error) {
    console.error("通知更新エラー:", error);
    return NextResponse.json(
      {
        success: false,
        error: "通知の更新に失敗しました",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notificationId } = await params;

    // Firestoreから削除
    const docRef = doc(db, "notifications", notificationId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        {
          success: false,
          error: "通知が見つかりません",
        },
        { status: 404 }
      );
    }

    await deleteDoc(docRef);

    return NextResponse.json({
      success: true,
      message: "通知が削除されました",
    });
  } catch (error) {
    console.error("通知削除エラー:", error);
    return NextResponse.json(
      {
        success: false,
        error: "通知の削除に失敗しました",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
