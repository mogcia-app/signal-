/**
 * AI戦略を3段階の情報提示用にパースするユーティリティ
 */

export interface SimpleStrategy {
  thisWeekTasks: Array<{ day: string; task: string }>;
  thisMonthGoals: Array<{ goal: string; description?: string }>;
  mostImportant: string;
}

export interface DetailedStrategy {
  threeMonthPlan: Array<{ month: number; title: string; steps: string[] }>;
  growthTarget: {
    current: number;
    targets: Array<{ month: number; followers: number; gain: number }>;
    message: string;
  };
  whyThisStrategy: string[];
}

export interface AdvancedStrategy {
  overallStrategy: string;
  postDesign: string;
  customerJourney: string;
  keyMetrics: string;
}

/**
 * AI戦略から「今週やること」を抽出
 */
export function extractThisWeekTasks(strategy: string, formData: any): SimpleStrategy["thisWeekTasks"] {
  const tasks: Array<{ day: string; task: string }> = [];
  
  // 新しい形式: 【レベル1】超シンプル版から抽出
  const level1Match = strategy.match(/【レベル1】.*?超シンプル版([\s\S]*?)(?=【レベル2】|$)/i);
  if (level1Match) {
    const level1Content = level1Match[1];
    
    // 📅 今週やること セクションから抽出
    const thisWeekMatch = level1Content.match(/📅.*?今週やること([\s\S]*?)(?=🎯|💡|$)/i);
    if (thisWeekMatch) {
      const thisWeekContent = thisWeekMatch[1];
      
      // 週間スケジュールを抽出
      const weeklyPatterns = [
        /(?:月曜|月|Monday).*?[:：]\s*(.+?)(?:\n|$)/i,
        /(?:火曜|火|Tuesday).*?[:：]\s*(.+?)(?:\n|$)/i,
        /(?:水曜|水|Wednesday).*?[:：]\s*(.+?)(?:\n|$)/i,
        /(?:木曜|木|Thursday).*?[:：]\s*(.+?)(?:\n|$)/i,
        /(?:金曜|金|Friday).*?[:：]\s*(.+?)(?:\n|$)/i,
        /(?:土曜|土|Saturday).*?[:：]\s*(.+?)(?:\n|$)/i,
        /(?:日曜|日|Sunday).*?[:：]\s*(.+?)(?:\n|$)/i,
        /(?:毎日|daily).*?[:：]\s*(.+?)(?:\n|$)/i,
      ];
      
      const days = ["月", "火", "水", "木", "金", "土", "日", "毎日"];
      weeklyPatterns.forEach((pattern, index) => {
        const match = thisWeekContent.match(pattern);
        if (match && match[1]) {
          tasks.push({
            day: days[index] || "毎日",
            task: match[1].trim().replace(/\*\*/g, "").replace(/[-•]\s*/g, ""),
          });
        }
      });
    }
  }
  
  // 旧形式: 投稿設計セクションから抽出（後方互換性）
  if (tasks.length === 0) {
    const postDesignMatch = strategy.match(/②.*?投稿設計([\s\S]*?)(?=③|④|$)/i);
    if (postDesignMatch) {
      const postDesign = postDesignMatch[1];
      
      const weeklyPatterns = [
        /(?:月曜|月|Monday).*?[:：]\s*(.+?)(?:\n|$)/i,
        /(?:火曜|火|Tuesday).*?[:：]\s*(.+?)(?:\n|$)/i,
        /(?:水曜|水|Wednesday).*?[:：]\s*(.+?)(?:\n|$)/i,
        /(?:木曜|木|Thursday).*?[:：]\s*(.+?)(?:\n|$)/i,
        /(?:金曜|金|Friday).*?[:：]\s*(.+?)(?:\n|$)/i,
        /(?:土曜|土|Saturday).*?[:：]\s*(.+?)(?:\n|$)/i,
        /(?:日曜|日|Sunday).*?[:：]\s*(.+?)(?:\n|$)/i,
      ];
      
      const days = ["月", "火", "水", "木", "金", "土", "日"];
      weeklyPatterns.forEach((pattern, index) => {
        const match = postDesign.match(pattern);
        if (match && match[1]) {
          tasks.push({
            day: days[index],
            task: match[1].trim().replace(/\*\*/g, "").replace(/[-•]\s*/g, ""),
          });
        }
      });
    }
  }
  
  // パターンが見つからない場合、デフォルトのタスクを生成
  if (tasks.length === 0) {
    const reelFreq = formData?.reelFreq || formData?.reelCapability || "週1回";
    const feedFreq = formData?.feedFreq || "週3回";
    const storyFreq = formData?.storyFreq || formData?.storyFrequency || "毎日";
    
    if (storyFreq.includes("毎日") || storyFreq.includes("daily")) {
      tasks.push({ day: "毎日", task: "ストーリーで日常をシェア" });
    }
    
    if (reelFreq.includes("週") || reelFreq.includes("week")) {
      tasks.push({ day: "水", task: "リール動画を1本投稿" });
    }
    
    if (feedFreq.includes("週") || feedFreq.includes("week")) {
      tasks.push({ day: "金", task: "写真投稿を1本" });
    }
  }
  
  return tasks;
}

