import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "../../../../lib/server/auth-context";

// 投稿タイプ別の文字数制限
const POST_CHARACTER_LIMITS = {
  feed: 2200,
  reel: 2200,
  story: 100,
} as const;

// 投稿タイプ別のハッシュタグ最大数
const POST_HASHTAG_LIMITS = {
  feed: 30,
  reel: 30,
  story: 0, // ストーリーズはハッシュタグ不可
} as const;

/**
 * GET: バリデーションルールと制限値を取得
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック（オプション - 公開APIにする場合は削除）
    await requireAuthContext(request, {
      requireContract: false,
    });

    const { searchParams } = new URL(request.url);
    const postType = (searchParams.get("postType") || "feed") as "feed" | "reel" | "story";

    const limits = {
      maxCharacters: POST_CHARACTER_LIMITS[postType] || 2200,
      maxHashtags: POST_HASHTAG_LIMITS[postType] ?? 30,
    };

    return NextResponse.json({
      success: true,
      limits,
    });
  } catch (_error) {
    // 認証エラーの場合はデフォルト値を返す
    const { searchParams } = new URL(request.url);
    const postType = (searchParams.get("postType") || "feed") as "feed" | "reel" | "story";

    const limits = {
      maxCharacters: POST_CHARACTER_LIMITS[postType] || 2200,
      maxHashtags: POST_HASHTAG_LIMITS[postType] ?? 30,
    };

    return NextResponse.json({
      success: true,
      limits,
    });
  }
}

/**
 * POST: バリデーション実行
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuthContext(request, {
      requireContract: false,
    });

    const body = await request.json();
    const { postType = "feed", content, hashtags, schedule: _schedule, prompt } = body;

    const errors: string[] = [];
    const warnings: string[] = [];

    // 文字数チェック
    if (content !== undefined) {
      const maxCharacters = POST_CHARACTER_LIMITS[postType as keyof typeof POST_CHARACTER_LIMITS] || 2200;
      if (content.length > maxCharacters) {
        errors.push(`投稿文が長すぎます（${content.length}文字）。最大${maxCharacters}文字までです。`);
      }
      if (content.length === 0) {
        errors.push("投稿文が入力されていません。");
      }
    }

    // ハッシュタグチェック
    if (hashtags !== undefined && Array.isArray(hashtags)) {
      const maxHashtags = POST_HASHTAG_LIMITS[postType as keyof typeof POST_HASHTAG_LIMITS] ?? 30;
      if (hashtags.length > maxHashtags) {
        errors.push(`ハッシュタグが多すぎます（${hashtags.length}個）。最大${maxHashtags}個までです。`);
      }
      // 重複チェック
      const uniqueHashtags = new Set(hashtags.map((tag: string) => tag.toLowerCase().replace(/^#+/, "")));
      if (uniqueHashtags.size < hashtags.length) {
        warnings.push("重複するハッシュタグがあります。");
      }
    }

    // プロンプト分析（短すぎる、曖昧な表現など）
    if (prompt !== undefined && typeof prompt === "string") {
      const trimmed = prompt.trim();
      if (trimmed.length < 10) {
        warnings.push("プロンプトが短すぎるようです。もう少し詳しい内容を入力すると、より良い投稿文が生成されます。");
      }
    }

    return NextResponse.json({
      success: true,
      valid: errors.length === 0,
      errors,
      warnings,
    });
  } catch (error) {
    console.error("バリデーションエラー:", error);
    return NextResponse.json(
      {
        success: false,
        error: "バリデーション処理に失敗しました",
      },
      { status: 500 }
    );
  }
}
