import * as admin from "firebase-admin";
import { adminDb } from "@/lib/firebase-admin";
import { ForbiddenError } from "@/lib/server/auth-context";
import { COLLECTIONS } from "@/repositories/collections";

export interface VectorDocumentRecord {
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

export interface LearningDataRecord {
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

export class RagRepository {
  static async searchSimilarQuestions(
    userId: string,
    question: string,
    threshold = 0.7,
  ): Promise<Array<VectorDocumentRecord & { similarity: number }>> {
    const questionVector = this.textToVector(question);
    const category = this.categorizeQuestion(question);

    const snapshot = await adminDb
      .collection(COLLECTIONS.VECTOR_DOCUMENTS)
      .where("userId", "==", userId)
      .where("category", "==", category)
      .orderBy("qualityScore", "desc")
      .limit(20)
      .get();

    const similarQuestions: Array<VectorDocumentRecord & { similarity: number }> = [];
    snapshot.docs.forEach((snapshotDoc) => {
      const data = snapshotDoc.data() as Omit<VectorDocumentRecord, "id">;
      const similarity = this.cosineSimilarity(questionVector, data.vector);
      if (similarity >= threshold) {
        similarQuestions.push({ ...data, id: snapshotDoc.id, similarity });
      }
    });

    similarQuestions.sort((a, b) => b.similarity - a.similarity);
    return similarQuestions.slice(0, 3);
  }

  static async recordLearningData(
    userId: string,
    interactionType: string,
    content: string,
    context: Record<string, unknown> = {},
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const learningData: LearningDataRecord = {
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

      await adminDb.collection(COLLECTIONS.LEARNING_DATA).add(learningData);
      return { success: true };
    } catch (error) {
      console.error("学習データ記録エラー:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  static async saveVectorDocument(
    userId: string,
    question: string,
    answer: string,
    qualityScore = 0.5,
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const vectorDoc: VectorDocumentRecord = {
        id: "",
        userId,
        question,
        answer,
        vector: this.textToVector(question),
        category: this.categorizeQuestion(question),
        tags: this.generateTags(question),
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
        qualityScore,
      };

      const docRef = await adminDb.collection(COLLECTIONS.VECTOR_DOCUMENTS).add(vectorDoc);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error("ベクトルドキュメント保存エラー:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  static async updateUsageCount(
    userId: string,
    documentId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const docRef = adminDb.collection(COLLECTIONS.VECTOR_DOCUMENTS).doc(documentId);
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

  private static cosineSimilarity(vecA: number[], vecB: number[]): number {
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

  private static textToVector(text: string): number[] {
    const words = text.toLowerCase().split(/\s+/);
    const wordCount: Record<string, number> = {};
    words.forEach((word) => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    const vector = new Array(100).fill(0);
    Object.keys(wordCount).forEach((word, index) => {
      if (index < 100) {
        vector[index] = wordCount[word];
      }
    });
    return vector;
  }

  private static categorizeQuestion(question: string): string {
    const lowerQuestion = question.toLowerCase();
    if (lowerQuestion.includes("投稿") || lowerQuestion.includes("post")) {return "posting";}
    if (lowerQuestion.includes("ハッシュタグ") || lowerQuestion.includes("hashtag")) {return "hashtags";}
    if (lowerQuestion.includes("時間") || lowerQuestion.includes("タイミング")) {return "timing";}
    if (lowerQuestion.includes("エンゲージメント") || lowerQuestion.includes("engagement")) {return "engagement";}
    if (lowerQuestion.includes("フォロワー") || lowerQuestion.includes("follower")) {return "growth";}
    if (lowerQuestion.includes("コンテンツ") || lowerQuestion.includes("content")) {return "content";}
    return "general";
  }

  private static generateTags(question: string): string[] {
    const tags: string[] = [];
    const lowerQuestion = question.toLowerCase();
    const keywordMap: Record<string, string[]> = {
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
}
