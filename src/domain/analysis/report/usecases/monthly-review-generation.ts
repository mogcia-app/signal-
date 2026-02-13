export interface DirectionAlignmentWarning {
  directionAlignment: "乖離" | "要注意";
  directionComment: string;
  aiDirectionMainTheme: string | null;
}

export interface MonthlyReviewPromptInput {
  currentMonth: string;
  nextMonth: string;
  analyzedCount: number;
  totalLikes: number;
  totalReach: number;
  totalComments: number;
  totalSaves: number;
  totalShares: number;
  totalFollowerIncrease: number;
  reachChangeText: string;
  followerChangeText: string;
  hasPlan: boolean;
  planTitle?: string;
  businessInfoText: string;
  aiSettingsText: string;
  postTypeInfo: string;
  topPostInfo: string;
  postSummaryInsights: string;
  directionAlignmentWarnings: DirectionAlignmentWarning[];
}

export interface ProposalPromptInput {
  nextMonth: string;
  analyzedCount: number;
  totalLikes: number;
  totalReach: number;
  totalComments: number;
  totalSaves: number;
  totalFollowerIncrease: number;
  reachChangeText: string;
  followerChangeText: string;
  businessInfoText: string;
  aiSettingsText: string;
  postTypeSummary: string;
  directionAlignmentWarnings: DirectionAlignmentWarning[];
}

export function formatReachChangeText(prevTotalReach: number, totalReach: number): string {
  if (prevTotalReach <= 0) {
    return "";
  }
  const reachChange = ((totalReach - prevTotalReach) / prevTotalReach) * 100;
  return `（前月比${reachChange >= 0 ? "+" : ""}${reachChange.toFixed(1)}％）`;
}

export function formatFollowerChangeText(prevTotalFollowerIncrease: number, totalFollowerIncrease: number): string {
  if (prevTotalFollowerIncrease <= 0 || totalFollowerIncrease === prevTotalFollowerIncrease) {
    return "";
  }
  const followerChange =
    ((totalFollowerIncrease - prevTotalFollowerIncrease) / prevTotalFollowerIncrease) * 100;
  return `（前月比${totalFollowerIncrease > prevTotalFollowerIncrease ? "+" : ""}${followerChange.toFixed(1)}％）`;
}

export function buildInsufficientDataMonthlyReview(params: {
  monthName: string;
  analyzedCount: number;
  totalReach: number;
  totalLikes: number;
  totalSaves: number;
  totalComments: number;
  followerDisplayText: string;
  reachChangeText: string;
}): string {
  return `📊 Instagram運用レポート（${params.monthName}総括）

⸻

📈 月次トータル数字
\t•\t閲覧数：${params.totalReach.toLocaleString()}人${params.reachChangeText}
\t•\tいいね数：${params.totalLikes.toLocaleString()}
\t•\t保存数：${params.totalSaves.toLocaleString()}
\t•\tコメント数：${params.totalComments.toLocaleString()}
\t•\tフォロワー増加数：${params.followerDisplayText}

⸻

💡 総評

${params.monthName}は分析済み投稿が${params.analyzedCount}件と、まだデータが少ない状態です。より精度の高い分析とAIによる振り返り・アクションプラン生成のためには、最低10件以上の分析済み投稿が必要です。

引き続き投稿を分析してデータを蓄積していきましょう。`;
}

export function buildNoDataMonthlyReview(monthName: string): string {
  return `📊 Instagram運用レポート（${monthName}総括）

⸻

📈 月次トータル数字
\t•\t閲覧数：0人
\t•\tいいね数：0
\t•\t保存数：0
\t•\tコメント数：0

⸻

💡 総評

${monthName}のデータがまだありません。投稿を開始してデータを蓄積しましょう。`;
}

