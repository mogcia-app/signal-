import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import * as admin from "firebase-admin";

interface FollowerCount {
  userId: string;
  snsType: "instagram" | "x" | "tiktok";
  followers: number; // 投稿に紐づかないフォロワー増加数（/homeで入力された値）
  startFollowers?: number; // 月初のフォロワー数（オプション、使用しない）
  month: string; // YYYY-MM形式
  source: "manual" | "onboarding"; // 手動入力 or オンボーディング
  profileVisits?: number; // プロフィールへのアクセス数（投稿に紐づかない全体の数値）
  externalLinkTaps?: number; // 外部リンクタップ数（投稿に紐づかない全体の数値）
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

// フォロワー数を取得（最新のもの、または指定月のもの）
export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "follower-counts-get", limit: 30, windowSeconds: 60 },
      auditEventName: "follower_counts_get",
    });

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // YYYY-MM形式（オプション）
    const snsType = searchParams.get("snsType") || "instagram";

    let query = adminDb
      .collection("follower_counts")
      .where("userId", "==", uid)
      .where("snsType", "==", snsType);

    if (month) {
      query = query.where("month", "==", month);
    }

    const snapshot = await query.orderBy("updatedAt", "desc").limit(1).get();

    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    return NextResponse.json({
      success: true,
      data: {
        id: doc.id,
        userId: data.userId,
        snsType: data.snsType,
        followers: data.followers,
        startFollowers: data.startFollowers || data.followers,
        month: data.month,
        source: data.source,
        profileVisits: data.profileVisits || 0,
        externalLinkTaps: data.externalLinkTaps || 0,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      },
    });
  } catch (error) {
    console.error("❌ フォロワー数取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(
      {
        ...body,
        error: "フォロワー数の取得に失敗しました",
      },
      { status }
    );
  }
}

// フォロワー数を保存・更新
export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "follower-counts-post", limit: 10, windowSeconds: 60 },
      auditEventName: "follower_counts_post",
    });

    const body = await request.json();
    const { followers, month, snsType = "instagram", source = "manual", profileVisits, externalLinkTaps } = body;

    if (!followers || typeof followers !== "number" || followers < 0) {
      return NextResponse.json(
        { error: "フォロワー数は0以上の数値である必要があります" },
        { status: 400 }
      );
    }

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "monthはYYYY-MM形式である必要があります" },
        { status: 400 }
      );
    }

    const now = admin.firestore.Timestamp.now();

    // 同じ月のデータが既に存在するか確認
    const existingSnapshot = await adminDb
      .collection("follower_counts")
      .where("userId", "==", uid)
      .where("snsType", "==", snsType)
      .where("month", "==", month)
      .limit(1)
      .get();

    let docRef;
    if (!existingSnapshot.empty) {
      // 既存のドキュメントを更新
      docRef = existingSnapshot.docs[0].ref;
      const existingData = existingSnapshot.docs[0].data();
      // 月初の値がまだ設定されていない場合、最初の値を月初として保存
      const updateData: Partial<FollowerCount> = {
        followers,
        source,
        updatedAt: now,
      };
      if (profileVisits !== undefined) {
        updateData.profileVisits = profileVisits;
      }
      if (externalLinkTaps !== undefined) {
        updateData.externalLinkTaps = externalLinkTaps;
      }
      if (!existingData.startFollowers) {
        updateData.startFollowers = existingData.followers; // 最初の値を月初として保存
      }
      await docRef.update(updateData);
    } else {
      // 新規作成（月初の値としても使用）
      const newData: Omit<FollowerCount, "createdAt" | "updatedAt"> & {
        createdAt: admin.firestore.Timestamp;
        updatedAt: admin.firestore.Timestamp;
      } = {
        userId: uid,
        snsType,
        followers,
        startFollowers: followers, // 月初の値としても保存
        month,
        source,
        profileVisits: profileVisits || 0,
        externalLinkTaps: externalLinkTaps || 0,
        createdAt: now,
        updatedAt: now,
      };
      docRef = await adminDb.collection("follower_counts").add(newData);
    }

    const updatedDoc = await docRef.get();
    const data = updatedDoc.data();

    return NextResponse.json({
      success: true,
      data: {
        id: updatedDoc.id,
        userId: data?.userId,
        snsType: data?.snsType,
        followers: data?.followers,
        month: data?.month,
        source: data?.source,
        profileVisits: data?.profileVisits || 0,
        externalLinkTaps: data?.externalLinkTaps || 0,
        createdAt: data?.createdAt?.toDate?.()?.toISOString() || data?.createdAt,
        updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || data?.updatedAt,
      },
    });
  } catch (error) {
    console.error("❌ フォロワー数保存エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(
      {
        ...body,
        error: "フォロワー数の保存に失敗しました",
      },
      { status }
    );
  }
}

