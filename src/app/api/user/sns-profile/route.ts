import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  buildErrorResponse,
  ForbiddenError,
  requireAuthContext,
} from "@/lib/server/auth-context";

function resolveRequestedUserId(candidate: unknown, authenticatedUid: string): string {
  if (candidate === undefined || candidate === null || candidate === "") {
    return authenticatedUid;
  }

  if (typeof candidate !== "string" || candidate !== authenticatedUid) {
    throw new ForbiddenError("他のユーザーのSNSプロフィールにはアクセスできません");
  }

  return candidate;
}

export async function PUT(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: false,
      rateLimit: { key: "user-sns-profile-update", limit: 30, windowSeconds: 60 },
      auditEventName: "user_sns_profile_update",
    });

    const body = await request.json();
    const { userId, platform, profileData } = body;
    const resolvedUserId = resolveRequestedUserId(userId, uid);

    if (!platform || !profileData || typeof platform !== "string") {
      return NextResponse.json({ error: "必須フィールドが不足しています" }, { status: 400 });
    }

    const userDocRef = adminDb.collection("users").doc(resolvedUserId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    const userData = userDoc.data() || {};
    const currentSnsProfiles = (userData.snsProfiles as Record<string, unknown> | undefined) || {};

    currentSnsProfiles[platform] = {
      ...(currentSnsProfiles[platform] as Record<string, unknown> | undefined),
      ...(profileData as Record<string, unknown>),
      lastUpdated: new Date().toISOString(),
    };

    await userDocRef.update({
      snsProfiles: currentSnsProfiles,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      message: "SNSプロフィールが更新されました",
      snsProfiles: currentSnsProfiles,
    });
  } catch (error) {
    console.error("SNSプロフィール更新エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: false,
      rateLimit: { key: "user-sns-profile-read", limit: 60, windowSeconds: 60 },
      auditEventName: "user_sns_profile_read",
    });

    const { searchParams } = new URL(request.url);
    const resolvedUserId = resolveRequestedUserId(searchParams.get("userId"), uid);
    const platform = searchParams.get("platform");

    const userDoc = await adminDb.collection("users").doc(resolvedUserId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    const userData = userDoc.data() || {};
    const snsProfiles = (userData.snsProfiles as Record<string, unknown> | undefined) || {};

    if (platform) {
      return NextResponse.json({
        platform,
        profile: snsProfiles[platform] || null,
      });
    }

    return NextResponse.json({
      snsProfiles,
    });
  } catch (error) {
    console.error("SNSプロフィール取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