export function buildAiErrorFallbackMonthlyReview(params: {
  monthName: string;
  totalReach: number;
  totalLikes: number;
  totalSaves: number;
  totalComments: number;
  reachChangeText: string;
}): string {
  return `📊 Instagram運用レポート（${params.monthName}総括）

⸻

📈 月次トータル数字
\t•\t閲覧数：${params.totalReach.toLocaleString()}人${params.reachChangeText}
\t•\tいいね数：${params.totalLikes.toLocaleString()}
\t•\t保存数：${params.totalSaves.toLocaleString()}
\t•\tコメント数：${params.totalComments.toLocaleString()}

⸻

💡 総評

${params.monthName}の運用を振り返ると、${params.totalReach > 0 ? `リーチ数${params.totalReach.toLocaleString()}人、いいね数${params.totalLikes.toLocaleString()}件を達成しました。` : "データ蓄積の段階です。"}継続的な投稿と分析により、アカウントの成長を目指しましょう。`;
}

export function hasProposalSection(reviewText: string): boolean {
  return reviewText.includes("📈") || reviewText.includes("提案");
}

export function buildMonthlyReviewPrompt(input: MonthlyReviewPromptInput): string {
  const directionBlock =
    input.directionAlignmentWarnings.length > 0
      ? `\n【今月の方向性警告（重要）】\n今月の投稿分析で、${input.directionAlignmentWarnings.length}件の投稿が今月のAI方針から「乖離」または「要注意」と判定されました。\n\n` +
        input.directionAlignmentWarnings
          .map((warning, index) => {
            const label = warning.directionAlignment === "乖離" ? "⚠️ 乖離" : "⚠️ 要注意";
            return `${index + 1}. ${label}: ${warning.directionComment || "方針からズレています"}`;
          })
          .join("\n")
      : "";

  return `以下のInstagram運用データを基に、${input.currentMonth}の振り返りを自然な日本語で出力してください。

【データ】
- 分析済み投稿数: ${input.analyzedCount}件
- いいね数: ${input.totalLikes.toLocaleString()}
- リーチ数: ${input.totalReach.toLocaleString()}${input.reachChangeText}
- コメント数: ${input.totalComments.toLocaleString()}
- 保存数: ${input.totalSaves.toLocaleString()}
- シェア数: ${input.totalShares.toLocaleString()}
- フォロワー増加数: ${input.totalFollowerIncrease > 0 ? "+" : ""}${input.totalFollowerIncrease.toLocaleString()}人${input.followerChangeText}
${input.hasPlan ? `- 運用計画: ${input.planTitle || "あり"}` : "- 運用計画: 未設定"}
${input.businessInfoText}
${input.aiSettingsText}

【投稿タイプ別の統計】
${input.postTypeInfo}

【最も閲覧された投稿】
${input.topPostInfo}

${input.postSummaryInsights ? `\n【投稿ごとのAI分析結果の集計】\n${input.postSummaryInsights}` : ""}
${directionBlock}

【出力形式】
必ず以下のセクションを含めてください。
- 📊 Instagram運用レポート（${input.currentMonth}総括）
- 📈 月次トータル数字
- 🔹 アカウント全体の動き
- 🔹 コンテンツ別の傾向
- 💡 総評
- 📈 ${input.nextMonth}に向けた提案`;
}

export function buildProposalPrompt(input: ProposalPromptInput): string {
  return `以下のInstagram運用データを基に、${input.nextMonth}に向けた具体的なアクションプランを3つ生成してください。

【データ】
- 分析済み投稿数: ${input.analyzedCount}件
- いいね数: ${input.totalLikes.toLocaleString()}
- リーチ数: ${input.totalReach.toLocaleString()}${input.reachChangeText}
- コメント数: ${input.totalComments.toLocaleString()}
- 保存数: ${input.totalSaves.toLocaleString()}
- フォロワー増加数: ${input.totalFollowerIncrease > 0 ? "+" : ""}${input.totalFollowerIncrease.toLocaleString()}人${input.followerChangeText}
${input.businessInfoText}
${input.aiSettingsText}

【投稿タイプ別の統計】
${input.postTypeSummary}

【出力形式】
📈 ${input.nextMonth}に向けた提案
1. {提案1のタイトル}
{提案1の説明}
2. {提案2のタイトル}
{提案2の説明}
3. {提案3のタイトル}
{提案3の説明}`;
}
