import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import * as admin from "firebase-admin";

interface FollowerCount {
  userId: string;
  snsType: "instagram" | "x" | "tiktok";
  followers: number; // 廃止: 互換性のため保持（常に0）
  startFollowers?: number; // 廃止: 互換性のため保持（常に0）
  month: string; // YYYY-MM形式
  source: "manual" | "onboarding"; // 手動入力 or オンボーディング
  profileVisits?: number; // 廃止: 互換性のため保持（常に0）
  externalLinkTaps?: number; // 廃止: 互換性のため保持（常に0）
  legacyFieldsDisabled?: boolean;
  legacyFieldsDisabledAt?: admin.firestore.Timestamp;
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
        followers: 0,
        startFollowers: 0,
        month: data.month,
        source: data.source,
        profileVisits: 0,
        externalLinkTaps: 0,
        legacyFieldsDisabled: true,
        legacyManualInput: data.legacyManualInput || null,
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
    const legacyPayload = {
      followers: typeof followers === "number" && followers > 0 ? followers : 0,
      profileVisits: typeof profileVisits === "number" && profileVisits > 0 ? profileVisits : 0,
      externalLinkTaps: typeof externalLinkTaps === "number" && externalLinkTaps > 0 ? externalLinkTaps : 0,
      submittedAt: now,
    };
    if (!existingSnapshot.empty) {
      // 既存のドキュメントを更新（旧フィールドは無効化を維持）
      docRef = existingSnapshot.docs[0].ref;
      const updateData: Partial<FollowerCount> = {
        followers: 0,
        startFollowers: 0,
        profileVisits: 0,
        externalLinkTaps: 0,
        legacyFieldsDisabled: true,
        legacyFieldsDisabledAt: now,
        source,
        updatedAt: now,
      };

      await docRef.set(
        {
          ...updateData,
          legacyManualInput: {
            ...legacyPayload,
          },
        },
        { merge: true }
      );
    } else {
      // 新規作成（旧フィールドは常に0で保持）
      const newData: Omit<FollowerCount, "createdAt" | "updatedAt"> & {
        createdAt: admin.firestore.Timestamp;
        updatedAt: admin.firestore.Timestamp;
      } = {
        userId: uid,
        snsType,
        followers: 0,
        startFollowers: 0,
        month,
        source,
        profileVisits: 0,
        externalLinkTaps: 0,
        legacyFieldsDisabled: true,
        legacyFieldsDisabledAt: now,
        createdAt: now,
        updatedAt: now,
      };
      docRef = await adminDb.collection("follower_counts").add({
        ...newData,
        legacyManualInput: {
          ...legacyPayload,
        },
      });
    }

    const updatedDoc = await docRef.get();
    const data = updatedDoc.data();

    return NextResponse.json({
      success: true,
      data: {
        id: updatedDoc.id,
        userId: data?.userId,
        snsType: data?.snsType,
        followers: 0,
        month: data?.month,
        source: data?.source,
        profileVisits: 0,
        externalLinkTaps: 0,
        legacyFieldsDisabled: true,
        legacyManualInput: data?.legacyManualInput || null,
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
