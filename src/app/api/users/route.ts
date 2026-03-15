import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebase-admin";
import {
  buildErrorResponse,
  ForbiddenError,
  requireAuthContext,
} from "../../../lib/server/auth-context";

interface UserProfile {
  id?: string;
  userId: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  preferences: {
    theme: "light" | "dark";
    language: string;
    notifications: boolean;
  };
  socialAccounts: {
    instagram?: {
      username: string;
      connected: boolean;
    };
    twitter?: {
      username: string;
      connected: boolean;
    };
    youtube?: {
      username: string;
      connected: boolean;
    };
    tiktok?: {
      username: string;
      connected: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

async function findUserProfileDocByUserId(userId: string) {
  const snapshot = await adminDb
    .collection("userProfiles")
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0];
}

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

    const existingProfile = await findUserProfileDocByUserId(resolvedUserId);
    if (existingProfile) {
      return NextResponse.json({ error: "ユーザープロフィールは既に存在します" }, { status: 409 });
    }

    const userData: Omit<UserProfile, "id"> = {
      userId: resolvedUserId,
      email,
      displayName: typeof displayName === "string" ? displayName : "",
      avatarUrl: typeof avatarUrl === "string" ? avatarUrl : "",
      bio: typeof bio === "string" ? bio : "",
      preferences: preferences || {
        theme: "light",
        language: "ja",
        notifications: true,
      },
      socialAccounts: socialAccounts || {
        instagram: { username: "", connected: false },
        twitter: { username: "", connected: false },
        youtube: { username: "", connected: false },
        tiktok: { username: "", connected: false },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await adminDb.collection("userProfiles").add(userData);

    return NextResponse.json({
      id: docRef.id,
      message: "ユーザープロフィールが作成されました",
      data: { ...userData, id: docRef.id },
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
    const profileDoc = await findUserProfileDocByUserId(resolvedUserId);

    if (!profileDoc) {
      return NextResponse.json({ error: "ユーザープロフィールが見つかりません" }, { status: 404 });
    }

    const userData = {
      id: profileDoc.id,
      ...profileDoc.data(),
    };

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

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (displayName !== undefined) {updateData.displayName = displayName;}
    if (avatarUrl !== undefined) {updateData.avatarUrl = avatarUrl;}
    if (bio !== undefined) {updateData.bio = bio;}
    if (preferences !== undefined) {updateData.preferences = preferences;}
    if (socialAccounts !== undefined) {updateData.socialAccounts = socialAccounts;}

    const profileDoc = await findUserProfileDocByUserId(resolvedUserId);

    if (!profileDoc) {
      return NextResponse.json({ error: "ユーザープロフィールが見つかりません" }, { status: 404 });
    }

    await adminDb.collection("userProfiles").doc(profileDoc.id).update(updateData);

    return NextResponse.json({
      message: "ユーザープロフィールが更新されました",
      id: profileDoc.id,
    });
  } catch (error) {
    console.error("ユーザープロフィール更新エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
