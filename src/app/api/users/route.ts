import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../lib/firebase";
import { collection, addDoc, getDocs, doc, updateDoc, query, where } from "firebase/firestore";

// ユーザープロフィールの型定義
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

// ユーザープロフィール作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, displayName, avatarUrl, bio, preferences, socialAccounts } = body;

    // バリデーション
    if (!userId || !email) {
      return NextResponse.json({ error: "必須フィールドが不足しています" }, { status: 400 });
    }

    const userData: Omit<UserProfile, "id"> = {
      userId,
      email,
      displayName: displayName || "",
      avatarUrl: avatarUrl || "",
      bio: bio || "",
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

    const docRef = await addDoc(collection(db, "userProfiles"), userData);

    return NextResponse.json({
      id: docRef.id,
      message: "ユーザープロフィールが作成されました",
      data: { ...userData, id: docRef.id },
    });
  } catch (error) {
    console.error("ユーザープロフィール作成エラー:", error);
    return NextResponse.json(
      { error: "ユーザープロフィールの作成に失敗しました" },
      { status: 500 }
    );
  }
}

// ユーザープロフィール取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userIdが必要です" }, { status: 400 });
    }

    const q = query(collection(db, "userProfiles"), where("userId", "==", userId));

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return NextResponse.json({ error: "ユーザープロフィールが見つかりません" }, { status: 404 });
    }

    const userData = {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
    };

    return NextResponse.json({ user: userData });
  } catch (error) {
    console.error("ユーザープロフィール取得エラー:", error);
    return NextResponse.json(
      { error: "ユーザープロフィールの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// ユーザープロフィール更新
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, displayName, avatarUrl, bio, preferences, socialAccounts } = body;

    if (!userId) {
      return NextResponse.json({ error: "userIdが必要です" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // 更新するフィールドのみ追加
    if (displayName !== undefined) {updateData.displayName = displayName;}
    if (avatarUrl !== undefined) {updateData.avatarUrl = avatarUrl;}
    if (bio !== undefined) {updateData.bio = bio;}
    if (preferences !== undefined) {updateData.preferences = preferences;}
    if (socialAccounts !== undefined) {updateData.socialAccounts = socialAccounts;}

    // まずユーザーを検索
    const q = query(collection(db, "userProfiles"), where("userId", "==", userId));

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return NextResponse.json({ error: "ユーザープロフィールが見つかりません" }, { status: 404 });
    }

    const docRef = doc(db, "userProfiles", snapshot.docs[0].id);
    await updateDoc(docRef, updateData);

    return NextResponse.json({
      message: "ユーザープロフィールが更新されました",
      id: snapshot.docs[0].id,
    });
  } catch (error) {
    console.error("ユーザープロフィール更新エラー:", error);
    return NextResponse.json(
      { error: "ユーザープロフィールの更新に失敗しました" },
      { status: 500 }
    );
  }
}
