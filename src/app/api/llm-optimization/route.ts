import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';
import { collection, doc, getDoc, addDoc, updateDoc } from 'firebase/firestore';

interface LearningProgress {
  userId: string;
  phase: 'initial' | 'learning' | 'optimized' | 'master';
  totalInteractions: number;
  ragHitCount: number;
  llmCallCount: number;
  totalTokensUsed: number;
  totalCost: number;
  tokensSaved: number;
  costSaved: number;
  averageQualityScore: number;
  lastUpdated: Date;
}

// 学習フェーズを決定する関数
function determineLearningPhase(totalInteractions: number, ragHitRate: number, qualityScore: number): 'initial' | 'learning' | 'optimized' | 'master' {
  if (totalInteractions < 10) return 'initial';
  if (totalInteractions < 50) return 'learning';
  if (ragHitRate > 0.8 && qualityScore > 4.0) return 'master';
  return 'optimized';
}

// 学習進捗を取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (action === 'progress') {
      // 学習進捗を取得
      const progressRef = doc(db, 'learningProgress', userId);
      const progressSnap = await getDoc(progressRef);

      if (progressSnap.exists()) {
        const data = progressSnap.data();
        return NextResponse.json({
          success: true,
          data: {
            ...data,
            lastUpdated: data.lastUpdated?.toDate() || new Date()
          } as LearningProgress
        });
      } else {
        // 初期データを作成
        const initialProgress: LearningProgress = {
          userId,
          phase: 'initial',
          totalInteractions: 0,
          ragHitCount: 0,
          llmCallCount: 0,
          totalTokensUsed: 0,
          totalCost: 0,
          tokensSaved: 0,
          costSaved: 0,
          averageQualityScore: 0,
          lastUpdated: new Date()
        };

        await addDoc(collection(db, 'learningProgress'), initialProgress);

        return NextResponse.json({
          success: true,
          data: initialProgress
        });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('LLM Optimization API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch learning progress', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// 学習進捗を更新
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      tokensUsed, 
      cost, 
      qualityScore,
      isRAGHit = false 
    } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 現在の学習進捗を取得
    const progressRef = doc(db, 'learningProgress', userId);
    const progressSnap = await getDoc(progressRef);

    let currentProgress: LearningProgress;
    
    if (progressSnap.exists()) {
      const data = progressSnap.data();
      currentProgress = {
        ...data,
        lastUpdated: data.lastUpdated?.toDate() || new Date()
      } as LearningProgress;
    } else {
      // 初期データを作成
      currentProgress = {
        userId,
        phase: 'initial',
        totalInteractions: 0,
        ragHitCount: 0,
        llmCallCount: 0,
        totalTokensUsed: 0,
        totalCost: 0,
        tokensSaved: 0,
        costSaved: 0,
        averageQualityScore: 0,
        lastUpdated: new Date()
      };
    }

    // 進捗を更新
    currentProgress.totalInteractions += 1;
    currentProgress.totalTokensUsed += tokensUsed || 0;
    currentProgress.totalCost += cost || 0;
    currentProgress.lastUpdated = new Date();

    if (isRAGHit) {
      currentProgress.ragHitCount += 1;
      // RAGヒットの場合はトークンとコストを節約
      currentProgress.tokensSaved += tokensUsed || 0;
      currentProgress.costSaved += cost || 0;
    } else {
      currentProgress.llmCallCount += 1;
    }

    // 品質スコアを更新（移動平均）
    if (qualityScore) {
      const currentAvg = currentProgress.averageQualityScore;
      const totalInteractions = currentProgress.totalInteractions;
      currentProgress.averageQualityScore = 
        (currentAvg * (totalInteractions - 1) + qualityScore) / totalInteractions;
    }

    // 学習フェーズを再計算
    const ragHitRate = currentProgress.totalInteractions > 0 
      ? currentProgress.ragHitCount / currentProgress.totalInteractions 
      : 0;
    
    currentProgress.phase = determineLearningPhase(
      currentProgress.totalInteractions,
      ragHitRate,
      currentProgress.averageQualityScore
    );

    // Firestoreに保存
    await updateDoc(progressRef, {
      ...currentProgress,
      lastUpdated: new Date()
    });

    return NextResponse.json({
      success: true,
      data: currentProgress
    });

  } catch (error) {
    console.error('LLM Optimization Update Error:', error);
    return NextResponse.json(
      { error: 'Failed to update learning progress', details: (error as Error).message },
      { status: 500 }
    );
  }
}
