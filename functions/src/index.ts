import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import OpenAI from "openai";
import * as admin from "firebase-admin";
import { Storage } from "@google-cloud/storage";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// Initialize OpenAI (lazy initialization)
const getOpenAI = () => {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key is not set");
  }
  return new OpenAI({ apiKey });
};

// Initialize Cloud Storage
const storage = new Storage();

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

export const helloWorld = onRequest({ cors: true }, (request, response) => {
  logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from Firebase!");
});

// HTTPSトリガーの例
export const api = onRequest({ cors: true }, (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.status(204).send("");
    return;
  }

  switch (req.method) {
    case "GET":
      res.json({ message: "GET request received", timestamp: new Date().toISOString() });
      break;
    case "POST":
      res.json({
        message: "POST request received",
        data: req.body,
        timestamp: new Date().toISOString(),
      });
      break;
    default:
      res.status(405).json({ error: "Method not allowed" });
  }
});

// AI Chat Function
export const aiChat = onRequest({ cors: true }, async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { message, context } = req.body;

    if (!message) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    // プロンプトを構築
    const systemPrompt = `あなたはInstagram運用の専門家です。ユーザーの計画内容とシミュレーション結果を基に、具体的で実用的なアドバイスを提供してください。

現在の計画内容:
${context ? JSON.stringify(context, null, 2) : "計画情報なし"}

ユーザーの質問に日本語で回答してください。専門的でありながら分かりやすく、実行可能な提案を心がけてください。`;

    logger.info("AI Chat request", { message, hasContext: !!context });

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const response =
      completion.choices[0]?.message?.content || "申し訳ございません。回答を生成できませんでした。";

    logger.info("AI Chat response generated", {
      responseLength: response.length,
      tokensUsed: completion.usage?.total_tokens,
    });

    res.json({
      response,
      tokensUsed: completion.usage?.total_tokens,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("AI Chat error", { error: errorMessage });
    res.status(500).json({
      error: "AI Chat processing failed",
      details: errorMessage,
    });
  }
});

