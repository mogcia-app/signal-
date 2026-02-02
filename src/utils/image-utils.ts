/**
 * 画像圧縮ユーティリティ
 */

/**
 * 画像を圧縮する
 * @param file 圧縮する画像ファイル
 * @param maxWidth 最大幅（デフォルト: 1920px）
 * @param maxHeight 最大高さ（デフォルト: 1920px）
 * @param quality 圧縮品質（0.0-1.0、デフォルト: 0.8）
 * @returns 圧縮された画像のDataURL
 */
export const compressImage = (
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement("img");
      img.onload = () => {
        // 画像のサイズを計算
        let width = img.width;
        let height = img.height;

        // 最大サイズを超えている場合はリサイズ
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        // Canvasで画像を描画
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // JPEG形式で圧縮（PNGの場合はJPEGに変換）
        const mimeType = file.type === "image/png" ? "image/jpeg" : file.type;
        const compressedDataUrl = canvas.toDataURL(mimeType, quality);

        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
    reader.readAsDataURL(file);
  });
};

/**
 * Base64エンコードされた画像データのサイズをバイト単位で計算
 * @param base64Data Base64エンコードされた画像データ
 * @returns バイト単位のサイズ
 */
export const getBase64ImageSize = (base64Data: string): number => {
  return base64Data.length * 0.75; // Base64文字列のサイズをバイトに変換
};

/**
 * 画像ファイルが指定サイズ以下になるように圧縮を試みる
 * @param file 圧縮する画像ファイル
 * @param maxSizeBytes 最大サイズ（バイト単位、デフォルト: 800KB）
 * @returns 圧縮された画像のDataURL
 */
export const compressImageToSize = async (
  file: File,
  maxSizeBytes: number = 800 * 1024
): Promise<string> => {
  // 最初の圧縮を試みる
  let compressed = await compressImage(file, 1920, 1920, 0.8);
  let size = getBase64ImageSize(compressed);

  if (size <= maxSizeBytes) {
    return compressed;
  }

  // さらに圧縮を試みる
  compressed = await compressImage(file, 1600, 1600, 0.7);
  size = getBase64ImageSize(compressed);

  if (size <= maxSizeBytes) {
    return compressed;
  }

  // 最終的な圧縮
  return compressImage(file, 1280, 1280, 0.6);
};

