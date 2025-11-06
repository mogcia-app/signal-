import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

// 既存のanalyticsデータにpublishedTimeフィールドを追加
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "userIdが必要です" }, { status: 400 });
    }

    // ユーザーのanalyticsデータを取得
    const q = query(collection(db, "analytics"), where("userId", "==", userId));

    const snapshot = await getDocs(q);
    const updates = [];

    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();

      // publishedTimeフィールドがない場合のみ更新
      if (!data.publishedTime && data.publishedAt) {
        // publishedAtから時間を抽出してpublishedTimeフィールドを追加
        const publishedAt = data.publishedAt.toDate();
        const hours = publishedAt.getHours().toString().padStart(2, "0");
        const minutes = publishedAt.getMinutes().toString().padStart(2, "0");
        const publishedTime = `${hours}:${minutes}`;

        await updateDoc(doc(db, "analytics", docSnapshot.id), {
          publishedTime: publishedTime,
        });

        updates.push({
          id: docSnapshot.id,
          publishedAt: data.publishedAt.toDate().toISOString(),
          publishedTime: publishedTime,
        });
      }
    }

    return NextResponse.json({
      message: `${updates.length}件のデータを更新しました`,
      updates: updates,
    });
  } catch (error) {
    console.error("publishedTime更新エラー:", error);
    return NextResponse.json({ error: "データ更新に失敗しました" }, { status: 500 });
  }
}
