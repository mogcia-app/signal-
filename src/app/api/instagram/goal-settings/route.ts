import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 401 });
    }

    const body = await request.json();
    const { weeklyPostGoal, followerGoal, monthlyPostGoal } = body;

    // バリデーション
    if (!weeklyPostGoal || !followerGoal || !monthlyPostGoal) {
      return NextResponse.json({ 
        success: false, 
        error: 'All goal fields are required' 
      }, { status: 400 });
    }

    if (weeklyPostGoal < 1 || weeklyPostGoal > 50) {
      return NextResponse.json({ 
        success: false, 
        error: 'Weekly post goal must be between 1 and 50' 
      }, { status: 400 });
    }

    if (followerGoal < 1 || followerGoal > 1000) {
      return NextResponse.json({ 
        success: false, 
        error: 'Follower goal must be between 1 and 1000' 
      }, { status: 400 });
    }

    if (monthlyPostGoal < 1 || monthlyPostGoal > 200) {
      return NextResponse.json({ 
        success: false, 
        error: 'Monthly post goal must be between 1 and 200' 
      }, { status: 400 });
    }

    // 目標設定を保存
    const goalSettings = {
      weeklyPostGoal: parseInt(weeklyPostGoal),
      followerGoal: parseInt(followerGoal),
      monthlyPostGoal: parseInt(monthlyPostGoal),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await adminDb.collection('goalSettings').doc(userId).set(goalSettings);

    return NextResponse.json({ 
      success: true, 
      message: 'Goal settings saved successfully',
      data: goalSettings
    });

  } catch (error) {
    console.error('Goal settings save error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to save goal settings' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 401 });
    }

    // 目標設定を取得
    const goalDoc = await adminDb.collection('goalSettings').doc(userId).get();
    
    if (!goalDoc.exists) {
      return NextResponse.json({ 
        success: true, 
        data: null,
        message: 'No goal settings found'
      });
    }

    const goalSettings = goalDoc.data();

    return NextResponse.json({ 
      success: true, 
      data: goalSettings
    });

  } catch (error) {
    console.error('Goal settings fetch error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch goal settings' 
    }, { status: 500 });
  }
}