// Tool Maintenance Mode Functions
// CORS設定のヘルパー関数
function setCorsHeaders(res: any) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// メンテナンス状態の取得
export const getToolMaintenanceStatus = onRequest({ cors: true }, async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  try {
    // Firestoreからメンテナンス状態を取得
    const maintenanceDoc = await admin
      .firestore()
      .collection("toolMaintenance")
      .doc("current")
      .get();

    if (!maintenanceDoc.exists) {
      // デフォルト値（メンテナンス無効）
      res.status(200).json({
        success: true,
        data: {
          enabled: false,
          message: "",
          scheduledStart: null,
          scheduledEnd: null,
          updatedBy: "",
          updatedAt: null,
        },
      });
      return;
    }

    const data = maintenanceDoc.data();
    const updatedAt = data?.updatedAt;
    const updatedAtISO =
      updatedAt && updatedAt.toDate
        ? updatedAt.toDate().toISOString()
        : updatedAt || null;

    res.status(200).json({
      success: true,
      data: {
        enabled: data?.enabled || false,
        message: data?.message || "",
        scheduledStart: data?.scheduledStart || null,
        scheduledEnd: data?.scheduledEnd || null,
        updatedBy: data?.updatedBy || "",
        updatedAt: updatedAtISO,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Error fetching tool maintenance status", { error: errorMessage });
    res.status(500).json({
      success: false,
      error: "Failed to fetch maintenance status",
    });
  }
});

// メンテナンスモードの設定
export const setToolMaintenanceMode = onRequest({ cors: true }, async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  try {
    const { enabled, message, scheduledStart, scheduledEnd, updatedBy } = req.body;

    // バリデーション
    if (typeof enabled !== "boolean") {
      res.status(400).json({
        success: false,
        error: "enabled must be a boolean",
      });
      return;
    }

    // Firestoreに保存
    const maintenanceRef = admin.firestore().collection("toolMaintenance").doc("current");

    const updateData: any = {
      enabled,
      message: message || (enabled ? "システムメンテナンス中です。しばらくお待ちください。" : ""),
      updatedBy: updatedBy || "admin",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (scheduledStart) {
      updateData.scheduledStart = scheduledStart;
    }

    if (scheduledEnd) {
      updateData.scheduledEnd = scheduledEnd;
    }

    await maintenanceRef.set(updateData, { merge: true });

    // 更新後のデータを取得して返す
    const updatedDoc = await maintenanceRef.get();
    const data = updatedDoc.data();
    const updatedAt = data?.updatedAt;
    const updatedAtISO =
      updatedAt && updatedAt.toDate
        ? updatedAt.toDate().toISOString()
        : updatedAt || null;

    res.status(200).json({
      success: true,
      data: {
        enabled: data?.enabled || false,
        message: data?.message || "",
        scheduledStart: data?.scheduledStart || null,
        scheduledEnd: data?.scheduledEnd || null,
        updatedBy: data?.updatedBy || "",
        updatedAt: updatedAtISO,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Error setting tool maintenance mode", { error: errorMessage });
    res.status(500).json({
      success: false,
      error: "Failed to set maintenance mode",
    });
  }
});

/**
 * 週次バックアップ: Firestore → Cloud Storage (JSON)
 * 毎週日曜日の午前3時（JST）に実行
 */
export const weeklyBackup = onSchedule(
  {
    schedule: "0 3 * * 0", // 毎週日曜日 3:00 UTC (JST 12:00)
    timeZone: "Asia/Tokyo",
    region: "asia-northeast1", // 東京リージョンを明示的に指定
    memory: "512MiB",
    timeoutSeconds: 540, // 9分（最大10分）
  },
  async (event) => {
    const db = admin.firestore();
    const bucketName = process.env.BACKUP_BUCKET_NAME || `${process.env.GCLOUD_PROJECT}-backups`;
    const bucket = storage.bucket(bucketName);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = `firestore-backups/${timestamp}/firestore-export.json`;

    logger.info("週次バックアップ開始", { timestamp, bucketName, backupPath });

    try {
      // バケットが存在しない場合は作成
      const [exists] = await bucket.exists();
      if (!exists) {
        await bucket.create({
          location: "asia-northeast1", // 東京リージョン
          storageClass: "STANDARD",
        });
        logger.info("バックアップバケットを作成しました", { bucketName });
      }

      // 全コレクションを取得
      const collections = await db.listCollections();
      const backupData: Record<string, any> = {};

      // 各コレクションのデータを取得
      for (const collectionRef of collections) {
        const collectionName = collectionRef.id;
        logger.info(`コレクション取得中: ${collectionName}`);

        const snapshot = await db.collection(collectionName).get();
        const documents: any[] = [];

        for (const doc of snapshot.docs) {
          const docData = doc.data();
          // Firestore TimestampをISO文字列に変換
          const serializedData = JSON.parse(
            JSON.stringify(docData, (key, value) => {
              if (value && typeof value === "object" && value.constructor?.name === "Timestamp") {
                return {
                  _type: "timestamp",
                  seconds: value.seconds,
                  nanoseconds: value.nanoseconds,
                };
              }
              return value;
            })
          );
          documents.push({
            id: doc.id,
            data: serializedData,
          });
        }

        backupData[collectionName] = documents;
        logger.info(`コレクション取得完了: ${collectionName} (${documents.length}件)`);
      }

      // JSONファイルとしてCloud Storageにアップロード
      const file = bucket.file(backupPath);
      const jsonContent = JSON.stringify(backupData, null, 2);
      await file.save(jsonContent, {
        contentType: "application/json",
        metadata: {
          metadata: {
            backupType: "weekly",
            timestamp: timestamp,
            collectionCount: collections.length,
          },
        },
      });

      // メタデータファイルも作成（バックアップ情報）
      const metadataPath = `firestore-backups/${timestamp}/metadata.json`;
      const metadataFile = bucket.file(metadataPath);
      const metadata = {
        timestamp: timestamp,
        backupType: "weekly",
        collectionCount: collections.length,
        collections: collections.map((col) => col.id),
        totalDocuments: Object.values(backupData).reduce(
          (sum, docs) => sum + (Array.isArray(docs) ? docs.length : 0),
          0
        ),
      };
      await metadataFile.save(JSON.stringify(metadata, null, 2), {
        contentType: "application/json",
      });

      logger.info("週次バックアップ完了", {
        backupPath,
        metadataPath,
        totalCollections: collections.length,
        totalDocuments: metadata.totalDocuments,
      });

      // 古いバックアップを削除（30日以上前のもの）
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const [files] = await bucket.getFiles({ prefix: "firestore-backups/" });
      let deletedCount = 0;

      for (const file of files) {
        const [metadata] = await file.getMetadata();
        if (metadata.timeCreated) {
          const created = new Date(metadata.timeCreated);
          if (created < thirtyDaysAgo) {
            await file.delete();
            deletedCount++;
          }
        }
      }

      if (deletedCount > 0) {
        logger.info("古いバックアップを削除しました", { deletedCount });
      }
    } catch (error: any) {
      logger.error("週次バックアップエラー", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
);
