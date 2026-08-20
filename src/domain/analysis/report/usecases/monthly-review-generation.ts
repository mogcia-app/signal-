export interface DirectionAlignmentWarning {
  directionAlignment: "乖離" | "要注意";
  directionComment: string;
  aiDirectionMainTheme: string | null;
}

export interface MonthlyReviewPromptInput {
  currentMonth: string;
  nextMonth: string;
  analyzedCount: number;
  previousComparisonText: string;
  totalLikes: number;
  totalReposts: number;
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
  previousComparisonText: string;
  totalLikes: number;
  totalReposts: number;
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

function formatSignedPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatSignedPoint(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}pt`;
}

function formatMetricComparison(label: string, current: number, previous: number, unit = ""): string {
  if (previous <= 0) {
    return `- ${label}: 今月 ${current.toLocaleString()}${unit} / 前月データなし`;
  }
  const change = ((current - previous) / previous) * 100;
  return `- ${label}: 今月 ${current.toLocaleString()}${unit} / 前月 ${previous.toLocaleString()}${unit} / 前月比 ${formatSignedPercent(change)}`;
}

export function buildPreviousComparisonText(input: {
  analyzedCount: number;
  totalLikes: number;
  totalReach: number;
  totalComments: number;
  totalShares: number;
  totalReposts: number;
  totalSaves: number;
  totalFollowerIncrease: number;
  engagementRate: number | null;
  previous: {
    analyzedCount: number;
    totalLikes: number;
    totalReach: number;
    totalComments: number;
    totalShares: number;
    totalReposts: number;
    totalSaves: number;
    totalFollowerIncrease: number;
    engagementRate: number | null;
  };
}): string {
  if (input.previous.analyzedCount <= 0) {
    return "前月の分析済み投稿データがないため、前月比は算出できません。今月データを基準値として扱ってください。";
  }

  const engagementLine =
    input.engagementRate === null || input.previous.engagementRate === null
      ? "- エンゲージメント率: 今月または前月の閲覧数不足により比較不可"
      : `- エンゲージメント率: 今月 ${input.engagementRate.toFixed(2)}% / 前月 ${input.previous.engagementRate.toFixed(2)}% / 前月差 ${formatSignedPoint(input.engagementRate - input.previous.engagementRate)}`;

  return [
    formatMetricComparison("分析済み投稿数", input.analyzedCount, input.previous.analyzedCount, "件"),
    formatMetricComparison("閲覧数", input.totalReach, input.previous.totalReach, "人"),
    formatMetricComparison("いいね数", input.totalLikes, input.previous.totalLikes, "件"),
    formatMetricComparison("コメント数", input.totalComments, input.previous.totalComments, "件"),
    formatMetricComparison("保存数", input.totalSaves, input.previous.totalSaves, "件"),
    formatMetricComparison("シェア数", input.totalShares, input.previous.totalShares, "件"),
    formatMetricComparison("リポスト数", input.totalReposts, input.previous.totalReposts, "件"),
    formatMetricComparison("フォロワー増加数", input.totalFollowerIncrease, input.previous.totalFollowerIncrease, "人"),
    engagementLine,
  ].join("\n");
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

${params.monthName}は分析済み投稿が${params.analyzedCount}件と、まだデータが少ない状態です。より精度の高い分析のためには、引き続き投稿データを蓄積していくことが大切です。

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

export function isNoDataMonthlyReview(reviewText: string): boolean {
  const normalized = String(reviewText || "").trim();
  if (!normalized) {
    return false;
  }
  return normalized.includes("のデータがまだありません。投稿を開始してデータを蓄積しましょう。");
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
    reviewText.includes("3. 次月への反映") ||
    reviewText.includes("4. 次月への反映") ||
    reviewText.includes("次月への反映") ||
    reviewText.includes("来月のAI方針") ||
    reviewText.includes("に向けた提案")
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
- リポスト数: ${input.totalReposts.toLocaleString()}
- コメント数: ${input.totalComments.toLocaleString()}
- 保存数: ${input.totalSaves.toLocaleString()}
- シェア数: ${input.totalShares.toLocaleString()}
- フォロワー増加数: ${input.totalFollowerIncrease > 0 ? "+" : ""}${input.totalFollowerIncrease.toLocaleString()}人${input.followerChangeText}
- エンゲージメント率（リール+フィード）: ${input.engagementRateNeedsReachInput ? "閲覧数未入力のため算出不可" : input.engagementRate === null ? "データ不足" : `${input.engagementRate.toFixed(2)}%`}
- エンゲージメント率の参考レンジ: Instagram全体平均 0.43%〜2.2% / 良好 1%〜5% / 優れた水準 5%以上
${input.hasPlan ? `- 運用計画: ${input.planTitle || "あり"}` : "- 運用計画: 未設定"}
${input.businessInfoText}
${input.aiSettingsText}

【前月との比較】
${input.previousComparisonText}

【投稿タイプ別の統計】
${input.postTypeInfo}

【最も閲覧された投稿】
${input.topPostInfo}

${input.postSummaryInsights ? `\n【投稿ごとのAI分析結果の集計】\n${input.postSummaryInsights}` : ""}
${directionBlock}

【最重要ルール】
- 出力は必ず以下のレポート形式に固定し、見出しを変えない。
- 数値は入力データにあるものだけ使う（未提供データの推測禁止）。
- パフォーマンス評価は主要KPI（いいね・コメント・シェア・保存・リポスト・フォロワー増減・エンゲージメント率）を基準にし、リーチ増減を主評価にしない。
- 「前月からの変化」では、前月比較データを使って伸びた指標と落ちた指標を明確に分ける。
- 「総評」では、良かったことと悪かったこと・課題を必ず両方書く。前月データがない場合は、今月の良かった点と次に検証すべき課題として書く。
- 文体は自然で読みやすく、硬すぎる報告書口調を避ける。
- 「コンテンツ別の傾向」では、投稿タイプ別統計を使って「フィードとリールのどちらが多いか」を必ず1文で触れる。
- 「提案」は2つ固定。各提案は「タイトル + 説明 + 実行手順」の3要素を持たせる。
- 実行手順は投稿制作で使える具体指示にする（投稿型・本数・訴求テーマ・CTAのうち2つ以上）。
- 提案パートでハッシュタグには触れない。ハッシュタグ提案やタグ数の指定をしない。
- 同じ内容の言い換えを繰り返さない。
- 出力本文で丸括弧「（」「）」は使わない。

【出力テンプレート（この見出しを必ず使用）】
📊 Instagram運用レポート（${input.currentMonth}総括）

⸻

🔹 アカウント全体の動き
\t•\tいいね：
\t•\tコメント：
\t•\tシェア：
\t•\t保存：
\t•\tリポスト：
\t•\tフォロワー増減：
\t•\tエンゲージメント率：
2〜3文で全体傾向を要約

⸻

🔹 前月からの変化
\t•\t伸びた指標：
\t•\t落ちた指標：
\t•\t変化から見えること：
2〜3文で、先月と比べて何が変わったかを要約

⸻

🔹 コンテンツ別の傾向
\t•\t投稿タイプの内訳（フィード/リール/ストーリー）：
\t•\tもっとも閲覧されたコンテンツ：
2〜3文で、何が伸びたか・なぜかを要約

⸻

💡 総評
\t•\t良かったこと：
\t•\t悪かったこと・課題：
今月の成果と改善余地を2〜4文でまとめる

⸻

📈 ${input.nextMonth}に向けた提案
\t1.\t提案タイトル
\t　説明
\t　→ 実行手順: 投稿制作に使える具体ルール
\t2.\t提案タイトル
\t　説明
\t　→ 実行手順: 投稿制作に使える具体ルール

【出力開始行】
📊 Instagram運用レポート（${input.currentMonth}総括）`;
}