/**
 * AI戦略から「今月の目標」を抽出
 */
export function extractThisMonthGoals(strategy: string, formData: any): SimpleStrategy["thisMonthGoals"] {
  const goals: Array<{ goal: string; description?: string }> = [];
  
  // 新しい形式: 【レベル1】超シンプル版から抽出
  const level1Match = strategy.match(/【レベル1】.*?超シンプル版([\s\S]*?)(?=【レベル2】|$)/i);
  if (level1Match) {
    const level1Content = level1Match[1];
    
    // 🎯 今月の目標 セクションから抽出
    const goalsMatch = level1Content.match(/🎯.*?今月の目標([\s\S]*?)(?=💡|$)/i);
    if (goalsMatch) {
      const goalsContent = goalsMatch[1];
      
      // 目標を抽出（リスト形式）
      const goalLines = goalsContent.split(/\n/).filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && 
               (trimmed.includes('%') || 
                trimmed.includes('個') || 
                trimmed.includes('倍') ||
                trimmed.includes('以上') ||
                trimmed.includes('増'));
      });
      
      goalLines.forEach(line => {
        const cleaned = line.replace(/^[-•\s]+/, '').trim();
        if (cleaned.length > 0) {
          // 「なぜこの数字?」の説明を探す
          const whyMatch = goalsContent.match(new RegExp(cleaned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?なぜ.*?\\?([\\s\\S]*?)(?=\\n|$)', 'i'));
          const description = whyMatch ? whyMatch[1].trim().replace(/[。、]/g, '') : undefined;
          
          goals.push({
            goal: cleaned.replace(/\*\*/g, ""),
            description: description || (cleaned.includes('60%') ? "業界平均は50%前後。60%を超えると「よく見られてる」アカウントになります。" : undefined),
          });
        }
      });
    }
  }
  
  // 旧形式: 注視すべき指標セクションから抽出（後方互換性）
  if (goals.length === 0) {
    const metricsMatch = strategy.match(/④.*?注視.*?指標([\s\S]*?)(?=$)/i);
    if (metricsMatch) {
      const metrics = metricsMatch[1];
      
      const metricPatterns = [
        /ストーリーズ.*?閲覧率.*?[:：]\s*(\d+)%/i,
        /スタンプ.*?反応率.*?[:：]\s*(\d+)%/i,
        /投稿.*?いいね.*?[:：]\s*(\d+)/i,
        /プロフィール.*?アクセス.*?[:：]\s*(\d+)%/i,
      ];
      
      metricPatterns.forEach((pattern) => {
        const match = metrics.match(pattern);
        if (match) {
          const value = match[1];
          if (pattern.source.includes("閲覧率")) {
            goals.push({
              goal: `ストーリーを見てくれる人: ${value}%以上`,
              description: "業界平均は50%前後。60%を超えると「よく見られてる」アカウントになります。",
            });
          } else if (pattern.source.includes("反応率")) {
            goals.push({
              goal: `投票や質問に答えてくれる人: ${value}%以上`,
            });
          } else if (pattern.source.includes("いいね")) {
            goals.push({
              goal: `投稿へのいいね: ${value}個以上`,
            });
          } else if (pattern.source.includes("アクセス")) {
            goals.push({
              goal: `プロフィール閲覧: ${value}%増`,
            });
          }
        }
      });
    }
  }
  
  // パターンが見つからない場合、デフォルトの目標を生成
  if (goals.length === 0) {
    goals.push({
      goal: "ストーリーを見てくれる人: 60%以上",
      description: "業界平均は50%前後。60%を超えると「よく見られてる」アカウントになります。",
    });
    goals.push({
      goal: "投稿へのいいね: 50個以上",
    });
    goals.push({
      goal: "プロフィール閲覧: 2倍に",
    });
  }
  
  return goals;
}

