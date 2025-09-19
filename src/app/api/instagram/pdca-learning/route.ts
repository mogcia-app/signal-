import { NextRequest, NextResponse } from 'next/server';
import { PDCARecord, TrendAnalysis, LearningModel, MLPredictionRequest } from '../../../instagram/plan/types/plan';

export async function POST(request: NextRequest) {
  try {
    const body: { 
      action: 'save_record' | 'get_trends' | 'get_learning_model' | 'update_prediction';
      data?: PDCARecord;
      userId?: string;
      predictionRequest?: MLPredictionRequest;
    } = await request.json();
    
    const pdcaLearning = new PDCALearningSystem();
    
    switch (body.action) {
      case 'save_record':
        if (!body.data) {
          return NextResponse.json({ error: 'PDCAレコードが必要です' }, { status: 400 });
        }
        const savedRecord = await pdcaLearning.savePDCARecord(body.data);
        return NextResponse.json(savedRecord);
        
      case 'get_trends':
        if (!body.userId) {
          return NextResponse.json({ error: 'ユーザーIDが必要です' }, { status: 400 });
        }
        const trends = await pdcaLearning.analyzeTrends(body.userId);
        return NextResponse.json(trends);
        
      case 'get_learning_model':
        if (!body.userId) {
          return NextResponse.json({ error: 'ユーザーIDが必要です' }, { status: 400 });
        }
        const model = await pdcaLearning.getLearningModel(body.userId);
        return NextResponse.json(model);
        
      case 'update_prediction':
        if (!body.predictionRequest || !body.userId) {
          return NextResponse.json({ error: '予測リクエストとユーザーIDが必要です' }, { status: 400 });
        }
        const improvedPrediction = await pdcaLearning.improvePrediction(body.predictionRequest, body.userId);
        return NextResponse.json(improvedPrediction);
        
      default:
        return NextResponse.json({ error: '無効なアクションです' }, { status: 400 });
    }
  } catch (error) {
    console.error('PDCA学習エラー:', error);
    return NextResponse.json(
      { error: 'PDCA学習処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// PDCA学習システムクラス
class PDCALearningSystem {
  private mockDatabase: PDCARecord[] = [];
  
  // PDCAレコードを保存
  async savePDCARecord(record: PDCARecord): Promise<PDCARecord> {
    // 実際の実装ではFirestoreに保存
    // ここではモックデータベースを使用
    const newRecord = {
      ...record,
      id: `pdca_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.mockDatabase.push(newRecord);
    console.log('PDCAレコード保存:', newRecord);
    
    return newRecord;
  }
  
  // 過去の傾向を分析
  async analyzeTrends(userId: string): Promise<TrendAnalysis> {
    // ユーザーの過去のPDCAレコードを取得
    const userRecords = this.mockDatabase.filter(record => record.userId === userId);
    
    if (userRecords.length === 0) {
      // データがない場合はデフォルトの分析を返す
      return this.getDefaultTrendAnalysis();
    }
    
    // 成長傾向の分析
    const growthTrend = this.analyzeGrowthTrend(userRecords);
    
    // 戦略の効果分析
    const strategyAnalysis = this.analyzeStrategies(userRecords);
    
    // 季節パターンの分析
    const seasonalPatterns = this.analyzeSeasonalPatterns(userRecords);
    
    // コンテンツタイプの分析
    const contentPerformance = this.analyzeContentPerformance(userRecords);
    
    // 推奨事項の生成
    const recommendations = this.generateRecommendations(userRecords, strategyAnalysis);
    
    return {
      period: '過去6ヶ月',
      averageGrowth: this.calculateAverageGrowth(userRecords),
      growthTrend,
      bestStrategies: strategyAnalysis.best,
      worstStrategies: strategyAnalysis.worst,
      seasonalPatterns,
      contentPerformance,
      recommendations
    };
  }
  
  // 学習モデルを取得
  async getLearningModel(userId: string): Promise<LearningModel> {
    const userRecords = this.mockDatabase.filter(record => record.userId === userId);
    
    if (userRecords.length < 3) {
      // データが少ない場合はデフォルトモデル
      return {
        accuracy: 0.6,
        lastUpdated: new Date().toISOString(),
        dataPoints: userRecords.length,
        predictions: {
          followerGrowth: 0,
          engagementRate: 0,
          reach: 0
        },
        confidence: 0.5,
        improvements: ['より多くのデータを蓄積して精度を向上させましょう']
      };
    }
    
    // 実際のデータに基づく学習モデル
    const accuracy = this.calculateModelAccuracy(userRecords);
    const predictions = this.generatePersonalizedPredictions(userRecords);
    const confidence = Math.min(0.95, 0.5 + (userRecords.length * 0.05));
    
    return {
      accuracy,
      lastUpdated: new Date().toISOString(),
      dataPoints: userRecords.length,
      predictions,
      confidence,
      improvements: this.generateImprovements(userRecords)
    };
  }
  
  // 予測を改善
  async improvePrediction(request: MLPredictionRequest, userId: string): Promise<Record<string, unknown>> {
    const userRecords = this.mockDatabase.filter(record => record.userId === userId);
    const learningModel = await this.getLearningModel(userId);
    
    if (userRecords.length < 2) {
      // データが少ない場合は元の予測を返す
      return {
        ...request,
        learningBoost: 0,
        message: 'より多くの実績データを蓄積すると、予測精度が向上します'
      };
    }
    
    // 個人化された調整係数を計算
    const personalizationFactor = this.calculatePersonalizationFactor(userRecords);
    
    // 予測を調整
    const improvedPrediction = {
      ...request,
      followerGain: Math.round(request.followerGain * personalizationFactor.followerGain),
      learningBoost: Math.round((personalizationFactor.followerGain - 1) * 100),
      confidence: learningModel.confidence,
      dataPoints: learningModel.dataPoints,
      message: `過去${userRecords.length}回のPDCAサイクルから学習した結果、予測を${Math.round((personalizationFactor.followerGain - 1) * 100)}%調整しました`
    };
    
    return improvedPrediction;
  }
  
  // ヘルパー関数
  private analyzeGrowthTrend(records: PDCARecord[]): 'increasing' | 'stable' | 'decreasing' {
    if (records.length < 2) return 'stable';
    
    const recentRecords = records.slice(-3);
    const growthRates = recentRecords.map(record => 
      record.actualMetrics.followerGain / record.targetMetrics.followerGain
    );
    
    const avgGrowthRate = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
    
    if (avgGrowthRate > 1.1) return 'increasing';
    if (avgGrowthRate < 0.9) return 'decreasing';
    return 'stable';
  }
  
  private analyzeStrategies(records: PDCARecord[]): { best: string[]; worst: string[] } {
    const strategyPerformance: Record<string, number[]> = {};
    
    records.forEach(record => {
      const performance = record.actualMetrics.followerGain / record.targetMetrics.followerGain;
      record.strategies.forEach(strategy => {
        if (!strategyPerformance[strategy]) {
          strategyPerformance[strategy] = [];
        }
        strategyPerformance[strategy].push(performance);
      });
    });
    
    const strategyAverages = Object.entries(strategyPerformance).map(([strategy, performances]) => ({
      strategy,
      average: performances.reduce((sum, perf) => sum + perf, 0) / performances.length
    }));
    
    strategyAverages.sort((a, b) => b.average - a.average);
    
    return {
      best: strategyAverages.slice(0, 3).map(s => s.strategy),
      worst: strategyAverages.slice(-3).map(s => s.strategy)
    };
  }
  
  private analyzeSeasonalPatterns(records: PDCARecord[]): { month: string; performance: number }[] {
    const monthlyPerformance: Record<string, number[]> = {};
    
    records.forEach(record => {
      const month = new Date(record.startDate).toLocaleDateString('ja-JP', { month: 'long' });
      const performance = record.actualMetrics.followerGain / record.targetMetrics.followerGain;
      
      if (!monthlyPerformance[month]) {
        monthlyPerformance[month] = [];
      }
      monthlyPerformance[month].push(performance);
    });
    
    return Object.entries(monthlyPerformance).map(([month, performances]) => ({
      month,
      performance: performances.reduce((sum, perf) => sum + perf, 0) / performances.length
    }));
  }
  
  private analyzeContentPerformance(records: PDCARecord[]): { type: string; avgEngagement: number; avgReach: number }[] {
    const contentPerformance: Record<string, { engagement: number[]; reach: number[] }> = {};
    
    records.forEach(record => {
      record.contentTypes.forEach(type => {
        if (!contentPerformance[type]) {
          contentPerformance[type] = { engagement: [], reach: [] };
        }
        contentPerformance[type].engagement.push(record.actualMetrics.engagementRate);
        contentPerformance[type].reach.push(record.actualMetrics.reach);
      });
    });
    
    return Object.entries(contentPerformance).map(([type, data]) => ({
      type,
      avgEngagement: data.engagement.reduce((sum, eng) => sum + eng, 0) / data.engagement.length,
      avgReach: data.reach.reduce((sum, reach) => sum + reach, 0) / data.reach.length
    }));
  }
  
  private generateRecommendations(records: PDCARecord[], strategyAnalysis: { best: string[]; worst: string[] }): string[] {
    const recommendations: string[] = [];
    
    if (strategyAnalysis.best.length > 0) {
      recommendations.push(`「${strategyAnalysis.best[0]}」戦略が最も効果的でした。継続することを推奨します。`);
    }
    
    if (strategyAnalysis.worst.length > 0) {
      recommendations.push(`「${strategyAnalysis.worst[0]}」戦略の効果が低いため、見直しを検討してください。`);
    }
    
    const avgPerformance = this.calculateAverageGrowth(records);
    if (avgPerformance < 0.8) {
      recommendations.push('全体的な目標達成率が低いため、より現実的な目標設定を検討してください。');
    } else if (avgPerformance > 1.2) {
      recommendations.push('目標を上回る成果を出しているため、より挑戦的な目標にチャレンジできます。');
    }
    
    return recommendations;
  }
  
  private calculateAverageGrowth(records: PDCARecord[]): number {
    if (records.length === 0) return 1.0;
    
    const totalPerformance = records.reduce((sum, record) => {
      return sum + (record.actualMetrics.followerGain / record.targetMetrics.followerGain);
    }, 0);
    
    return totalPerformance / records.length;
  }
  
  private calculateModelAccuracy(records: PDCARecord[]): number {
    // 予測精度の計算（簡易版）
    const accuracy = Math.min(0.95, 0.6 + (records.length * 0.05));
    return accuracy;
  }
  
  private generatePersonalizedPredictions(records: PDCARecord[]): { followerGrowth: number; engagementRate: number; reach: number } {
    const recentRecords = records.slice(-3);
    const avgFollowerGrowth = recentRecords.reduce((sum, record) => sum + record.actualMetrics.followerGain, 0) / recentRecords.length;
    const avgEngagementRate = recentRecords.reduce((sum, record) => sum + record.actualMetrics.engagementRate, 0) / recentRecords.length;
    const avgReach = recentRecords.reduce((sum, record) => sum + record.actualMetrics.reach, 0) / recentRecords.length;
    
    return {
      followerGrowth: Math.round(avgFollowerGrowth),
      engagementRate: avgEngagementRate,
      reach: Math.round(avgReach)
    };
  }
  
  private generateImprovements(records: PDCARecord[]): string[] {
    const improvements: string[] = [];
    
    if (records.length < 10) {
      improvements.push('より多くのPDCAサイクルを実行してデータを蓄積しましょう');
    }
    
    const avgPerformance = this.calculateAverageGrowth(records);
    if (avgPerformance < 0.9) {
      improvements.push('目標設定の見直しと戦略の最適化が必要です');
    }
    
    improvements.push('定期的な振り返りと改善サイクルを継続しましょう');
    
    return improvements;
  }
  
  private calculatePersonalizationFactor(records: PDCARecord[]): { followerGain: number; engagementRate: number; reach: number } {
    const recentRecords = records.slice(-5); // 最近の5回の記録を使用
    
    // 実際の成果と目標の比率を計算
    const performanceRatios = recentRecords.map(record => ({
      followerGain: record.actualMetrics.followerGain / record.targetMetrics.followerGain,
      engagementRate: record.actualMetrics.engagementRate / (record.targetMetrics.engagementRate || 0.03),
      reach: record.actualMetrics.reach / record.targetMetrics.reach
    }));
    
    // 平均パフォーマンス比率を計算
    const avgRatio = {
      followerGain: performanceRatios.reduce((sum, ratio) => sum + ratio.followerGain, 0) / performanceRatios.length,
      engagementRate: performanceRatios.reduce((sum, ratio) => sum + ratio.engagementRate, 0) / performanceRatios.length,
      reach: performanceRatios.reduce((sum, ratio) => sum + ratio.reach, 0) / performanceRatios.length
    };
    
    // 調整係数を計算（0.8-1.2の範囲に制限）
    return {
      followerGain: Math.max(0.8, Math.min(1.2, avgRatio.followerGain)),
      engagementRate: Math.max(0.8, Math.min(1.2, avgRatio.engagementRate)),
      reach: Math.max(0.8, Math.min(1.2, avgRatio.reach))
    };
  }
  
  private getDefaultTrendAnalysis(): TrendAnalysis {
    return {
      period: 'データなし',
      averageGrowth: 1.0,
      growthTrend: 'stable',
      bestStrategies: ['リール中心運用', 'ハッシュタグ戦略強化'],
      worstStrategies: ['高頻度投稿', '広告依存'],
      seasonalPatterns: [
        { month: '1月', performance: 0.9 },
        { month: '4月', performance: 1.05 },
        { month: '7月', performance: 1.1 },
        { month: '12月', performance: 1.2 }
      ],
      contentPerformance: [
        { type: '教育系', avgEngagement: 0.035, avgReach: 1500 },
        { type: 'エンタメ系', avgEngagement: 0.045, avgReach: 2000 }
      ],
      recommendations: [
        'まずは基本的な戦略から始めて、データを蓄積しましょう',
        '定期的なPDCAサイクルで改善を続けましょう'
      ]
    };
  }
}
