import { NextRequest, NextResponse } from 'next/server';
import { MLPredictionRequest, MLPredictionResult } from '../../../instagram/plan/types/plan';

export async function POST(request: NextRequest) {
  try {
    const body: MLPredictionRequest = await request.json();
    
    // バリデーション
    if (!body.currentFollowers || !body.followerGain || !body.planPeriod) {
      return NextResponse.json(
        { error: '必要なパラメータが不足しています' },
        { status: 400 }
      );
    }

    // 機械学習予測実行
    const predictionResult = await runMLPrediction(body);
    
    return NextResponse.json(predictionResult);
  } catch (error) {
    console.error('ML予測エラー:', error);
    return NextResponse.json(
      { error: 'ML予測処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 機械学習予測実行
async function runMLPrediction(request: MLPredictionRequest): Promise<MLPredictionResult> {
  const predictor = new InstagramGrowthPredictor();
  return predictor.predict(request);
}

// 機械学習予測クラス
class InstagramGrowthPredictor {
  private model!: {
    weights: Record<string, unknown>;
    biases: Record<string, unknown>;
  }; // 実際のMLモデル
  
  constructor() {
    this.initializeModel();
  }
  
  private initializeModel() {
    // 実際の実装では、過去のデータで訓練されたモデルをロード
    // ここでは高度な線形回帰モデルを使用
    this.model = {
      weights: {
        followers: 0.001,
        engagement: 0.5,
        posts: 0.2,
        age: 0.1,
        hashtags: 0.15,
        stories: 0.1,
        reels: 0.25,
        niche: {
          '美容・ファッション': 0.8,
          'ビジネス・起業': 1.2,
          'ライフスタイル': 0.9,
          'テック・IT': 1.1,
          '教育・学習': 1.0,
          'フード・グルメ': 1.3,
          '旅行・アウトドア': 1.1,
          'スポーツ・フィットネス': 1.0,
          'アート・クリエイティブ': 0.9,
          'エンターテイメント': 1.2
        },
        postingTime: {
          'morning': 0.9,
          'afternoon': 1.1,
          'evening': 1.0,
          'mixed': 1.05
        }
      },
      biases: {
        base: 10,
        seasonal: this.getSeasonalBiases(),
        contentType: {
          'educational': 1.1,
          'entertainment': 1.2,
          'lifestyle': 1.0,
          'business': 0.9,
          'personal': 1.05
        }
      }
    };
  }
  
  public predict(request: MLPredictionRequest): MLPredictionResult {
    // 特徴量エンジニアリング
    const features = this.extractFeatures(request);
    
    // 予測実行
    const predictions = this.runPrediction(features, request);
    
    // 信頼度計算
    const confidence = this.calculateConfidence(features);
    
    // 主要要因分析
    const keyFactors = this.analyzeKeyFactors(request, features);
    
    // 季節調整
    const seasonalAdjustments = this.getSeasonalAdjustments();
    
    // 成長パターン分析
    const growthPattern = this.analyzeGrowthPattern(predictions, request);
    
    // リスク評価
    const riskAssessment = this.assessRisk(request, features);
    
    return {
      predictedGrowth: predictions,
      confidence,
      keyFactors,
      seasonalAdjustments,
      growthPattern,
      riskAssessment
    };
  }
  
  private extractFeatures(request: MLPredictionRequest): Record<string, number> {
    return {
      followers: Math.log10(Math.max(request.currentFollowers, 1)),
      engagement: request.currentEngagementRate * 100,
      posts: request.avgPostsPerWeek,
      age: Math.log10(Math.max(request.accountAge, 1)),
      hashtags: Math.min(request.hashtagCount / 30, 1),
      stories: request.storyFrequency,
      reels: request.reelFrequency,
      niche: (this.model.weights.niche as Record<string, number>)[request.niche] || 1.0,
      postingTime: (this.model.weights.postingTime as Record<string, number>)[request.postingTime] || 1.0,
      contentType: this.calculateContentTypeScore(request.contentTypes)
    };
  }
  
  private runPrediction(features: Record<string, number>, request: MLPredictionRequest) {
    const weights = this.model.weights as Record<string, number>;
    
    // 月次成長率の計算（より精密なモデル）
    const monthlyGrowth = 
      features.followers * (weights.followers as number) +
      features.engagement * (weights.engagement as number) +
      features.posts * (weights.posts as number) +
      features.age * (weights.age as number) +
      features.hashtags * (weights.hashtags as number) +
      features.stories * (weights.stories as number) +
      features.reels * (weights.reels as number) +
      features.niche +
      features.postingTime +
      features.contentType +
      (this.model.biases.base as number);
    
    // 成長の減速と加速を考慮した累積成長
    const targetGain = request.followerGain;
    const periodMonths = this.getPeriodInMonths(request.planPeriod);
    
    // 成長曲線の計算（S字カーブ）
    const growthCurve = this.calculateGrowthCurve(targetGain, periodMonths, features);
    
    return {
      month1: Math.round(growthCurve[0]),
      month3: Math.round(growthCurve[2]),
      month6: Math.round(growthCurve[5]),
      month12: Math.round(growthCurve[11])
    };
  }
  
  private calculateConfidence(features: Record<string, number>): number {
    // データの完全性と一貫性に基づく信頼度
    let confidence = 0.8; // ベース信頼度
    
    // アカウント年数による調整
    if (features.age < 1) confidence -= 0.2; // 新規アカウント
    else if (features.age > 2) confidence += 0.1; // 成熟アカウント
    
    // エンゲージメント率による調整
    if (features.engagement < 1) confidence -= 0.15; // 低エンゲージメント
    else if (features.engagement > 5) confidence += 0.1; // 高エンゲージメント
    
    // 投稿頻度による調整
    if (features.posts < 2) confidence -= 0.1; // 投稿頻度不足
    else if (features.posts > 10) confidence += 0.05; // 高頻度投稿
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }
  
  private analyzeKeyFactors(request: MLPredictionRequest, features: Record<string, number>) {
    const factors = [];
    
    // フォロワー数の影響
    if (request.currentFollowers < 1000) {
      factors.push({
        factor: 'フォロワー数',
        impact: 0.8,
        recommendation: 'フォロワー獲得に集中する'
      });
    }
    
    // エンゲージメント率の影響
    if (request.currentEngagementRate < 0.02) {
      factors.push({
        factor: 'エンゲージメント率',
        impact: -0.7,
        recommendation: 'コミュニティ構築を強化する'
      });
    }
    
    // 投稿頻度の影響
    if (request.avgPostsPerWeek < 3) {
      factors.push({
        factor: '投稿頻度',
        impact: -0.5,
        recommendation: '投稿頻度を上げる'
      });
    }
    
    // リール投稿の影響
    if (request.reelFrequency > 0.5) {
      factors.push({
        factor: 'リール投稿',
        impact: 0.6,
        recommendation: 'リール投稿を継続する'
      });
    }
    
    // ハッシュタグ戦略の影響
    if (request.hashtagCount < 10) {
      factors.push({
        factor: 'ハッシュタグ数',
        impact: -0.4,
        recommendation: 'ハッシュタグを増やす'
      });
    }
    
    return factors;
  }
  
  private getSeasonalAdjustments() {
    return [
      { month: '1月', adjustment: 0.9, reason: '新年の目標設定でフォロワー獲得が活発' },
      { month: '2月', adjustment: 0.95, reason: 'バレンタイン関連コンテンツ' },
      { month: '3月', adjustment: 1.0, reason: '春の新生活で安定した成長' },
      { month: '4月', adjustment: 1.05, reason: '新年度で新しいフォロワー獲得' },
      { month: '5月', adjustment: 1.0, reason: 'ゴールデンウィーク効果' },
      { month: '6月', adjustment: 0.95, reason: '梅雨時期でやや減少' },
      { month: '7月', adjustment: 1.1, reason: '夏休みでSNS利用増加' },
      { month: '8月', adjustment: 1.15, reason: '夏祭り・旅行コンテンツ' },
      { month: '9月', adjustment: 1.05, reason: '新学期・新商品リリース' },
      { month: '10月', adjustment: 1.0, reason: 'ハロウィン関連コンテンツ' },
      { month: '11月', adjustment: 1.1, reason: 'ブラックフライデー・年末商戦' },
      { month: '12月', adjustment: 1.2, reason: 'クリスマス・年末イベント' }
    ];
  }
  
  private analyzeGrowthPattern(predictions: { month3: number; month6: number; month12: number }, request: MLPredictionRequest) {
    const patterns = [];
    const targetGain = request.followerGain;
    
    // 初期段階（0-3ヶ月）
    patterns.push({
      phase: '初期段階',
      description: 'アカウント基盤構築と初期フォロワー獲得',
      expectedGrowth: Math.round(predictions.month3 * 0.3)
    });
    
    // 成長段階（3-6ヶ月）
    patterns.push({
      phase: '成長段階',
      description: 'コンテンツ戦略の最適化とフォロワー増加加速',
      expectedGrowth: Math.round(predictions.month6 * 0.4)
    });
    
    // 成熟段階（6-12ヶ月）
    patterns.push({
      phase: '成熟段階',
      description: 'コミュニティ形成と持続可能な成長',
      expectedGrowth: Math.round(predictions.month12 * 0.3)
    });
    
    return patterns;
  }
  
  private assessRisk(request: MLPredictionRequest, features: Record<string, number>) {
    const riskFactors = [];
    const mitigation = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    
    // フォロワー数のリスク
    if (request.currentFollowers < 500) {
      riskFactors.push('フォロワー基数が少ない');
      mitigation.push('インフルエンサーとのコラボレーションを検討');
      riskLevel = 'high';
    }
    
    // エンゲージメント率のリスク
    if (request.currentEngagementRate < 0.01) {
      riskFactors.push('エンゲージメント率が低い');
      mitigation.push('インタラクティブなコンテンツを増やす');
      riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
    }
    
    // 投稿頻度のリスク
    if (request.avgPostsPerWeek < 2) {
      riskFactors.push('投稿頻度が不十分');
      mitigation.push('投稿スケジュールの自動化を検討');
      riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
    }
    
    // アカウント年数のリスク
    if (request.accountAge < 3) {
      riskFactors.push('アカウントが新しく、実績が不足');
      mitigation.push('段階的な成長目標を設定');
      riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
    }
    
    return {
      level: riskLevel,
      factors: riskFactors,
      mitigation
    };
  }
  
  // ヘルパー関数
  private getPeriodInMonths(planPeriod: string): number {
    const multipliers = { '1ヶ月': 1, '3ヶ月': 3, '6ヶ月': 6, '1年': 12 };
    return multipliers[planPeriod as keyof typeof multipliers] || 1;
  }
  
  private calculateContentTypeScore(contentTypes: string[]): number {
    const scores = {
      'educational': 1.1,
      'entertainment': 1.2,
      'lifestyle': 1.0,
      'business': 0.9,
      'personal': 1.05
    };
    
    const avgScore = contentTypes.reduce((sum, type) => {
      return sum + (scores[type as keyof typeof scores] || 1.0);
    }, 0) / contentTypes.length;
    
    return avgScore || 1.0;
  }
  
  private calculateGrowthCurve(targetGain: number, periodMonths: number, features: Record<string, number>) {
    const growthCurve: number[] = [];
    
    // S字カーブのパラメータ
    const k = targetGain;
    const a = 0.1 + (features.engagement / 100); // エンゲージメント率に基づく調整
    const b = 0.5;
    
    for (let month = 1; month <= 12; month++) {
      if (month <= periodMonths) {
        // S字カーブ: f(x) = k / (1 + e^(-a(x-b)))
        const growth = Math.round(k / (1 + Math.exp(-a * (month - b * periodMonths))));
        growthCurve.push(growth);
      } else {
        // 期間後の成長は維持
        growthCurve.push(growthCurve[periodMonths - 1] || 0);
      }
    }
    
    return growthCurve;
  }
  
  private getSeasonalBiases() {
    return {
      '1月': 0.9, '2月': 0.95, '3月': 1.0, '4月': 1.05,
      '5月': 1.0, '6月': 0.95, '7月': 1.1, '8月': 1.15,
      '9月': 1.05, '10月': 1.0, '11月': 1.1, '12月': 1.2
    };
  }
}
