"use client";

import { FormEvent, useState } from "react";
import SNSLayout from "@/components/sns-layout";
import { authFetch } from "@/utils/authFetch";

interface InsightsResponse {
  success: boolean;
  data?: {
    mediaId: string;
    metrics: Array<{
      name: string;
      value: number;
    }>;
    note: string;
  };
  error?: string;
}

export default function MetaReviewInsightsPage() {
  const [mediaId, setMediaId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InsightsResponse["data"] | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const query = new URLSearchParams({ mediaId }).toString();
      const res = await authFetch(`/api/review/meta/insights?${query}`);
      const json = (await res.json()) as InsightsResponse;

      if (!res.ok || !json.success || !json.data) {
        setError(json.error || "インサイト取得に失敗しました。");
        return;
      }

      setResult(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "インサイト取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SNSLayout customTitle="Meta審査: 投稿インサイト" customDescription="投稿単位の分析データ取得">
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Reviewer向け手順</h2>
          <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1">
            <li>Media ID を入力して「インサイト取得」を押す</li>
            <li>impressions / reach / likes / comments / saves を確認する</li>
          </ol>
        </div>

        <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Media ID</label>
            <input
              type="text"
              value={mediaId}
              onChange={(e) => setMediaId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="1789..."
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-black text-white rounded-md disabled:opacity-50"
          >
            {loading ? "取得中..." : "インサイト取得"}
          </button>
        </form>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {result && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm space-y-2">
            <p><span className="font-semibold">Media ID:</span> {result.mediaId}</p>
            <div className="space-y-1">
              {result.metrics.map((metric) => (
                <p key={metric.name}>
                  <span className="font-semibold">{metric.name}:</span> {metric.value.toLocaleString()}
                </p>
              ))}
            </div>
            <p className="text-gray-600">{result.note}</p>
          </div>
        )}
      </div>
    </SNSLayout>
  );
}
