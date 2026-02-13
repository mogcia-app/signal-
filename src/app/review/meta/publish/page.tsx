"use client";

import { FormEvent, useState } from "react";
import SNSLayout from "@/components/sns-layout";
import { authFetch } from "@/utils/authFetch";

interface PublishResponse {
  success: boolean;
  data?: {
    creationId: string;
    scheduledPublishTime: string;
    note: string;
  };
  error?: string;
}

export default function MetaReviewPublishPage() {
  const [caption, setCaption] = useState("Meta Review Test Post");
  const [imageUrl, setImageUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublishResponse["data"] | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await authFetch("/api/review/meta/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caption,
          imageUrl,
          scheduledAt,
        }),
      });

      const json = (await res.json()) as PublishResponse;
      if (!res.ok || !json.success || !json.data) {
        setError(json.error || "予約投稿の作成に失敗しました。");
        return;
      }

      setResult(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "予約投稿の作成に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SNSLayout customTitle="Meta審査: 予約投稿" customDescription="Instagram投稿を予約作成">
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Reviewer向け手順</h2>
          <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1">
            <li>画像URL・本文・予約時刻を入力</li>
            <li>「予約投稿を作成」を押す</li>
            <li>返却された Creation ID を確認する</li>
          </ol>
        </div>

        <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Image URL</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="https://..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Scheduled At (ISO8601)</label>
            <input
              type="text"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="2026-02-15T10:30:00+09:00"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-black text-white rounded-md disabled:opacity-50"
          >
            {loading ? "作成中..." : "予約投稿を作成"}
          </button>
        </form>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {result && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm space-y-2">
            <p><span className="font-semibold">Creation ID:</span> {result.creationId}</p>
            <p><span className="font-semibold">Scheduled Publish Time:</span> {result.scheduledPublishTime}</p>
            <p className="text-gray-600">{result.note}</p>
          </div>
        )}
      </div>
    </SNSLayout>
  );
}
