/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const admin = require("firebase-admin");

const DATA_URL_PREFIX = "data:image/";
const DEFAULT_PAGE_SIZE = 200;

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  const text = fs.readFileSync(envPath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function initAdmin() {
  if (admin.apps.length > 0) return;

  loadLocalEnv();

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || "signal-v1-fc481";
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
    ? process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined;
  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${projectId}.appspot.com`;

  if (!clientEmail || !privateKey) {
    throw new Error("Missing FIREBASE_ADMIN_CLIENT_EMAIL or FIREBASE_ADMIN_PRIVATE_KEY");
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    projectId,
    storageBucket,
  });
}

function parseImageDataUrl(dataUrl) {
  const value = String(dataUrl || "").trim();
  if (!value || !value.startsWith(DATA_URL_PREFIX)) return null;

  const commaIndex = value.indexOf(",");
  if (commaIndex <= 5) return null;

  const header = value.slice(0, commaIndex);
  const payload = value.slice(commaIndex + 1).trim();
  if (!header.endsWith(";base64")) return null;

  const mimeType = header.slice("data:".length, -";base64".length).trim();
  if (!mimeType.startsWith("image/")) return null;
  if (!payload) return null;

  try {
    const bytes = Buffer.from(payload, "base64");
    if (!bytes.length) return null;
    return { mimeType, bytes };
  } catch {
    return null;
  }
}

function extFromMimeType(mimeType) {
  const type = String(mimeType || "").toLowerCase();
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  if (type === "image/heic") return "heic";
  if (type === "image/heif") return "heif";
  return "bin";
}

function buildDownloadUrl(bucketName, objectPath, token) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
    objectPath
  )}?alt=media&token=${token}`;
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    limit: 0,
    userId: "",
    pageSize: DEFAULT_PAGE_SIZE,
  };

  for (const arg of argv.slice(2)) {
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg.startsWith("--limit=")) args.limit = Number(arg.split("=")[1]) || 0;
    else if (arg.startsWith("--userId=")) args.userId = String(arg.split("=")[1] || "").trim();
    else if (arg.startsWith("--page-size="))
      args.pageSize = Math.max(1, Number(arg.split("=")[1]) || DEFAULT_PAGE_SIZE);
  }
  return args;
}

async function migrate() {
  const args = parseArgs(process.argv);
  initAdmin();

  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  let processed = 0;
  let scanned = 0;
  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  let lastDoc = null;

  console.log(
    `[start] dryRun=${args.dryRun} limit=${args.limit || "none"} userId=${args.userId || "all"} bucket=${bucket.name}`
  );

  while (true) {
    let query = db.collection("posts").orderBy(admin.firestore.FieldPath.documentId()).limit(args.pageSize);
    if (lastDoc) query = query.startAfter(lastDoc.id);

    const snap = await query.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      lastDoc = doc;
      scanned += 1;

      const data = doc.data() || {};
      if (args.userId && String(data.userId || "") !== args.userId) {
        skipped += 1;
        continue;
      }

      const imageData = typeof data.imageData === "string" ? data.imageData.trim() : "";
      const imageUrl = typeof data.imageUrl === "string" ? data.imageUrl.trim() : "";
      if (!imageData) {
        skipped += 1;
        continue;
      }

      processed += 1;
      if (args.limit > 0 && processed > args.limit) {
        console.log(`[stop] reached limit=${args.limit}`);
        console.log(
          `[summary] scanned=${scanned} processed=${processed - 1} migrated=${migrated} skipped=${skipped} failed=${failed}`
        );
        return;
      }

      if (!imageData.startsWith(DATA_URL_PREFIX)) {
        if (args.dryRun) {
          console.log(`[dry-run][${doc.id}] clear non-data-url imageData`);
          migrated += 1;
        } else {
          await doc.ref.update({
            imageData: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          migrated += 1;
        }
        continue;
      }

      if (imageUrl) {
        if (args.dryRun) {
          console.log(`[dry-run][${doc.id}] keep existing imageUrl and clear imageData`);
          migrated += 1;
        } else {
          await doc.ref.update({
            imageData: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          migrated += 1;
        }
        continue;
      }

      const parsed = parseImageDataUrl(imageData);
      if (!parsed) {
        failed += 1;
        console.error(`[fail][${doc.id}] invalid imageData format`);
        continue;
      }

      const userId = String(data.userId || "unknown-user");
      const ext = extFromMimeType(parsed.mimeType);
      const objectPath = `posts/${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const token = crypto.randomUUID();
      const publicUrl = buildDownloadUrl(bucket.name, objectPath, token);

      if (args.dryRun) {
        console.log(
          `[dry-run][${doc.id}] upload bytes=${parsed.bytes.length} mime=${parsed.mimeType} to=${objectPath}`
        );
        migrated += 1;
        continue;
      }

      try {
        await bucket.file(objectPath).save(parsed.bytes, {
          resumable: false,
          metadata: {
            contentType: parsed.mimeType,
            metadata: {
              firebaseStorageDownloadTokens: token,
            },
            cacheControl: "public,max-age=31536000,immutable",
          },
        });

        await doc.ref.update({
          imageUrl: publicUrl,
          imageData: null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        migrated += 1;
      } catch (error) {
        failed += 1;
        console.error(`[fail][${doc.id}]`, error);
      }
    }
  }

  console.log(
    `[summary] scanned=${scanned} processed=${processed} migrated=${migrated} skipped=${skipped} failed=${failed}`
  );
}

migrate().catch((error) => {
  console.error("[fatal]", error);
  process.exit(1);
});

