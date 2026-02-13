"use client";

import { useCallback, useState } from "react";
import SNSLayout from "@/components/sns-layout";
import { authFetch } from "@/utils/authFetch";

interface ConnectStatusResponse {
  success: boolean;
  data?: {
    pageConnected: boolean;
    instagramConnected: boolean;
    pageId: string | null;
    instagramAccountId: string | null;
    note: string;
  };
  error?: string;
}

export default function MetaReviewConnectPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectStatusResponse["data"] | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/review/meta/connect/status");
      const json = (await res.json()) as ConnectStatusResponse;
      if (!res.ok || !json.success || !json.data) {
        setError(json.error || "接続状態の取得に失敗しました。");
        return;
      }
      setStatus(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "接続状態の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <SNSLayout customTitle="Meta審査: 接続確認" customDescription="FacebookページとInstagramアカウントの接続状態を確認">
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Reviewer向け手順</h2>
          <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1">
            <li>「接続状態を更新」を押す</li>
            <li>Facebook Page / Instagram Professional Account の接続状態を確認する</li>
          </ol>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void fetchStatus()}
            disabled={loading}
            className="px-4 py-2 bg-black text-white rounded-md disabled:opacity-50"
          >
            {loading ? "取得中..." : "接続状態を更新"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {status && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2 text-sm">
            <p><span className="font-semibold">Page連携:</span> {status.pageConnected ? "接続済み" : "未接続"}</p>
            <p><span className="font-semibold">Instagram連携:</span> {status.instagramConnected ? "接続済み" : "未接続"}</p>
            <p><span className="font-semibold">Page ID:</span> {status.pageId || "-"}</p>
            <p><span className="font-semibold">Instagram Account ID:</span> {status.instagramAccountId || "-"}</p>
            <p className="text-gray-600">{status.note}</p>
          </div>
        )}
      </div>
    </SNSLayout>
  );
}
