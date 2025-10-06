import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';

interface XPlanData {
  userId: string;
  planType: 'xplan';
  title: string;
  planPeriod: string;
  currentFollowers: number;
  targetFollowers: number;
  goalCategory: string;
  targetAudience: string;
  strategies: string[];
  postCategories: string[];
  tweetFreq: number;
  threadFreq: number;
  replyFreq: number;
  retweetGoal: number;
  replyGoal: number;
  reachGoal: number;
  aiHelpRequest: string;
  pastLearnings: string;
  referenceAccounts: string;
  hashtagStrategy: string;
  constraints: string;
  freeMemo: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, formData, selectedStrategies, selectedCategories } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    const xPlanData: XPlanData = {
      userId,
      planType: 'xplan',
      title: formData.goalName || 'X成長計画',
      planPeriod: formData.planPeriod,
      currentFollowers: parseInt(formData.currentFollowers, 10) || 0,
      targetFollowers: parseInt(formData.followerGain, 10) + (parseInt(formData.currentFollowers, 10) || 0),
      goalCategory: formData.goalCategory,
      targetAudience: formData.targetAudience,
      strategies: selectedStrategies,
      postCategories: selectedCategories,
      tweetFreq: parseInt(formData.tweetFreq, 10) || 0,
      threadFreq: parseInt(formData.threadFreq, 10) || 0,
      replyFreq: parseInt(formData.replyFreq, 10) || 0,
      retweetGoal: parseInt(formData.retweetGoal, 10) || 0,
      replyGoal: parseInt(formData.replyGoal, 10) || 0,
      reachGoal: parseInt(formData.reachGoal, 10) || 0,
      aiHelpRequest: formData.aiHelpRequest,
      pastLearnings: formData.pastLearnings,
      referenceAccounts: formData.referenceAccounts,
      hashtagStrategy: formData.hashtagStrategy,
      constraints: formData.constraints,
      freeMemo: formData.freeMemo,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Firestoreに保存
    const docRef = await addDoc(collection(db, 'xplans'), xPlanData);

    return NextResponse.json({
      success: true,
      planId: docRef.id,
      message: 'Xプランが正常に保存されました'
    });

  } catch (error) {
    console.error('Xプラン保存エラー:', error);
    return NextResponse.json(
      { error: 'プランの保存に失敗しました' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // ユーザーのXプランを取得
    const q = query(
      collection(db, 'xplans'),
      where('userId', '==', userId),
      where('planType', '==', 'xplan'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const querySnapshot = await getDocs(q);
    const plans = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      success: true,
      plans
    });

  } catch (error) {
    console.error('Xプラン取得エラー:', error);
    return NextResponse.json(
      { error: 'プランの取得に失敗しました' },
      { status: 500 }
    );
  }
}