/**
 * AI戦略から「一番大事なこと」を抽出
 */
export function extractMostImportant(strategy: string): string {
  // 新しい形式: 【レベル1】超シンプル版から抽出
  const level1Match = strategy.match(/【レベル1】.*?超シンプル版([\s\S]*?)(?=【レベル2】|$)/i);
  if (level1Match) {
    const level1Content = level1Match[1];
    
    // 💡 一番大事なこと セクションから抽出
    const mostImportantMatch = level1Content.match(/💡.*?一番大事なこと([\s\S]*?)(?=📋|🎯|$)/i);
    if (mostImportantMatch) {
      const mostImportant = mostImportantMatch[1].trim();
      if (mostImportant.length > 0) {
        // 最初の文を抽出（改行で区切る）
        const firstLine = mostImportant.split(/\n/)[0].trim();
        if (firstLine.length > 10) {
          return firstLine.replace(/\*\*/g, "").replace(/^[-•\s]+/, "").trim();
        }
        return mostImportant.replace(/\*\*/g, "").replace(/^[-•\s]+/, "").trim();
      }
    }
  }
  
  // 旧形式: 全体運用戦略セクションから最初の重要なポイントを抽出（後方互換性）
  const overallMatch = strategy.match(/①.*?全体運用戦略([\s\S]*?)(?=②|$)/i);
  if (overallMatch) {
    const overall = overallMatch[1];
    
    // ストーリーズに関する記述を探す
    const storyMatch = overall.match(/(?:ストーリー|ストーリーズ).*?[。！]/);
    if (storyMatch) {
      return storyMatch[0].replace(/\*\*/g, "").trim();
    }
    
    // 最初の文を抽出
    const firstSentence = overall.split(/[。\n]/)[0];
    if (firstSentence && firstSentence.length > 10) {
      return firstSentence.replace(/\*\*/g, "").trim() + "。";
    }
  }
  
  // デフォルト
  return "毎日ストーリーを投稿して、お客さんとの接点を増やしましょう！";
}

/**
 * AI戦略から「3ヶ月の流れ」を抽出
 */
