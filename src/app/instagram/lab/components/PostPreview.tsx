"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X } from "lucide-react";

interface PostPreviewProps {
  title?: string;
  content: string;
  image?: string | null;
  hashtags: string[];
  postType: "feed" | "reel" | "story";
  scheduledDate?: string;
  scheduledTime?: string;
  onImageChange?: (image: string | null) => void;
}

export const PostPreview: React.FC<PostPreviewProps> = ({
  title,
  content,
  image,
  hashtags,
  postType,
  scheduledDate,
  scheduledTime,
  onImageChange,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 画像圧縮関数
  const compressImage = (
    file: File,
    maxWidth: number,
    maxHeight: number,
    quality: number
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

          const mimeType = file.type === "image/png" ? "image/jpeg" : file.type;
          const compressedDataUrl = canvas.toDataURL(mimeType, quality);
          resolve(compressedDataUrl);
        };
        img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
        if (e.target?.result) {
          img.src = e.target.result as string;
        }
      };
      reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
      reader.readAsDataURL(file);
    });
  };

  // 画像アップロード処理
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 画像ファイルチェック
    if (!file.type.startsWith("image/")) {
      alert("画像ファイルを選択してください。");
      return;
    }

    setIsUploading(true);
    try {
      // 画像を圧縮（800KB以下になるように調整）
      let compressedImage = await compressImage(file, 1920, 1920, 0.8);
      const base64Size = compressedImage.length * 0.75;

      // 800KBを超える場合はさらに圧縮
      if (base64Size > 800 * 1024) {
        const moreCompressed = await compressImage(file, 1600, 1600, 0.7);
        const moreCompressedSize = moreCompressed.length * 0.75;
        if (moreCompressedSize > 800 * 1024) {
          const finalCompressed = await compressImage(file, 1280, 1280, 0.6);
          onImageChange?.(finalCompressed);
        } else {
          onImageChange?.(moreCompressed);
        }
      } else {
        onImageChange?.(compressedImage);
      }
    } catch (error) {
      console.error("画像アップロードエラー:", error);
      alert("画像のアップロードに失敗しました。もう一度お試しください。");
    } finally {
      setIsUploading(false);
      // ファイル入力のリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 画像削除
  const handleImageRemove = () => {
    onImageChange?.(null);
  };

  return (
    <div className="bg-white border border-gray-200 flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
          プレビュー
        </h3>
      </div>

      <div className="p-6 flex-1 flex flex-col min-h-0 overflow-auto">
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 border-2 border-gray-100">
          {/* 投稿情報ヘッダー */}
          <div className="mb-4 pb-3 border-b border-gray-200">
            <div className="flex items-center justify-between text-xs text-black">
              <div className="flex items-center space-x-3">
                <span className="font-medium">
                  {postType === "feed"
                    ? "📸 フィード"
                    : postType === "reel"
                      ? "🎬 リール"
                      : "📱 ストーリーズ"}
                </span>
                {scheduledDate && scheduledTime && (
                  <span className="text-black">
                    📅 {new Date(scheduledDate).toLocaleDateString("ja-JP")} {scheduledTime}
                  </span>
                )}
              </div>
              <div className="text-black">
                {scheduledDate
                  ? new Date(scheduledDate).toLocaleDateString("ja-JP")
                  : new Date().toLocaleDateString("ja-JP")}
              </div>
            </div>
          </div>

          {/* 投稿内容 */}
          {title && (
            <div className="text-lg font-semibold text-black mb-3">
              {title
                .replace(/^[\s#-]+|[\s#-]+$/g, "")
                .replace(/^#+/g, "")
                .trim()}
            </div>
          )}

          {/* 画像プレビュー/アップロード */}
          {image ? (
            <div className="mb-3 relative">
              <div className="relative w-full aspect-square">
                {image.startsWith("data:") ? (
                  <img
                    src={image}
                    alt="投稿画像"
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <Image
                    src={image}
                    alt="投稿画像"
                    fill
                    className="object-cover rounded-lg"
                    unoptimized
                  />
                )}
              </div>
              {onImageChange && (
                <>
                  <button
                    onClick={handleImageRemove}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors rounded z-10"
                  >
                    <X size={16} />
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 px-3 py-1.5 bg-white/90 text-gray-700 text-xs font-medium rounded hover:bg-white transition-colors border border-gray-300 z-10"
                  >
                    変更
                  </button>
                </>
              )}
            </div>
          ) : onImageChange ? (
            <div className="mb-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-400 hover:bg-orange-50/50 transition-colors cursor-pointer"
              >
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mb-2"></div>
                    <span className="text-gray-600 text-sm">アップロード中...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-gray-600 text-sm font-medium">画像をアップロード</p>
                    <p className="text-gray-400 text-xs mt-1">クリックして画像を選択</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          ) : null}

          {content ? (
            <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {content
                .replace(/^[\s#-]+|[\s#-]+$/g, "")
                .replace(/^#+/g, "")
                .trim()}
            </div>
          ) : (
            <div className="text-black italic text-center py-4">
              📝 投稿文を入力するとプレビューが表示されます
            </div>
          )}
          {hashtags.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="text-sm text-orange-600 flex flex-wrap gap-1">
                {hashtags
                  .map((hashtag) => {
                    // ハッシュタグから先頭の#を全て削除してから表示時に#を追加
                    const cleanHashtag = hashtag.replace(/^#+/, "").trim();
                    return `#${cleanHashtag}`;
                  })
                  .join(" ")}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostPreview;

