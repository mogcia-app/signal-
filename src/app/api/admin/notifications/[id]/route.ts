import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../lib/firebase";
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

// 管理者用の通知詳細取得
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: notificationId } = await params;

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

    const notification = {
      id: docSnap.id,
      ...docSnap.data(),
    } as Notification;

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error("管理者通知取得エラー:", error);
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

// 管理者用の通知更新
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: notificationId } = await params;
    const body = await request.json();
    const { title, message, type, priority, targetUsers, status, scheduledAt, expiresAt } = body;

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

    const updateData: Partial<Notification> = {
      updatedAt: new Date().toISOString(),
    };

    if (title !== undefined) {updateData.title = title;}
    if (message !== undefined) {updateData.message = message;}
    if (type !== undefined) {updateData.type = type;}
    if (priority !== undefined) {updateData.priority = priority;}
    if (targetUsers !== undefined) {updateData.targetUsers = targetUsers;}
    if (status !== undefined) {updateData.status = status;}
    if (scheduledAt !== undefined) {updateData.scheduledAt = scheduledAt;}
    if (expiresAt !== undefined) {updateData.expiresAt = expiresAt;}

    await updateDoc(docRef, updateData);

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
    console.error("管理者通知更新エラー:", error);
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

// 管理者用の通知削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notificationId } = await params;

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
    console.error("管理者通知削除エラー:", error);
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
