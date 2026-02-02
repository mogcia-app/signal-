import { NextRequest, NextResponse } from "next/server";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";

interface ValidationRequest {
  type: "content" | "hashtag" | "schedule" | "prompt";
  postType?: "feed" | "reel" | "story";
  content?: string;
  hashtags?: string[];
  monthlyPosts?: number;
  dailyPosts?: number;
  prompt?: string;
}

interface ValidationResponse {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  limits?: {
    maxCharacters?: number;
    maxHashtags?: number;
    minMonthlyPosts?: number;
    maxDailyPosts?: number;
  };
  feedback?: {
    message: string | null;
    category: string;
  };
}

/**
 * 文字数制限を取得（投稿タイプ別）
 */
function getMaxCharacters(postType?: "feed" | "reel" | "story"): number {
  switch (postType) {
    case "feed":
      return 2200; // フィード投稿の最大文字数
    case "reel":
      return 2200; // リール投稿の最大文字数
    case "story":
      return 2200; // ストーリーズ投稿の最大文字数
    default:
      return 2200; // デフォルト
  }
}

/**
 * ハッシュタグの最大数を取得（投稿タイプ別）
 */
function getMaxHashtags(postType?: "feed" | "reel" | "story"): number {
  switch (postType) {
    case "feed":
    case "reel":
      return 5; // フィード・リールは最大5個
    case "story":
      return Infinity; // ストーリーズは無制限
    default:
      return 5; // デフォルト
  }
}

/**
 * コンテンツのバリデーション
 */
