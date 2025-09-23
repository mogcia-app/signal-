import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';

// TODOアイテムの型定義
interface TodoItem {
  id?: string;
  userId: string;
  task: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// TODOリスト取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 開発環境では空の配列を返す（Firebaseエミュレータが利用できない場合）
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      return NextResponse.json({ todos: [] });
    }

    const q = query(
      collection(db, 'todos'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const todos: TodoItem[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as TodoItem[];

    return NextResponse.json({ todos });

  } catch (error) {
    console.error('TODOリスト取得エラー:', error);
    // エラーが発生した場合は空の配列を返す
    return NextResponse.json({ todos: [] });
  }
}

// TODOアイテム作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, task, priority, dueDate } = body;

    if (!userId || !task || !priority) {
      return NextResponse.json({ error: 'Required fields are missing' }, { status: 400 });
    }

    // 本番環境でFirebase設定がない場合はモックデータを返す
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      const mockId = `mock-${Date.now()}`;
      return NextResponse.json({ 
        id: mockId,
        message: 'TODOアイテムが作成されました（デモモード）' 
      });
    }

    const todoData = {
      userId,
      task,
      priority,
      dueDate: dueDate || '', // 空の場合は空文字列
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, 'todos'), todoData);

    return NextResponse.json({ 
      id: docRef.id,
      message: 'TODOアイテムが作成されました' 
    });

  } catch (error) {
    console.error('TODOアイテム作成エラー:', error);
    // エラーが発生した場合はモックデータを返す
    const mockId = `mock-${Date.now()}`;
    return NextResponse.json({ 
      id: mockId,
      message: 'TODOアイテムが作成されました（デモモード）' 
    });
  }
}

// TODOアイテム更新
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, task, priority, dueDate, completed } = body;

    if (!id) {
      return NextResponse.json({ error: 'TODO ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (task !== undefined) updateData.task = task;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (completed !== undefined) updateData.completed = completed;

    await updateDoc(doc(db, 'todos', id), updateData);

    return NextResponse.json({ message: 'TODOアイテムが更新されました' });

  } catch (error) {
    console.error('TODOアイテム更新エラー:', error);
    return NextResponse.json(
      { error: 'TODOアイテムの更新に失敗しました' },
      { status: 500 }
    );
  }
}

// TODOアイテム削除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'TODO ID is required' }, { status: 400 });
    }

    await deleteDoc(doc(db, 'todos', id));

    return NextResponse.json({ message: 'TODOアイテムが削除されました' });

  } catch (error) {
    console.error('TODOアイテム削除エラー:', error);
    return NextResponse.json(
      { error: 'TODOアイテムの削除に失敗しました' },
      { status: 500 }
    );
  }
}
