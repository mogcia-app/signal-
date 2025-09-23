import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

export async function GET() {
  try {
    // 各コレクションの存在確認とデータ数取得
    const collections = ['posts', 'analytics', 'plans', 'users'];
    const results: Record<string, {
      exists: boolean;
      count?: number;
      sampleData?: unknown[];
      error?: string;
    }> = {};
    
    for (const collectionName of collections) {
      try {
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(query(collectionRef, orderBy('createdAt', 'desc'), limit(5)));
        
        results[collectionName] = {
          exists: true,
          count: snapshot.size,
          sampleData: snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
        };
      } catch (error) {
        results[collectionName] = {
          exists: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database collections check completed',
      collections: results,
      firebaseConfig: {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'signal-v1-fc481',
        hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        environment: process.env.NODE_ENV
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Database check error:', error);
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
