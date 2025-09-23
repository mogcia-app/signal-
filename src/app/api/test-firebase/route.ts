import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

export async function GET() {
  try {
    // Firebase接続テスト
    const testCollection = collection(db, 'test');
    
    // テストデータを追加
    const testData = {
      message: 'Firebase connection test',
      timestamp: new Date(),
      environment: process.env.NODE_ENV
    };
    
    const docRef = await addDoc(testCollection, testData);
    
    // データを取得して確認
    const snapshot = await getDocs(testCollection);
    const documents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return NextResponse.json({
      success: true,
      message: 'Firebase connection successful',
      testDocId: docRef.id,
      totalDocs: documents.length,
      firebaseConfig: {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'signal-v1-fc481',
        hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        environment: process.env.NODE_ENV
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Firebase connection error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      firebaseConfig: {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'signal-v1-fc481',
        hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        environment: process.env.NODE_ENV
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
