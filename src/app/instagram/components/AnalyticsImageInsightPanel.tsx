"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { Sparkles, Upload, X } from "lucide-react";
import { authFetch } from "../../../utils/authFetch";

interface InsightResult {
  summary: string;
  suggestedCaption: string;
  suggestedHashtags: string[];
}

interface AnalyticsImageInsightPanelProps {
  postType: "feed" | "reel" | "story";
  postData?: {
    id: string;
    title: string;
    content: string;
    hashtags: string[];
    postType: "feed" | "reel" | "story";
  } | null;
  metrics?: {
    likes?: string;
    comments?: string;
    shares?: string;
    reach?: string;
    saves?: string;
    followerIncrease?: string;
    profileVisits?: string;
    profileFollows?: string;
    reelAvgPlayTime?: string;
    reelSkipRate?: string;
  };
}

export default function AnalyticsImageInsightPanel({ postType, postData, metrics }: AnalyticsImageInsightPanelProps) {
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InsightResult | null>(null);

  const existingTextContext = useMemo(() => {
    const tags = postData?.hashtags?.length ? postData.hashtags.join(" ") : "";
    return {
      title: postData?.title || "",
      content: postData?.content || "",
      hashtags: tags,
    };
  }, [postData]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください。");
      return;
    }

    // 2MB上限
    if (file.size > 2 * 1024 * 1024) {
      setError("画像サイズは2MB以下にしてください。");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setImageData(result);
        setImageName(file.name);
        setError(null);
        setResult(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageData(null);
    setImageName("");
    setResult(null);
    setError(null);
  };

  const analyzeImage = async () => {
    if (!imageData) {
      setError("先に画像をアップロードしてください。");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await authFetch("/api/ai/image-insight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postType,
          imageData,
          textContext: existingTextContext,
          metrics,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "画像分析に失敗しました");
      }

      setResult(data.data as InsightResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "画像分析に失敗しました");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">画像から投稿文提案</h3>
        <p className="text-xs text-gray-500 mt-1">
          画像から最適な投稿文・ハッシュタグを提案します。
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-600">サムネイル画像</label>
        <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 cursor-pointer hover:bg-gray-50 text-sm">
          <Upload size={14} />
          <span>画像をアップロード</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </label>
        {imageName ? <p className="text-xs text-gray-500">{imageName}</p> : null}
      </div>

      {imageData ? (
        <div className="relative border border-gray-200 p-2">
          <Image src={imageData} alt="uploaded thumbnail" width={640} height={360} className="w-full h-auto object-contain" unoptimized />
          <button
            type="button"
            onClick={clearImage}
            className="absolute top-2 right-2 p-1 bg-black/60 text-white hover:bg-black/80"
            aria-label="画像を削除"
          >
            <X size={12} />
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={analyzeImage}
        disabled={!imageData || isAnalyzing}
        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium bg-[#ff8a15] text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        <Sparkles size={14} />
        {isAnalyzing ? "生成中..." : "投稿文・ハッシュタグを提案"}
      </button>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      {result ? (
        <div className="space-y-4 border-t border-gray-200 pt-4">
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-1">総評</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{result.summary}</p>
          </div>

          {result.suggestedCaption ? (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">提案投稿文</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{result.suggestedCaption}</p>
            </div>
          ) : null}

          {result.suggestedHashtags?.length ? (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">提案ハッシュタグ</p>
              <div className="flex flex-wrap gap-2">
                {result.suggestedHashtags.map((tag, index) => (
                  <span key={`tag-${index}`} className="text-xs px-2 py-1 bg-orange-50 text-orange-700 border border-orange-200">
                    #{tag.replace(/^#+/, "")}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
