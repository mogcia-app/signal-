import { NextRequest, NextResponse } from "next/server";
import {
  buildErrorResponse,
  ForbiddenError,
  requireAuthContext,
} from "../../../lib/server/auth-context";
import { UserProfileRepository } from "@/repositories/user-profile-repository";

function resolveRequestedUserId(candidate: unknown, authenticatedUid: string): string {
  if (candidate === undefined || candidate === null || candidate === "") {
    return authenticatedUid;
  }

  if (typeof candidate !== "string") {
    throw new ForbiddenError("不正なuserIdです");
  }

  if (candidate !== authenticatedUid) {
    throw new ForbiddenError("他のユーザープロフィールにはアクセスできません");
  }

  return candidate;
}

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: false,
      rateLimit: { key: "users-profile-create", limit: 20, windowSeconds: 60 },
      auditEventName: "users_profile_create",
    });

    const body = await request.json();
    const { userId, email, displayName, avatarUrl, bio, preferences, socialAccounts } = body;
    const resolvedUserId = resolveRequestedUserId(userId, uid);

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "必須フィールドが不足しています" }, { status: 400 });
    }

    const existingProfile = await UserProfileRepository.findLegacyProfileByUserId(resolvedUserId);
    if (existingProfile) {
      return NextResponse.json({ error: "ユーザープロフィールは既に存在します" }, { status: 409 });
    }

    const userData = await UserProfileRepository.createLegacyProfile({
      userId: resolvedUserId,
      email,
      displayName: typeof displayName === "string" ? displayName : undefined,
      avatarUrl: typeof avatarUrl === "string" ? avatarUrl : undefined,
      bio: typeof bio === "string" ? bio : undefined,
      preferences,
      socialAccounts,
    });

    return NextResponse.json({
      id: userData.id,
      message: "ユーザープロフィールが作成されました",
      data: userData,
    });
  } catch (error) {
    console.error("ユーザープロフィール作成エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: false,
      rateLimit: { key: "users-profile-read", limit: 60, windowSeconds: 60 },
      auditEventName: "users_profile_read",
    });

    const { searchParams } = new URL(request.url);
    const resolvedUserId = resolveRequestedUserId(searchParams.get("userId"), uid);
    const userData = await UserProfileRepository.findLegacyProfileByUserId(resolvedUserId);
    if (!userData) {
      return NextResponse.json({ error: "ユーザープロフィールが見つかりません" }, { status: 404 });
    }

    return NextResponse.json({ user: userData });
  } catch (error) {
    console.error("ユーザープロフィール取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: false,
      rateLimit: { key: "users-profile-update", limit: 30, windowSeconds: 60 },
      auditEventName: "users_profile_update",
    });

    const body = await request.json();
    const { userId, displayName, avatarUrl, bio, preferences, socialAccounts } = body;
    const resolvedUserId = resolveRequestedUserId(userId, uid);

    const updated = await UserProfileRepository.updateLegacyProfile(resolvedUserId, {
      displayName,
      avatarUrl,
      bio,
      preferences,
      socialAccounts,
    });

    if (!updated) {
      return NextResponse.json({ error: "ユーザープロフィールが見つかりません" }, { status: 404 });
    }

    return NextResponse.json({
      message: "ユーザープロフィールが更新されました",
      id: updated.id,
    });
  } catch (error) {
    console.error("ユーザープロフィール更新エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
