import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { adminDb } from "@/lib/firebase-admin";
import { requireAuthContext } from "@/lib/server/auth-context";
import type {
  ABTestRecord,
  ABTestUpsertPayload,
  ABTestVariant,
} from "@/types/ab-test";

const COLLECTION = "ab_tests";

function normalizeVariant(variant: ABTestVariant, idx: number): ABTestVariant {
  const key = typeof variant.key === "string" && variant.key.trim().length > 0
    ? variant.key.trim()
    : `variant-${idx + 1}`;

  const normalized: ABTestVariant = {
    key,
    label: variant.label?.trim() || `パターン${idx + 1}`,
    result: variant.result ?? "pending",
  };

  // undefinedの代わりにnullを使用、またはフィールドを削除
  if (variant.description?.trim()) {
    normalized.description = variant.description.trim();
  }

  if (variant.linkedPostId?.trim()) {
    normalized.linkedPostId = variant.linkedPostId.trim();
  }

  if (variant.metrics) {
    normalized.metrics = variant.metrics;
  }

  return normalized;
}

function serializeTest(doc: admin.firestore.QueryDocumentSnapshot): ABTestRecord {
  const data = doc.data();
  const createdAt = data.createdAt?.toDate?.()?.toISOString() ?? null;
  const updatedAt = data.updatedAt?.toDate?.()?.toISOString() ?? null;
  
  // scheduledStartとscheduledEndを適切に変換
  let scheduledStart: string | null = null;
  if (data.scheduledStart) {
    if (data.scheduledStart instanceof admin.firestore.Timestamp) {
      scheduledStart = data.scheduledStart.toDate().toISOString();
    } else if (data.scheduledStart.toDate) {
      scheduledStart = data.scheduledStart.toDate().toISOString();
    } else if (typeof data.scheduledStart === "string") {
      scheduledStart = data.scheduledStart;
    }
  }
  
  let scheduledEnd: string | null = null;
  if (data.scheduledEnd) {
    if (data.scheduledEnd instanceof admin.firestore.Timestamp) {
      scheduledEnd = data.scheduledEnd.toDate().toISOString();
    } else if (data.scheduledEnd.toDate) {
      scheduledEnd = data.scheduledEnd.toDate().toISOString();
    } else if (typeof data.scheduledEnd === "string") {
      scheduledEnd = data.scheduledEnd;
    }
  }
  
  return {
    id: doc.id,
    userId: data.userId,
    name: data.name,
    goal: data.goal ?? undefined,
    hypothesis: data.hypothesis ?? undefined,
    primaryMetric: data.primaryMetric ?? undefined,
    status: data.status ?? "draft",
    notes: data.notes ?? undefined,
    winnerVariantKey: data.winnerVariantKey ?? null,
    scheduledStart,
    scheduledEnd,
    variants: Array.isArray(data.variants) ? data.variants : [],
    createdAt,
    updatedAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      auditEventName: "ab_tests:list",
    });

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");
    const limitParam = Number(searchParams.get("limit")) || 20;
    const limit = Math.max(1, Math.min(limitParam, 100));

    let query = adminDb
      .collection(COLLECTION)
      .where("userId", "==", uid)
      .orderBy("updatedAt", "desc")
      .limit(limit);

    if (statusFilter) {
      query = query.where("status", "==", statusFilter);
    }

    const snapshot = await query.get();
    const tests = snapshot.docs.map((doc) => serializeTest(doc));

    return NextResponse.json({ success: true, data: tests });
  } catch (error) {
    console.error("ABテスト取得エラー:", error);
    return NextResponse.json(
      { success: false, error: "A/Bテストの取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      auditEventName: "ab_tests:upsert",
      rateLimit: {
        key: "ab-tests-upsert",
        limit: 30,
        windowSeconds: 60,
      },
    });

    const body = (await request.json()) as ABTestUpsertPayload;
    if (!body || typeof body.name !== "string" || !Array.isArray(body.variants)) {
      return NextResponse.json(
        { success: false, error: "name と variants は必須です" },
        { status: 400 }
      );
    }

    if (body.variants.length < 2) {
      return NextResponse.json(
        { success: false, error: "variant は2つ以上必要です" },
        { status: 400 }
      );
    }

    const normalizedVariants = body.variants.map((variant, idx) => normalizeVariant(variant, idx));

    const status = body.status ?? "draft";
    const docId = body.id?.trim() || `${uid}_${Date.now()}`;
    const docRef = adminDb.collection(COLLECTION).doc(docId);
    const existingSnapshot = await docRef.get();

    // scheduledStartとscheduledEndを適切に変換
    let scheduledStart: admin.firestore.Timestamp | null = null;
    if (body.scheduledStart) {
      try {
        const date = new Date(body.scheduledStart);
        if (!isNaN(date.getTime())) {
          scheduledStart = admin.firestore.Timestamp.fromDate(date);
        }
      } catch (err) {
        console.warn("scheduledStartの変換エラー:", err);
      }
    }

    let scheduledEnd: admin.firestore.Timestamp | null = null;
    if (body.scheduledEnd) {
      try {
        const date = new Date(body.scheduledEnd);
        if (!isNaN(date.getTime())) {
          scheduledEnd = admin.firestore.Timestamp.fromDate(date);
        }
      } catch (err) {
        console.warn("scheduledEndの変換エラー:", err);
      }
    }

    // undefinedをnullに変換するヘルパー関数
    const cleanValue = (value: unknown): unknown => {
      if (value === undefined) return null;
      if (Array.isArray(value)) {
        return value.map((item) => {
          if (typeof item === "object" && item !== null) {
            const cleaned: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(item)) {
              if (v !== undefined) {
                cleaned[k] = cleanValue(v);
              }
            }
            return cleaned;
          }
          return item;
        });
      }
      if (typeof value === "object" && value !== null) {
        const cleaned: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value)) {
          if (v !== undefined) {
            cleaned[k] = cleanValue(v);
          }
        }
        return cleaned;
      }
      return value;
    };

    const payload = {
      userId: uid,
      name: body.name.trim(),
      goal: body.goal?.trim() || null,
      hypothesis: body.hypothesis?.trim() || null,
      primaryMetric: body.primaryMetric?.trim() || null,
      status,
      notes: body.notes?.trim() || null,
      winnerVariantKey: body.winnerVariantKey ?? null,
      scheduledStart,
      scheduledEnd,
      variants: cleanValue(normalizedVariants),
      createdAt: existingSnapshot.exists
        ? existingSnapshot.data()?.createdAt ?? admin.firestore.FieldValue.serverTimestamp()
        : admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await docRef.set(payload, { merge: true });
    const savedSnapshot = await docRef.get();
    const saved = serializeTest(savedSnapshot as admin.firestore.QueryDocumentSnapshot);

    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error("ABテスト保存エラー:", error);
    const errorMessage = error instanceof Error ? error.message : "A/Bテストの保存に失敗しました";
    const errorDetails = error instanceof Error ? error.stack : String(error);
    
    // 開発環境では詳細なエラー情報を返す
    if (process.env.NODE_ENV === "development") {
      console.error("エラー詳細:", errorDetails);
      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage,
          details: errorDetails 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

