"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Upload, X } from "lucide-react";
import { compressImageToSize } from "../../../../utils/image-utils";

interface PostEditorImageUploadProps {
  image: string | null;
  onImageChange?: (image: string | null) => void;
  onShowToast?: (message: string, type?: "success" | "error") => void;
}

export const PostEditorImageUpload: React.FC<PostEditorImageUploadProps> = ({
  image,
  onImageChange,
  onShowToast,
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // ファイルサイズチェック（10MB制限）
    if (file.size > 10 * 1024 * 1024) {
      onShowToast?.("ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。");
      return;
    }

    // 画像ファイルチェック
    if (!file.type.startsWith("image/")) {
      onShowToast?.("画像ファイルを選択してください。");
      return;
    }

    setIsUploading(true);
    try {
      // 画像を圧縮（800KB以下になるように調整）
      const compressedImage = await compressImageToSize(file, 800 * 1024);
      onImageChange?.(compressedImage);
    } catch (error) {
      console.error("画像アップロードエラー:", error);
      onShowToast?.("画像のアップロードに失敗しました。もう一度お試しください。");
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageRemove = () => {
    onImageChange?.(null);
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-semibold text-gray-800 mb-3">画像</label>
      {image ? (
        <div className="relative">
          <div className="relative w-full h-64 bg-gray-100 overflow-hidden">
            {image.startsWith("data:") ? (
              <img
                src={image}
                alt="投稿画像"
                className="w-full h-full object-contain"
              />
            ) : (
              <Image
                src={image}
                alt="投稿画像"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                unoptimized
              />
            )}
          </div>
          <button
            onClick={handleImageRemove}
            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            aria-label="画像を削除"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 p-8 text-center hover:border-[#ff8a15] transition-colors">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={isUploading}
            className="hidden"
            id="image-upload-input"
          />
          <label
            htmlFor="image-upload-input"
            className="cursor-pointer flex flex-col items-center"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff8a15] mb-2"></div>
                <span className="text-sm text-gray-600">アップロード中...</span>
              </>
            ) : (
              <>
                <Upload size={32} className="text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">画像をアップロード</span>
                <span className="text-xs text-gray-500 mt-1">JPEG, PNG (最大10MB)</span>
              </>
            )}
          </label>
        </div>
      )}
    </div>
  );
};


