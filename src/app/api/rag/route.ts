import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, orderBy, limit, increment } from 'firebase/firestore';

// ベクトル検索用のインターフェース
interface VectorDocument {
  id: string;
  userId: string;
  question: string;
  answer: string;
  vector: number[];
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  qualityScore: number;
}

// 学習データインターフェース
interface LearningData {
  id: string;
  userId: string;
  interactionType: 'question' | 'feedback' | 'action';
  content: string;
  context: Record<string, unknown>;
  timestamp: Date;
  metadata: {
    sessionId: string;
    userAgent?: string;
    ipAddress?: string;
  };
}

// 簡易ベクトル類似度計算（コサイン類似度）
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// テキストを簡易ベクトルに変換（実際の実装ではOpenAI Embeddings APIを使用）
function textToVector(text: string): number[] {
  // 簡易実装：文字の出現頻度ベースのベクトル
  const words = text.toLowerCase().split(/\s+/);
  const wordCount: { [key: string]: number } = {};
  
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  // 固定サイズのベクトル（実際は動的）
  const vector = new Array(100).fill(0);
  const wordsArray = Object.keys(wordCount);
  
  wordsArray.forEach((word, index) => {
    if (index < 100) {
      vector[index] = wordCount[word];
    }
  });
  
  return vector;
}

// 質問のカテゴリを自動分類
function categorizeQuestion(question: string): string {
  const lowerQuestion = question.toLowerCase();
  
  if (lowerQuestion.includes('投稿') || lowerQuestion.includes('post')) {
    return 'posting';
  } else if (lowerQuestion.includes('ハッシュタグ') || lowerQuestion.includes('hashtag')) {
    return 'hashtags';
  } else if (lowerQuestion.includes('時間') || lowerQuestion.includes('タイミング')) {
    return 'timing';
  } else if (lowerQuestion.includes('エンゲージメント') || lowerQuestion.includes('engagement')) {
    return 'engagement';
  } else if (lowerQuestion.includes('フォロワー') || lowerQuestion.includes('follower')) {
    return 'growth';
  } else if (lowerQuestion.includes('コンテンツ') || lowerQuestion.includes('content')) {
    return 'content';
  } else {
    return 'general';
  }
}

// 質問のタグを自動生成
function generateTags(question: string): string[] {
  const tags: string[] = [];
  const lowerQuestion = question.toLowerCase();
  
  // キーワードベースのタグ生成
  const keywordMap: { [key: string]: string[] } = {
    'instagram': ['instagram', 'sns'],
    '投稿': ['posting', 'content'],
    'リール': ['reel', 'video'],
    'ストーリー': ['story', 'stories'],
    'フィード': ['feed', 'photo'],
    'ハッシュタグ': ['hashtag', 'tag'],
    'エンゲージメント': ['engagement', 'interaction'],
    'フォロワー': ['follower', 'growth'],
    '時間': ['timing', 'schedule'],
    '分析': ['analytics', 'data'],
    '戦略': ['strategy', 'planning']
  };
  
  Object.entries(keywordMap).forEach(([keyword, tagList]) => {
    if (lowerQuestion.includes(keyword)) {
      tags.push(...tagList);
    }
  });
  
  return [...new Set(tags)]; // 重複削除
}

// RAG検索：類似質問を検索
async function searchSimilarQuestions(userId: string, question: string, threshold: number = 0.7) {
  try {
    const questionVector = textToVector(question);
    const category = categorizeQuestion(question);
    
    // 同じカテゴリの質問を取得
    const vectorRef = collection(db, 'vector_documents');
    const q = query(
      vectorRef,
      where('userId', '==', userId),
      where('category', '==', category),
      orderBy('qualityScore', 'desc'),
      limit(20)
    );
    
    const snapshot = await getDocs(q);
    const similarQuestions: VectorDocument[] = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data() as VectorDocument;
      const similarity = cosineSimilarity(questionVector, data.vector);
      
      if (similarity >= threshold) {
        similarQuestions.push({
          ...data,
          id: doc.id,
          similarity
        } as VectorDocument & { similarity: number });
      }
    });
    
    // 類似度でソート
    similarQuestions.sort((a, b) => (b as VectorDocument & { similarity: number }).similarity - (a as VectorDocument & { similarity: number }).similarity);
    
    return similarQuestions.slice(0, 3); // 上位3件を返す
    
  } catch (error) {
    console.error('RAG検索エラー:', error);
    return [];
  }
}

// 学習データを記録
async function recordLearningData(userId: string, interactionType: string, content: string, context: Record<string, unknown> = {}) {
  try {
    const learningRef = collection(db, 'learning_data');
    const learningData: LearningData = {
      id: '',
      userId,
      interactionType: interactionType as 'question' | 'feedback' | 'action',
      content,
      context,
      timestamp: new Date(),
      metadata: {
        sessionId: (context.sessionId as string) || 'default',
        userAgent: context.userAgent as string,
        ipAddress: context.ipAddress as string
      }
    };
    
    await addDoc(learningRef, learningData);
    
    return { success: true };
  } catch (error) {
    console.error('学習データ記録エラー:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ベクトルドキュメントを保存
async function saveVectorDocument(userId: string, question: string, answer: string, qualityScore: number = 0.5) {
  try {
    const vectorRef = collection(db, 'vector_documents');
    const vectorDoc: VectorDocument = {
      id: '',
      userId,
      question,
      answer,
      vector: textToVector(question),
      category: categorizeQuestion(question),
      tags: generateTags(question),
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      qualityScore
    };
    
    const docRef = await addDoc(vectorRef, vectorDoc);
    
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('ベクトルドキュメント保存エラー:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// 使用回数を更新
async function updateUsageCount(documentId: string) {
  try {
    const docRef = doc(db, 'vector_documents', documentId);
    await updateDoc(docRef, {
      usageCount: increment(1),
      updatedAt: new Date()
    });
    
    return { success: true };
  } catch (error) {
    console.error('使用回数更新エラー:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// メインAPIエンドポイント
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const question = searchParams.get('question');
    const action = searchParams.get('action');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }
    
    switch (action) {
      case 'search':
        if (!question) {
          return NextResponse.json({ error: 'Question required for search' }, { status: 400 });
        }
        
        const similarQuestions = await searchSimilarQuestions(userId, question);
        
        return NextResponse.json({
          success: true,
          data: {
            similarQuestions,
            hasSimilarQuestions: similarQuestions.length > 0,
            recommendedAction: similarQuestions.length > 0 ? 'use_cached' : 'generate_new'
          }
        });
        
      case 'record':
        const interactionType = searchParams.get('interactionType') || 'question';
        const content = searchParams.get('content') || '';
        const context = JSON.parse(searchParams.get('context') || '{}');
        
        const recordResult = await recordLearningData(userId, interactionType, content, context);
        
        return NextResponse.json(recordResult);
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('RAG API error:', error);
    return NextResponse.json(
      { 
        error: 'RAG API failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, question, answer, qualityScore, action } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }
    
    switch (action) {
      case 'save':
        if (!question || !answer) {
          return NextResponse.json({ error: 'Question and answer required' }, { status: 400 });
        }
        
        const saveResult = await saveVectorDocument(userId, question, answer, qualityScore);
        return NextResponse.json(saveResult);
        
      case 'update_usage':
        if (!body.documentId) {
          return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
        }
        
        const updateResult = await updateUsageCount(body.documentId);
        return NextResponse.json(updateResult);
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('RAG API POST error:', error);
    return NextResponse.json(
      { 
        error: 'RAG API POST failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
