import { NextRequest, NextResponse } from 'next/server';
import { PlanFormData } from '../../../instagram/plan/types/plan';

export async function POST(request: NextRequest) {
  try {
    const body: { planData: PlanFormData; currentData: PlanFormData } = await request.json();
    
    // バリデーション
    if (!body.planData) {
      return NextResponse.json(
        { error: '計画データが不足しています' },
        { status: 400 }
      );
    }

    // AI診断処理（現在はモック）
    const diagnosisResult = await runAIDiagnosis(body.planData);
    
    return NextResponse.json(diagnosisResult);
  } catch (error) {
    console.error('AI診断エラー:', error);
    return NextResponse.json(
      { error: 'AI診断処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// AI診断処理ロジック
async function runAIDiagnosis(planData: PlanFormData) {
  // 現在はモックデータを返す
  // 将来的には実際のAI API（OpenAI、Claude等）を呼び出し
  console.log('AI診断対象データ:', planData.goalCategory, planData.targetAudience);
  
  return {
    success: true,
    message: 'AI診断が完了しました',
    timestamp: new Date().toISOString()
  };
}