function validateContent(
  content: string,
  postType?: "feed" | "reel" | "story"
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const maxCharacters = getMaxCharacters(postType);

  if (content.length > maxCharacters) {
    errors.push(`文字数が上限（${maxCharacters}文字）を超えています。`);
  }

  if (content.trim().length === 0) {
    errors.push("コンテンツが空です。");
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * ハッシュタグのバリデーション
 */
function validateHashtags(
  hashtags: string[],
  postType?: "feed" | "reel" | "story"
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const maxHashtags = getMaxHashtags(postType);

  if (hashtags.length > maxHashtags) {
    errors.push(`ハッシュタグは最大${maxHashtags}個までです。`);
  }

  // 重複チェック
  const normalized = hashtags.map((tag) => tag.replace(/^#+/, "").toLowerCase());
  const duplicates = normalized.filter((tag, index) => normalized.indexOf(tag) !== index);
  if (duplicates.length > 0) {
    errors.push("重複するハッシュタグがあります。");
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * スケジュールのバリデーション
 */
function validateSchedule(
  monthlyPosts: number,
  dailyPosts: number
): { isValid: boolean; errors: string[]; warnings: string[]; feedback: { message: string | null; category: string } } {
  const errors: string[] = [];
  const warnings: string[] = [];
  let feedback: { message: string | null; category: string } = { message: null, category: "" };

  // 投稿頻度が低すぎる
  if (monthlyPosts < 4) {
    feedback = {
      message: `投稿頻度が低すぎるようです（月${monthlyPosts}回）。週1回（月4回）以上に設定すると、より効果的なスケジュールが生成されます。継続的な投稿がフォロワー獲得には重要です。`,
      category: "low_frequency",
    };
    warnings.push(feedback.message || "");
  }

  // 1日の投稿回数が多すぎる
  if (dailyPosts > 3) {
    feedback = {
      message: `1日の投稿回数が多すぎるようです（${dailyPosts}回）。1日1-2回程度が推奨です。投稿の質を保つためにも、無理のない頻度に設定してください。`,
      category: "too_many_daily",
    };
    warnings.push(feedback.message || "");
  }

  return { isValid: errors.length === 0, errors, warnings, feedback };
}

/**
 * プロンプトの分析（バリデーション）
 */
function analyzePrompt(prompt: string): { feedback: string | null; category: string } {
  const trimmed = prompt.trim();
  const length = trimmed.length;

  // 空の場合
  if (length === 0) {
    return { feedback: null, category: "" };
  }

  // 短すぎる場合
  if (length < 10) {
    return {
      feedback: `プロンプトが短すぎるようです（${length}文字）。以下のような情報を含めると、より具体的で効果的な投稿文が生成されます：\n• 何について投稿したいか（商品、イベント、日常など）\n• 伝えたいメッセージや感情（「感動した」「おすすめしたい」など）\n• ターゲット層（「若い女性」「ビジネスパーソン」など）\n• 具体的な内容（「新商品のコーヒー豆、深煎りでコクがある」など）\n\n例：「新商品のコーヒー豆を紹介したい。深煎りでコクがあり、朝の時間にぴったり。30代の女性向けに、日常の小さな幸せを感じられる投稿にしてほしい」`,
      category: "too_short",
    };
  }

  // 曖昧な表現が多い
  const vagueWords = /(いい|良い|すごい|すごく|なんか|なんとなく|ちょっと|まあ|適当|いい感じ)/g;
  const vagueCount = (trimmed.match(vagueWords) || []).length;
  
  if (vagueCount >= 2 && length < 50) {
    return {
      feedback: `プロンプトに曖昧な表現が多いようです。「いい感じ」「すごい」などの抽象的な言葉ではなく、具体的な情報を含めると、より効果的な投稿文が生成されます：\n• 商品の場合：価格、特徴、使った感想、おすすめポイント\n• イベントの場合：日時、場所、参加方法、どんな内容か\n• 日常の場合：何が起きたか、なぜ印象的だったか、何を感じたか\n• ターゲット層：誰に伝えたいのか、どんな価値を提供したいのか`,
      category: "vague",
    };
  }

  // 具体的な情報が不足
  const hasSpecificInfo = /\d+|(日時|場所|価格|特徴|感想|おすすめ)/g.test(trimmed);
  if (!hasSpecificInfo && length < 40) {
    return {
      feedback: `プロンプトに具体的な情報が不足しているようです。以下のような詳細を追加すると、より魅力的な投稿文が生成されます：\n• 数字やデータ（「1000円」「3日間限定」「累計1万個販売」など）\n• 具体的な特徴や違い（「他にはない香り」「30分で完成」など）\n• 実体験や感想（「使ってみたら」「実際に感じたことは」など）\n• ターゲット層との接点（「忙しい朝に」「仕事帰りに」など）`,
      category: "lack_details",
    };
  }

  // 問題なし
  return { feedback: null, category: "" };
}

/**
 * POST: 投稿エディターのバリデーション
 */
export async function POST(request: NextRequest) {
  try {
    const { uid: userId } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "post-editor-validation", limit: 100, windowSeconds: 60 },
      auditEventName: "post_editor_validation",
    });

    const body: ValidationRequest = await request.json();

    if (!body.type) {
      return NextResponse.json({ error: "typeが必要です" }, { status: 400 });
    }

    const { type, postType } = body;
    let validationResult: ValidationResponse;

    switch (type) {
      case "content":
        if (!body.content) {
          return NextResponse.json({ error: "contentが必要です" }, { status: 400 });
        }
        const contentValidation = validateContent(body.content, postType);
        validationResult = {
          isValid: contentValidation.isValid,
          errors: contentValidation.errors,
          warnings: contentValidation.warnings,
          limits: {
            maxCharacters: getMaxCharacters(postType),
          },
        };
        break;

      case "hashtag":
        if (!body.hashtags) {
          return NextResponse.json({ error: "hashtagsが必要です" }, { status: 400 });
        }
        const hashtagValidation = validateHashtags(body.hashtags, postType);
        validationResult = {
          isValid: hashtagValidation.isValid,
          errors: hashtagValidation.errors,
          warnings: hashtagValidation.warnings,
          limits: {
            maxHashtags: getMaxHashtags(postType),
          },
        };
        break;

      case "schedule":
        if (typeof body.monthlyPosts !== "number" || typeof body.dailyPosts !== "number") {
          return NextResponse.json(
            { error: "monthlyPostsとdailyPostsが必要です" },
            { status: 400 }
          );
        }
        const scheduleValidation = validateSchedule(body.monthlyPosts, body.dailyPosts);
        validationResult = {
          isValid: scheduleValidation.isValid,
          errors: scheduleValidation.errors,
          warnings: scheduleValidation.warnings,
          limits: {
            minMonthlyPosts: 4,
            maxDailyPosts: 3,
          },
          feedback: scheduleValidation.feedback,
        };
        break;

      case "prompt":
        if (!body.prompt) {
          return NextResponse.json({ error: "promptが必要です" }, { status: 400 });
        }
        const promptAnalysis = analyzePrompt(body.prompt);
        validationResult = {
          isValid: true, // プロンプト分析は警告のみ
          errors: [],
          warnings: promptAnalysis.feedback ? [promptAnalysis.feedback] : [],
          feedback: {
            message: promptAnalysis.feedback,
            category: promptAnalysis.category,
          },
        };
        break;

      default:
        return NextResponse.json({ error: "無効なtypeです" }, { status: 400 });
    }

    return NextResponse.json(validationResult);
  } catch (error) {
    console.error("バリデーションエラー:", error);
    const { status, body: errorBody } = buildErrorResponse(error);
    return NextResponse.json(errorBody, { status });
  }
}

/**
 * GET: バリデーションルールと制限値を取得
 */
export async function GET(request: NextRequest) {
  try {
    const { uid: userId } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "post-editor-validation", limit: 100, windowSeconds: 60 },
      auditEventName: "post_editor_validation_get",
    });

    const { searchParams } = new URL(request.url);
    const postType = searchParams.get("postType") as "feed" | "reel" | "story" | null;

    return NextResponse.json({
      limits: {
        maxCharacters: getMaxCharacters(postType || undefined),
        maxHashtags: getMaxHashtags(postType || undefined),
        minMonthlyPosts: 4,
        maxDailyPosts: 3,
      },
    });
  } catch (error) {
    console.error("バリデーションルール取得エラー:", error);
    const { status, body: errorBody } = buildErrorResponse(error);
    return NextResponse.json(errorBody, { status });
  }
}