export function extractThreeMonthPlan(strategy: string, formData: any): DetailedStrategy["threeMonthPlan"] {
  const plan: Array<{ month: number; title: string; steps: string[] }> = [];
  
  // 新しい形式: 【レベル2】詳細版から抽出
  const level2Match = strategy.match(/【レベル2】.*?詳細版([\s\S]*?)(?=【レベル3】|$)/i);
  if (level2Match) {
    const level2Content = level2Match[1];
    
    // 📋 この3ヶ月でやること セクションから抽出
    const threeMonthMatch = level2Content.match(/📋.*?この.*?ヶ月.*?やること([\s\S]*?)(?=📊|💡|$)/i);
    if (threeMonthMatch) {
      const threeMonthContent = threeMonthMatch[1];
      
      // 【ステップ1】、【ステップ2】、【ステップ3】を抽出
      const stepMatches = [
        threeMonthContent.match(/【ステップ1】.*?知ってもらう([\s\S]*?)(?=【ステップ2】|$)/i),
        threeMonthContent.match(/【ステップ2】.*?興味を持ってもらう([\s\S]*?)(?=【ステップ3】|$)/i),
        threeMonthContent.match(/【ステップ3】.*?行動してもらう([\s\S]*?)(?=【ステップ|📊|💡|$)/i),
      ];
      
      const titles = ["知ってもらう", "興味を持ってもらう", "行動してもらう"];
      
      stepMatches.forEach((match, index) => {
        if (match && match[1]) {
          const stepContent = match[1];
          // リスト項目を抽出（- または • で始まる行）
          const steps = stepContent
            .split(/\n/)
            .map(line => line.trim())
            .filter(line => line.startsWith('-') || line.startsWith('•') || line.startsWith('・'))
            .map(line => line.replace(/^[-•・]\s+/, '').replace(/\*\*/g, '').trim())
            .filter(line => line.length > 0);
          
          if (steps.length > 0) {
            plan.push({
              month: index + 1,
              title: titles[index],
              steps: steps,
            });
          }
        }
      });
    }
  }
  
  // 旧形式: カスタマージャーニーセクションから抽出（後方互換性）
  if (plan.length === 0) {
    const journeyMatch = strategy.match(/③.*?カスタマージャーニー([\s\S]*?)(?=④|$)/i);
    if (journeyMatch) {
      const journey = journeyMatch[1];
      
      // ステップを抽出
      const steps = journey.split(/[①②③④⑤⑥]/).filter((s) => s.trim().length > 0);
      if (steps.length >= 3) {
        plan.push({
          month: 1,
          title: "知ってもらう",
          steps: [
            "ストーリーで毎日投稿",
            "「あなたはどっち派?」など質問で反応を集める",
            "週2回、リールで商品を紹介",
          ],
        });
        plan.push({
          month: 2,
          title: "興味を持ってもらう",
          steps: [
            "お客様の声をストーリーでシェア",
            "コーヒーの楽しみ方を発信",
            "コメントに必ず返信する",
          ],
        });
        plan.push({
          month: 3,
          title: "行動してもらう",
          steps: [
            "プロフィールに誘導",
            "DMでの問い合わせを増やす",
            "限定情報をストーリーで先出し",
          ],
        });
      }
    }
  }
  
  // パターンが見つからない場合、デフォルトのプランを生成
  if (plan.length === 0) {
    plan.push({
      month: 1,
      title: "知ってもらう",
      steps: [
        "ストーリーで毎日投稿",
        "質問で反応を集める",
        "週2回、リールで商品を紹介",
      ],
    });
    plan.push({
      month: 2,
      title: "興味を持ってもらう",
      steps: [
        "お客様の声をシェア",
        "コメントに返信",
      ],
    });
    plan.push({
      month: 3,
      title: "行動してもらう",
      steps: [
        "プロフィールに誘導",
        "DMでの問い合わせ増",
      ],
    });
  }
  
  return plan;
}

/**
 * 成長目標を抽出
 */
export function extractGrowthTarget(strategy: string, formData: any): DetailedStrategy["growthTarget"] {
  const current = parseInt(formData?.currentFollowers || "0", 10);
  const target = parseInt(formData?.targetFollowers || "0", 10);
  const period = formData?.planPeriod || "3ヶ月";
  const months = period.includes("3") ? 3 : period.includes("6") ? 6 : period.includes("1年") ? 12 : 1;
  
  const gain = target - current;
  const monthlyGain = Math.round(gain / months);
  
  const targets = [];
  for (let i = 1; i <= months; i++) {
    targets.push({
      month: i,
      followers: current + monthlyGain * i,
      gain: monthlyGain,
    });
  }
  
  return {
    current,
    targets,
    message: "大事なのはフォロワー数より、「反応してくれる人」を増やすこと！",
  };
}

/**
 * 「なぜこの戦略か」を抽出
 */
