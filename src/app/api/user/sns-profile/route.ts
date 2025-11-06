import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, platform, profileData } = body;

    if (!userId || !platform || !profileData) {
      return NextResponse.json({ error: "必須フィールドが不足しています" }, { status: 400 });
    }

    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    const userData = userDoc.data();
    const currentSnsProfiles = userData.snsProfiles || {};

    // プラットフォーム別のプロフィール情報を更新
    currentSnsProfiles[platform] = {
      ...currentSnsProfiles[platform],
      ...profileData,
      lastUpdated: new Date().toISOString(),
    };

    await updateDoc(userDocRef, {
      snsProfiles: currentSnsProfiles,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      message: "SNSプロフィールが更新されました",
      snsProfiles: currentSnsProfiles,
    });
  } catch (error) {
    console.error("SNSプロフィール更新エラー:", error);
    return NextResponse.json({ error: "SNSプロフィールの更新に失敗しました" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const platform = searchParams.get("platform");

    if (!userId) {
      return NextResponse.json({ error: "userIdが必要です" }, { status: 400 });
    }

    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    const userData = userDoc.data();
    const snsProfiles = userData.snsProfiles || {};

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
    return NextResponse.json({ error: "SNSプロフィールの取得に失敗しました" }, { status: 500 });
  }
}
