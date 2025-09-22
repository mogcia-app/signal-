import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// 特定の計画取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const planId = resolvedParams.id;
    const docRef = doc(db, 'plans', planId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: '計画が見つかりません' },
        { status: 404 }
      );
    }

    const planData = {
      id: docSnap.id,
      ...docSnap.data()
    };

    return NextResponse.json({ plan: planData });

  } catch (error) {
    console.error('計画取得エラー:', error);
    return NextResponse.json(
      { error: '計画の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// 計画更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const planId = resolvedParams.id;
    const body = await request.json();
    const {
      title,
      targetFollowers,
      currentFollowers,
      planPeriod,
      targetAudience,
      category,
      strategies,
      simulation,
      aiPersona
    } = body;

    const updateData: Record<string, unknown> = {
      updatedAt: new Date()
    };

    // 更新するフィールドのみ追加
    if (title !== undefined) updateData.title = title;
    if (targetFollowers !== undefined) updateData.targetFollowers = parseInt(targetFollowers);
    if (currentFollowers !== undefined) updateData.currentFollowers = parseInt(currentFollowers);
    if (planPeriod !== undefined) updateData.planPeriod = planPeriod;
    if (targetAudience !== undefined) updateData.targetAudience = targetAudience;
    if (category !== undefined) updateData.category = category;
    if (strategies !== undefined) updateData.strategies = strategies;
    if (simulation !== undefined) updateData.simulation = simulation;
    if (aiPersona !== undefined) updateData.aiPersona = aiPersona;

    const docRef = doc(db, 'plans', planId);
    await updateDoc(docRef, updateData);

    return NextResponse.json({
      message: '計画が更新されました',
      id: planId
    });

  } catch (error) {
    console.error('計画更新エラー:', error);
    return NextResponse.json(
      { error: '計画の更新に失敗しました' },
      { status: 500 }
    );
  }
}

// 計画削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const planId = resolvedParams.id;
    const docRef = doc(db, 'plans', planId);
    await deleteDoc(docRef);

    return NextResponse.json({
      message: '計画が削除されました',
      id: planId
    });

  } catch (error) {
    console.error('計画削除エラー:', error);
    return NextResponse.json(
      { error: '計画の削除に失敗しました' },
      { status: 500 }
    );
  }
}
