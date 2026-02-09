import { UserProfile } from "../../types/user";

/**
 * ユーザープロファイルからAI用のシステムプロンプトを構築
 * 全てのAIエンドポイントで使用する共通関数
 */
export const buildSystemPrompt = (userProfile: UserProfile, snsType?: string): string => {
  const { businessInfo, snsAISettings } = userProfile;

  // NGワードを最優先で表示
  let prompt = `【必須遵守事項（絶対に守る）】\n`;
  
  if (snsType && snsAISettings[snsType]) {
    const settings = snsAISettings[snsType] as {
      enabled: boolean;
      tone?: string;
      features?: string[];
      manner?: string;
      cautions?: string;
      goals?: string;
      motivation?: string;
      additionalInfo?: string;
    };
    
    if (settings.cautions) {
      prompt += `❌ NGワード・注意事項（絶対に使用禁止）: ${settings.cautions}\n`;
    }
    if (settings.manner) {
      prompt += `✅ マナー・ルール（必ず遵守）: ${settings.manner}\n`;
    }
  } else {
    // snsTypeが指定されていない場合、全SNSのNGワードを確認
    const enabledSNS = Object.entries(snsAISettings).filter(([_, settings]) => settings.enabled);
    for (const [sns, settings] of enabledSNS) {
      const snsSettings = settings as {
        enabled: boolean;
        tone?: string;
        features?: string[];
        manner?: string;
        cautions?: string;
        goals?: string;
        motivation?: string;
        additionalInfo?: string;
      };
      if (snsSettings.cautions) {
        prompt += `❌ ${sns.toUpperCase()} NGワード・注意事項（絶対に使用禁止）: ${snsSettings.cautions}\n`;
      }
      if (snsSettings.manner) {
        prompt += `✅ ${sns.toUpperCase()} マナー・ルール（必ず遵守）: ${snsSettings.manner}\n`;
      }
    }
  }
  
  prompt += `\nあなたはSNS運用をサポートする専門AIアシスタントです。

【クライアント情報】
- 企業名/名前: ${userProfile.name}
- 業種: ${businessInfo.industry || "未設定"}
- 会社規模: ${businessInfo.companySize || "未設定"}
- 事業形態: ${businessInfo.businessType || "未設定"}
- ターゲット市場: ${businessInfo.targetMarket || "未設定"}
${businessInfo.catchphrase ? `- キャッチコピー: 「${businessInfo.catchphrase}」` : ""}
- 事業内容: ${businessInfo.description || "未設定"}

【商品・サービス情報（全${businessInfo.productsOrServices?.length || 0}件）】
${
  businessInfo.productsOrServices && businessInfo.productsOrServices.length > 0
    ? businessInfo.productsOrServices
        .map((p, index) => {
          let productInfo = `${index + 1}. ${p.name}`;
          if (p.details) {
            productInfo += `\n   詳細: ${p.details}`;
          }
          if (p.price) {
            productInfo += `\n   価格: ${p.price}円（税込）`;
          }
          return productInfo;
        })
        .join("\n\n")
    : "- 未設定"
}

${businessInfo.productsOrServices && businessInfo.productsOrServices.length > 0 ? `**重要**: 上記の全${businessInfo.productsOrServices.length}件の商品・サービス情報を幅広く活用し、投稿ごとに異なる商品・サービスを取り上げてください。各商品の詳細情報（details）を必ず考慮して、その特徴や魅力を自然に織り込んでください。` : ""}

【目標】
${
  businessInfo.goals && businessInfo.goals.length > 0
    ? businessInfo.goals.map((g) => `- ${g}`).join("\n")
    : "- 未設定"
}

【課題】
${
  businessInfo.challenges && businessInfo.challenges.length > 0
    ? businessInfo.challenges.map((c) => `- ${c}`).join("\n")
    : "- 未設定"
}
`;

  // SNS固有の設定（snsTypeが指定されている場合）
  if (snsType && snsAISettings[snsType]) {
    const settings = snsAISettings[snsType] as {
      enabled: boolean;
      tone?: string;
      features?: string[];
      manner?: string;
      cautions?: string;
      goals?: string;
      motivation?: string;
      additionalInfo?: string;
    };

    if (settings.enabled) {
      prompt += `
【${snsType.toUpperCase()} AI設定】
- トーン: ${settings.tone || "フレンドリー"}
- 有効機能: ${settings.features && settings.features.length > 0 ? settings.features.join(", ") : "なし"}
`;

      // 拡張項目（NGワードとマナーは既に最優先セクションで表示済みなので、ここでは他の項目のみ）
      if (settings.goals) {
        prompt += `- ${snsType.toUpperCase()}運用の目標: ${settings.goals}\n`;
      }
      if (settings.motivation) {
        prompt += `- 運用動機: ${settings.motivation}\n`;
      }
      if (settings.additionalInfo) {
        prompt += `- その他参考情報: ${settings.additionalInfo}\n`;
      }
    }
  } else {
    // 全SNSの設定を含める
    const enabledSNS = Object.entries(snsAISettings).filter(([_, settings]) => settings.enabled);
    if (enabledSNS.length > 0) {
      prompt += "\n【SNS AI設定】\n";
      enabledSNS.forEach(([sns, settings]) => {
        prompt += `- ${sns.toUpperCase()}: トーン「${settings.tone || "フレンドリー"}」`;
        if (settings.features && settings.features.length > 0) {
          prompt += ` | 機能: ${settings.features.join(", ")}`;
        }
        prompt += "\n";
      });
    }
  }

  prompt += `
【重要な指示】
1. 上記のクライアント情報を常に考慮してください
2. 目標達成に向けた提案を行ってください
3. 課題を解決するアプローチを含めてください
4. 指定されたトーンとスタイルを維持してください
5. ターゲット市場に適した内容を生成してください
`;

  return prompt;
};

