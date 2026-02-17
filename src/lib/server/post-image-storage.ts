import { randomUUID } from "crypto";
import { getAdminStorageBucket } from "@/lib/firebase-admin";

const DATA_URL_PREFIX = "data:image/";

const mimeTypeToExtension = (mimeType: string): string => {
  const normalized = mimeType.toLowerCase();
  if (normalized === "image/jpeg") {return "jpg";}
  if (normalized === "image/png") {return "png";}
  if (normalized === "image/webp") {return "webp";}
  if (normalized === "image/gif") {return "gif";}
  if (normalized === "image/heic") {return "heic";}
  if (normalized === "image/heif") {return "heif";}
  return "bin";
};

const parseImageDataUrl = (dataUrl: string): { mimeType: string; bytes: Buffer } | null => {
  const value = String(dataUrl || "").trim();
  if (!value || !value.startsWith(DATA_URL_PREFIX)) {return null;}

  const commaIndex = value.indexOf(",");
  if (commaIndex <= 5) {return null;}

  const header = value.slice(0, commaIndex);
  const base64Payload = value.slice(commaIndex + 1).trim();
  if (!header.endsWith(";base64")) {return null;}

  const mimeType = header.slice("data:".length, -";base64".length).trim();
  if (!mimeType.startsWith("image/")) {return null;}
  if (!mimeType || !base64Payload) {return null;}

  try {
    const bytes = Buffer.from(base64Payload, "base64");
    if (!bytes.length) {return null;}
    return { mimeType, bytes };
  } catch {
    return null;
  }
};

const buildFirebaseDownloadUrl = (bucketName: string, objectPath: string, token: string): string => {
  const encodedPath = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;
};

export const uploadPostImageDataUrl = async (params: {
  userId: string;
  imageDataUrl: string;
}): Promise<{ imageUrl: string; storagePath: string }> => {
  const parsed = parseImageDataUrl(params.imageDataUrl);
  if (!parsed) {
    throw new Error("INVALID_IMAGE_DATA_URL");
  }

  const bucket = getAdminStorageBucket();
  const ext = mimeTypeToExtension(parsed.mimeType);
  const storagePath = `posts/${params.userId}/${Date.now()}-${randomUUID()}.${ext}`;
  const downloadToken = randomUUID();

  const file = bucket.file(storagePath);
  await file.save(parsed.bytes, {
    resumable: false,
    metadata: {
      contentType: parsed.mimeType,
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
      cacheControl: "public,max-age=31536000,immutable",
    },
  });

  return {
    imageUrl: buildFirebaseDownloadUrl(bucket.name, storagePath, downloadToken),
    storagePath,
  };
};

const parsePathFromFirebaseDownloadUrl = (url: string, bucketName: string): string | null => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    if (host === "firebasestorage.googleapis.com") {
      const matched = parsed.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
      if (!matched) {return null;}
      if (matched[1] !== bucketName) {return null;}
      return decodeURIComponent(matched[2]);
    }

    if (host === "storage.googleapis.com") {
      const matched = parsed.pathname.match(/^\/([^/]+)\/(.+)$/);
      if (!matched) {return null;}
      if (matched[1] !== bucketName) {return null;}
      return decodeURIComponent(matched[2]);
    }

    return null;
  } catch {
    return null;
  }
};

export const deletePostImageByUrl = async (imageUrl: string): Promise<void> => {
  const bucket = getAdminStorageBucket();
  const path = parsePathFromFirebaseDownloadUrl(String(imageUrl || ""), bucket.name);
  if (!path || !path.startsWith("posts/")) {return;}

  await bucket
    .file(path)
    .delete({ ignoreNotFound: true })
    .catch(() => {
      // 画像削除はベストエフォート
    });
};