export function extractWhyThisStrategy(strategy: string): string[] {
  const reasons: string[] = [];
  
  // 新しい形式: 【レベル2】詳細版から抽出
  const level2Match = strategy.match(/【レベル2】.*?詳細版([\s\S]*?)(?=【レベル3】|$)/i);
  if (level2Match) {
    const level2Content = level2Match[1];
    
    // 💡 なぜこの戦略? セクションから抽出
    const whyMatch = level2Content.match(/💡.*?なぜこの戦略\?([\s\S]*?)(?=【レベル3】|📊|$)/i);
    if (whyMatch) {
      const whyContent = whyMatch[1];
      
      // リスト項目を抽出（- または • で始まる行）
      const whyLines = whyContent
        .split(/\n/)
        .map(line => line.trim())
        .filter(line => line.startsWith('-') || line.startsWith('•') || line.startsWith('・'))
        .map(line => line.replace(/^[-•・]\s+/, '').replace(/\*\*/g, '').trim())
        .filter(line => line.length > 0 && line.length < 100);
      
      if (whyLines.length > 0) {
        reasons.push(...whyLines.slice(0, 3));
      }
    }
  }
  
  // 旧形式: 全体運用戦略セクションから理由を抽出（後方互換性）
  if (reasons.length === 0) {
    const overallMatch = strategy.match(/①.*?全体運用戦略([\s\S]*?)(?=②|$)/i);
    if (overallMatch) {
      const overall = overallMatch[1];
      
      // 「なぜ」や「理由」を含む文を探す
      const whyPatterns = [
        /(?:なぜ|理由|ため|から).*?[。！]/g,
        /(?:ストーリー|ストーリーズ).*?[。！]/g,
      ];
      
      whyPatterns.forEach((pattern) => {
        const matches = overall.match(pattern);
        if (matches) {
          matches.forEach((match) => {
            const cleaned = match.replace(/\*\*/g, "").trim();
            if (cleaned.length > 10 && cleaned.length < 100) {
              reasons.push(cleaned);
            }
          });
        }
      });
    }
  }
  
  // パターンが見つからない場合、デフォルトの理由を返す
  if (reasons.length === 0) {
    reasons.push("ストーリーは24時間で消えるから気軽に投稿できる");
    reasons.push("毎日投稿すると「忘れられない」");
    reasons.push("質問スタンプで反応してもらうと、次も見てもらえる");
  }
  
  return reasons.slice(0, 3); // 最大3つ
}

/**
 * 上級者向け戦略を抽出（既存の4セクション）
 */
export function extractAdvancedStrategy(strategy: string): AdvancedStrategy {
  // 新しい形式: 【レベル3】上級者向けから抽出
  const level3Match = strategy.match(/【レベル3】.*?上級者向け([\s\S]*?)(?=$)/i);
  if (level3Match) {
    const level3Content = level3Match[1];
    
    const overallMatch = level3Content.match(/①.*?全体運用戦略([\s\S]*?)(?=②|$)/i);
    const postDesignMatch = level3Content.match(/②.*?投稿設計([\s\S]*?)(?=③|$)/i);
    const journeyMatch = level3Content.match(/③.*?カスタマージャーニー([\s\S]*?)(?=④|$)/i);
    const metricsMatch = level3Content.match(/④.*?注視.*?指標([\s\S]*?)(?=$)/i);
    
    if (overallMatch || postDesignMatch || journeyMatch || metricsMatch) {
      return {
        overallStrategy: overallMatch ? overallMatch[1].trim() : "",
        postDesign: postDesignMatch ? postDesignMatch[1].trim() : "",
        customerJourney: journeyMatch ? journeyMatch[1].trim() : "",
        keyMetrics: metricsMatch ? metricsMatch[1].trim() : "",
      };
    }
  }
  
  // 旧形式: 既存の4セクションから抽出（後方互換性）
  const overallMatch = strategy.match(/①.*?全体運用戦略([\s\S]*?)(?=②|$)/i);
  const postDesignMatch = strategy.match(/②.*?投稿設計([\s\S]*?)(?=③|$)/i);
  const journeyMatch = strategy.match(/③.*?カスタマージャーニー([\s\S]*?)(?=④|$)/i);
  const metricsMatch = strategy.match(/④.*?注視.*?指標([\s\S]*?)(?=$)/i);
  
  return {
    overallStrategy: overallMatch ? overallMatch[1].trim() : "",
    postDesign: postDesignMatch ? postDesignMatch[1].trim() : "",
    customerJourney: journeyMatch ? journeyMatch[1].trim() : "",
    keyMetrics: metricsMatch ? metricsMatch[1].trim() : "",
  };
}

/**
 * 専門用語の翻訳表
 */
export const TERM_TRANSLATION: Record<string, string> = {
  "カスタマージャーニー": "お客さんが購入するまでの流れ",
  "日常接触": "毎日投稿を見てもらう",
  "投稿初動反応": "投稿後24時間の反応",
  "ストーリーズ閲覧率": "ストーリーを見てくれた人の割合",
  "スタンプ反応率": "投票や質問に答えてくれた人の割合",
  "エンゲージメント": "いいねやコメントなどの反応",
  "リーチ": "投稿を見た人の数",
  "インプレッション": "投稿が表示された回数",
};

/**
 * 専門用語を初心者向けに翻訳
 */
export function translateTerm(term: string): string {
  return TERM_TRANSLATION[term] || term;
}

