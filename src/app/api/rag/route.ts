import { NextRequest, NextResponse } from "next/server";
import { RagRepository } from "@/repositories/rag-repository";
import {
  buildErrorResponse,
  ForbiddenError,
  requireAuthContext,
} from "../../../lib/server/auth-context";

function resolveRequestedUserId(candidate: unknown, authenticatedUid: string): string {
  if (candidate === undefined || candidate === null || candidate === "") {
    return authenticatedUid;
  }

  if (typeof candidate !== "string" || candidate !== authenticatedUid) {
    throw new ForbiddenError("他のユーザーのRAGデータにはアクセスできません");
  }

  return candidate;
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

        const similarQuestions = await RagRepository.searchSimilarQuestions(userId, question);
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
        return NextResponse.json(
          await RagRepository.recordLearningData(userId, interactionType, content, context),
        );
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

        return NextResponse.json(
          await RagRepository.saveVectorDocument(resolvedUserId, question, answer, qualityScore),
        );
      }

      case "update_usage": {
        if (!documentId) {
          return NextResponse.json({ error: "Document ID required" }, { status: 400 });
        }

        return NextResponse.json(await RagRepository.updateUsageCount(resolvedUserId, documentId));
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