export function buildProposalPrompt(input: ProposalPromptInput): string {
  return `以下のInstagram運用データを基に、${input.nextMonth}に向けた提案を生成してください。

【データ】
- 分析済み投稿数: ${input.analyzedCount}件
- いいね数: ${input.totalLikes.toLocaleString()}
- リポスト数: ${input.totalReposts.toLocaleString()}
- コメント数: ${input.totalComments.toLocaleString()}
- 保存数: ${input.totalSaves.toLocaleString()}
- フォロワー増加数: ${input.totalFollowerIncrease > 0 ? "+" : ""}${input.totalFollowerIncrease.toLocaleString()}人${input.followerChangeText}
- エンゲージメント率（リール+フィード）: ${input.engagementRateNeedsReachInput ? "閲覧数未入力のため算出不可" : input.engagementRate === null ? "データ不足" : `${input.engagementRate.toFixed(2)}%`}
- エンゲージメント率の参考レンジ: Instagram全体平均 0.43%〜2.2% / 良好 1%〜5% / 優れた水準 5%以上
${input.businessInfoText}
${input.aiSettingsText}

【前月との比較】
${input.previousComparisonText}

【投稿タイプ別の統計】
${input.postTypeSummary}

【最重要ルール】
- 出力は「📈 ${input.nextMonth}に向けた提案」ブロックのみ。
- 提案は2つ固定で、番号付きで出力する。
- 各提案は「タイトル」「説明」「→ 実行手順」の3要素で構成する。
- 実行手順は抽象語だけで終わらせず、「何を」「どの型で」「何本」「どんなCTAで」のうち2要素以上を必ず含める。
- 前月から悪化した指標や課題がある場合は、提案のうち少なくとも1つをその改善に紐づける。
- 提案パートでハッシュタグには触れない。ハッシュタグ提案やタグ数の指定をしない。
- 文体はやわらかく、短く、実務で使える表現にする。

【出力形式】
📈 ${input.nextMonth}に向けた提案
1. {提案タイトル}
{説明}
→ 実行手順: {具体ルール}
2. {提案タイトル}
{説明}
→ 実行手順: {具体ルール}
`;
}
