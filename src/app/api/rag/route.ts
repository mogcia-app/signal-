import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { adminDb } from "../../../lib/firebase-admin";
import {
  buildErrorResponse,
  ForbiddenError,
  requireAuthContext,
} from "../../../lib/server/auth-context";

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

interface LearningData {
  id: string;
  userId: string;
  interactionType: "question" | "feedback" | "action";
  content: string;
  context: Record<string, unknown>;
  timestamp: Date;
  metadata: {
    sessionId: string;
    userAgent?: string;
    ipAddress?: string;
  };
}

function resolveRequestedUserId(candidate: unknown, authenticatedUid: string): string {
  if (candidate === undefined || candidate === null || candidate === "") {
    return authenticatedUid;
  }

  if (typeof candidate !== "string" || candidate !== authenticatedUid) {
    throw new ForbiddenError("他のユーザーのRAGデータにはアクセスできません");
  }

  return candidate;
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {return 0;}

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {return 0;}

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function textToVector(text: string): number[] {
  const words = text.toLowerCase().split(/\s+/);
  const wordCount: { [key: string]: number } = {};

  words.forEach((word) => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  const vector = new Array(100).fill(0);
  const wordsArray = Object.keys(wordCount);

  wordsArray.forEach((word, index) => {
    if (index < 100) {
      vector[index] = wordCount[word];
    }
  });

  return vector;
}

function categorizeQuestion(question: string): string {
  const lowerQuestion = question.toLowerCase();

  if (lowerQuestion.includes("投稿") || lowerQuestion.includes("post")) {
    return "posting";
  } else if (lowerQuestion.includes("ハッシュタグ") || lowerQuestion.includes("hashtag")) {
    return "hashtags";
  } else if (lowerQuestion.includes("時間") || lowerQuestion.includes("タイミング")) {
    return "timing";
  } else if (lowerQuestion.includes("エンゲージメント") || lowerQuestion.includes("engagement")) {
    return "engagement";
  } else if (lowerQuestion.includes("フォロワー") || lowerQuestion.includes("follower")) {
    return "growth";
  } else if (lowerQuestion.includes("コンテンツ") || lowerQuestion.includes("content")) {
    return "content";
  } else {
    return "general";
  }
}

function generateTags(question: string): string[] {
  const tags: string[] = [];
  const lowerQuestion = question.toLowerCase();

  const keywordMap: { [key: string]: string[] } = {
    instagram: ["instagram", "sns"],
    投稿: ["posting", "content"],
    リール: ["reel", "video"],
    ストーリー: ["story", "stories"],
    フィード: ["feed", "photo"],
    ハッシュタグ: ["hashtag", "tag"],
    エンゲージメント: ["engagement", "interaction"],
    フォロワー: ["follower", "growth"],
    時間: ["timing", "schedule"],
    分析: ["analytics", "data"],
    戦略: ["strategy", "planning"],
  };

  Object.entries(keywordMap).forEach(([keyword, tagList]) => {
    if (lowerQuestion.includes(keyword)) {
      tags.push(...tagList);
    }
  });

  return [...new Set(tags)];
}

async function searchSimilarQuestions(userId: string, question: string, threshold = 0.7) {
  try {
    const questionVector = textToVector(question);
    const category = categorizeQuestion(question);

    const snapshot = await adminDb
      .collection("vector_documents")
      .where("userId", "==", userId)
      .where("category", "==", category)
      .orderBy("qualityScore", "desc")
      .limit(20)
      .get();

    const similarQuestions: Array<VectorDocument & { similarity: number }> = [];

    snapshot.docs.forEach((snapshotDoc) => {
      const data = snapshotDoc.data() as VectorDocument;
      const similarity = cosineSimilarity(questionVector, data.vector);

      if (similarity >= threshold) {
        similarQuestions.push({
          ...data,
          id: snapshotDoc.id,
          similarity,
        });
      }
    });

    similarQuestions.sort((a, b) => b.similarity - a.similarity);
    return similarQuestions.slice(0, 3);
  } catch (error) {
    console.error("RAG検索エラー:", error);
    return [];
  }
}

async function recordLearningData(
  userId: string,
  interactionType: string,
  content: string,
  context: Record<string, unknown> = {}
) {
  try {
    const learningData: LearningData = {
      id: "",
      userId,
      interactionType: interactionType as "question" | "feedback" | "action",
      content,
      context,
      timestamp: new Date(),
      metadata: {
        sessionId: (context.sessionId as string) || "default",
        userAgent: context.userAgent as string,
        ipAddress: context.ipAddress as string,
      },
    };

    await adminDb.collection("learning_data").add(learningData);
    return { success: true };
  } catch (error) {
    console.error("学習データ記録エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function saveVectorDocument(
  userId: string,
  question: string,
  answer: string,
  qualityScore = 0.5
) {
  try {
    const vectorDoc: VectorDocument = {
      id: "",
      userId,
      question,
      answer,
      vector: textToVector(question),
      category: categorizeQuestion(question),
      tags: generateTags(question),
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      qualityScore,
    };

    const docRef = await adminDb.collection("vector_documents").add(vectorDoc);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("ベクトルドキュメント保存エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function updateUsageCount(userId: string, documentId: string) {
  try {
    const docRef = adminDb.collection("vector_documents").doc(documentId);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      throw new Error("Document not found");
    }

    const data = snapshot.data() as { userId?: string } | undefined;
    if (data?.userId !== userId) {
      throw new ForbiddenError("他のユーザーのRAGドキュメントは更新できません");
    }

    await docRef.update({
      usageCount: admin.firestore.FieldValue.increment(1),
      updatedAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error("使用回数更新エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: false,
      rateLimit: { key: "rag-read", limit: 60, windowSeconds: 60 },
      auditEventName: "rag_read",
    });

    const { searchParams } = new URL(request.url);
    const userId = resolveRequestedUserId(searchParams.get("userId"), uid);
    const question = searchParams.get("question");
    const action = searchParams.get("action");

    switch (action) {
      case "search": {
        if (!question) {
          return NextResponse.json({ error: "Question required for search" }, { status: 400 });
        }

        const similarQuestions = await searchSimilarQuestions(userId, question);
        return NextResponse.json({
          success: true,
          data: {
            similarQuestions,
            hasSimilarQuestions: similarQuestions.length > 0,
            recommendedAction: similarQuestions.length > 0 ? "use_cached" : "generate_new",
          },
        });
      }

      case "record": {
        const interactionType = searchParams.get("interactionType") || "question";
        const content = searchParams.get("content") || "";
        const context = JSON.parse(searchParams.get("context") || "{}") as Record<string, unknown>;
        const recordResult = await recordLearningData(userId, interactionType, content, context);
        return NextResponse.json(recordResult);
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("RAG API error:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: false,
      rateLimit: { key: "rag-write", limit: 30, windowSeconds: 60 },
      auditEventName: "rag_write",
    });

    const body = await request.json();
    const { userId, question, answer, qualityScore, action, documentId } = body;
    const resolvedUserId = resolveRequestedUserId(userId, uid);

    switch (action) {
      case "save": {
        if (!question || !answer) {
          return NextResponse.json({ error: "Question and answer required" }, { status: 400 });
        }

        const saveResult = await saveVectorDocument(resolvedUserId, question, answer, qualityScore);
        return NextResponse.json(saveResult);
      }

      case "update_usage": {
        if (!documentId) {
          return NextResponse.json({ error: "Document ID required" }, { status: 400 });
        }

        const updateResult = await updateUsageCount(resolvedUserId, documentId);
        return NextResponse.json(updateResult);
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("RAG API POST error:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
