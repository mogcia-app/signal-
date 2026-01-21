import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "../../../../lib/firebase-admin";
import { requireAuthContext, buildErrorResponse } from "../../../../lib/server/auth-context";

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "change-password", limit: 5, windowSeconds: 300 },
      auditEventName: "change_password",
    });

    const body = await request.json();
    const { newPassword } = body;

    // バリデーション
    if (!newPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "新しいパスワードが必要です",
        },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "新しいパスワードは8文字以上である必要があります",
        },
        { status: 400 }
      );
    }

    // Firebase Admin SDKを使用してパスワードを変更
    try {
      await adminAuth.updateUser(uid, {
        password: newPassword,
      });

      return NextResponse.json({
        success: true,
        message: "パスワードが正常に変更されました",
      });
    } catch (error: unknown) {
      console.error("パスワード変更エラー:", error);
      const errorMessage = error instanceof Error ? error.message : "パスワードの変更に失敗しました";
      
      interface FirebaseError extends Error {
        code?: string;
      }

      const firebaseError = error as FirebaseError;
      if (firebaseError.code === "auth/weak-password") {
        return NextResponse.json(
          {
            success: false,
            error: "パスワードが弱すぎます。より強力なパスワードを設定してください",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "パスワードの変更に失敗しました",
          details: errorMessage,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("パスワード変更エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
