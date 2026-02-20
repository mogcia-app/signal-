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
  engagementRate: number | null;
  engagementRateNeedsReachInput: boolean;
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
  engagementRate: number | null;
  engagementRateNeedsReachInput: boolean;
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

export function buildPendingGenerationMonthlyReview(monthName: string, analyzedCount: number): string {
  return `📊 Instagram運用レポート（${monthName}総括）

⸻

💡 AI振り返りはまだ生成されていません

分析済み投稿は${analyzedCount}件あります。AIによる「今月の振り返り」と「次のアクションプラン」を作成するには、右上の「再提案する」を押してください。`;
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
  return (
    reviewText.includes("3. 次の一手") ||
    reviewText.includes("4. 次の一手") ||
    reviewText.includes("次の一手") ||
    reviewText.includes("次の一手（優先順3つ）")
  );
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
- エンゲージメント率（リール+フィード）: ${input.engagementRateNeedsReachInput ? "閲覧数未入力のため算出不可" : input.engagementRate === null ? "データ不足" : `${input.engagementRate.toFixed(2)}%`}
- エンゲージメント率の参考レンジ: Instagram全体平均 0.43%〜2.2% / 良好 1%〜5% / 優れた水準 5%以上
${input.hasPlan ? `- 運用計画: ${input.planTitle || "あり"}` : "- 運用計画: 未設定"}
${input.businessInfoText}
${input.aiSettingsText}

【投稿タイプ別の統計】
${input.postTypeInfo}

【最も閲覧された投稿】
${input.topPostInfo}

${input.postSummaryInsights ? `\n【投稿ごとのAI分析結果の集計】\n${input.postSummaryInsights}` : ""}
${directionBlock}

【最重要ルール】
- 出力は必ず「3セクション固定」で、余計なセクションを追加しない。
- 数値目標は「件数」で示す（%や率をメイン目標にしない）。
- 「次の一手」は優先順A/B/Cの3つだけ。
- 抽象表現（工夫する/意識する等）を避け、実行手順を1行で書く。
- 「次の一手」は必ずサイドバー機能名を使う（AI投稿文生成 / 投稿チャットβ / 分析チャットβ / 月次レポート）。
- 「次の一手」は必ず上記機能のページ内で完結する作業だけを書く（外部ツール作業・手作業前提は不可）。
- 「次の一手」の実行手順は「今月は○○から、△△について□□回作成する」のように、対象テーマと回数を必ず入れる。
- 各施策は「どのKPIを改善する施策か」を明記する（保存 / コメント / シェア / リーチ / フォロワー増減 のいずれか）。
- 各施策の実行手順には、必ず「回数」「保存/反映」「採用判断基準（何をもって次月も継続するか）」を含める。
- 禁止: 「ハッシュタグの見直し」「工夫する」「意識する」など、実行単位にならない抽象タスク。
- 予約投稿機能は前提にしない。必ず「生成して保存」「保存後に投稿」の表現を使う。
- 手作業中心の助言（例: 手で一から投稿文を書く前提）は避け、AI機能活用前提で書く。

【出力テンプレート（この見出しを必ず使用）】
1. 今月の要約
- 良かった点:
- 課題:
- 結論:

2. 主要KPI実績
- いいね:
- コメント:
- シェア:
- 保存:
- フォロワー増減:
- リーチ:
- エンゲージメント率: （リール+フィード）

3. 次の一手
1. [A] タイトル
説明: どのKPIを、なぜ改善するか（1行）
→ 実行手順: 今月は【機能名】で【対象】を【回数】生成して保存（または反映）。判定基準: 【翌月も継続する条件】。
2. [B] タイトル
説明: どのKPIを、なぜ改善するか（1行）
→ 実行手順: 今月は【機能名】で【対象】を【回数】生成して保存（または反映）。判定基準: 【翌月も継続する条件】。
3. [C] タイトル
説明: どのKPIを、なぜ改善するか（1行）
→ 実行手順: 今月は【機能名】で【対象】を【回数】生成して保存（または反映）。判定基準: 【翌月も継続する条件】。

【出力開始行】
📊 Instagram運用レポート（${input.currentMonth}総括）`;
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
- エンゲージメント率（リール+フィード）: ${input.engagementRateNeedsReachInput ? "閲覧数未入力のため算出不可" : input.engagementRate === null ? "データ不足" : `${input.engagementRate.toFixed(2)}%`}
- エンゲージメント率の参考レンジ: Instagram全体平均 0.43%〜2.2% / 良好 1%〜5% / 優れた水準 5%以上
${input.businessInfoText}
${input.aiSettingsText}

【投稿タイプ別の統計】
${input.postTypeSummary}

【最重要ルール】
- 提案は必ずサイドバー機能（AI投稿文生成 / 投稿チャットβ / 分析チャットβ / 月次レポート）で実行できる内容のみ。
- 提案の実行手順は「今月は○○から、△△について□□回作成する」形式で、対象テーマと回数を必ず入れる。
- 各提案で対象KPI（保存 / コメント / シェア / リーチ / フォロワー増減）を明示する。
- 実行手順には必ず「保存/反映」「採用判断基準」を入れる。
- 禁止: 抽象タスク（ハッシュタグ見直し、工夫する、意識する等）。
- 予約投稿の記述は禁止し、「生成して保存」「保存後に投稿」を使う。

【出力形式】
3. 次の一手
1. [A] {提案1のタイトル}
{提案1の説明}
→ 実行手順: {1行で具体}
2. [B] {提案2のタイトル}
{提案2の説明}
→ 実行手順: {1行で具体}
3. [C] {提案3のタイトル}
{提案3の説明}
→ 実行手順: {1行で具体}`;
}
