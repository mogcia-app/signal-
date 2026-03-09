"use client";

import { useEffect, useMemo, useState } from "react";
import SNSLayout from "@/components/sns-layout";
import { authFetch } from "@/utils/authFetch";

type LoginEventItem = {
  id: string;
  eventType: "auth.login.success" | "auth.login.failed";
  outcome: "success" | "failed";
  actorUid: string | null;
  actorName: string | null;
  actorEmail: string | null;
  source: string | null;
  currentPath: string | null;
  errorCode: string | null;
  ip: string | null;
  createdAt: string | null;
};

type LoginEventsResponse = {
  success: boolean;
  data?: {
    range: { from: string; to: string };
    total: number;
    successCount: number;
    failedCount: number;
    uniqueActors: number;
    items: LoginEventItem[];
  };
  error?: string;
};

export default function AdminLoginEventsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [outcome, setOutcome] = useState<"all" | "success" | "failed">("all");
  const [summary, setSummary] = useState<LoginEventsResponse["data"] | null>(null);

  const rangeLabel = useMemo(() => {
    if (!summary?.range) {
      return "";
    }
    const from = new Date(summary.range.from).toLocaleString("ja-JP");
    const to = new Date(summary.range.to).toLocaleString("ja-JP");
    return `${from} - ${to}`;
  }, [summary]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const to = new Date();
        const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
        const query = new URLSearchParams({
          from: from.toISOString(),
          to: to.toISOString(),
          limit: "5000",
          outcome,
        });
        const response = await authFetch(`/api/admin/login-events?${query.toString()}`);
        const result = (await response.json().catch(() => null)) as LoginEventsResponse | null;
        if (cancelled) {
          return;
        }
        if (!response.ok || !result?.success || !result.data) {
          throw new Error(result?.error || `HTTP ${response.status}`);
        }
        setSummary(result.data);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "ログ取得に失敗しました");
          setSummary(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [days, outcome]);

  return (
    <SNSLayout customTitle="ログイン監査ログ" customDescription="ログイン成功/失敗ログ（管理者向け）">
      <div className="space-y-4">
        <div className="bg-white border border-gray-200 p-4 flex flex-wrap items-center gap-3">
          <label htmlFor="outcome" className="text-sm text-gray-700">
            種別
          </label>
          <select
            id="outcome"
            value={outcome}
            onChange={(event) => setOutcome(event.target.value as "all" | "success" | "failed")}
            className="border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            <option value="all">全件</option>
            <option value="success">成功のみ</option>
            <option value="failed">失敗のみ</option>
          </select>

          <label htmlFor="range-days" className="text-sm text-gray-700">
            集計期間
          </label>
          <select
            id="range-days"
            value={days}
            onChange={(event) => setDays(Number.parseInt(event.target.value, 10))}
            className="border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            <option value={1}>直近1日</option>
            <option value={7}>直近7日</option>
            <option value={30}>直近30日</option>
          </select>
          {rangeLabel && <p className="text-xs text-gray-500">{rangeLabel}</p>}
        </div>

        {loading && <div className="bg-white border border-gray-200 p-6 text-sm">読み込み中...</div>}

        {error && !loading && (
          <div className="bg-white border border-red-300 p-6 text-sm text-red-700">
            ログ取得に失敗しました: {error}
          </div>
        )}

        {!loading && !error && summary && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-gray-200 p-4">
                <p className="text-xs text-gray-500">総件数</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
              </div>
              <div className="bg-white border border-gray-200 p-4">
                <p className="text-xs text-gray-500">成功</p>
                <p className="text-2xl font-bold text-gray-900">{summary.successCount}</p>
              </div>
              <div className="bg-white border border-gray-200 p-4">
                <p className="text-xs text-gray-500">失敗</p>
                <p className="text-2xl font-bold text-gray-900">{summary.failedCount}</p>
              </div>
              <div className="bg-white border border-gray-200 p-4">
                <p className="text-xs text-gray-500">ユーザー数</p>
                <p className="text-2xl font-bold text-gray-900">{summary.uniqueActors}</p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-4">
              <h2 className="text-sm font-semibold mb-3">ログ一覧</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-gray-500">
                    <tr>
                      <th className="py-2 pr-4">日時</th>
                      <th className="py-2 pr-4">結果</th>
                      <th className="py-2 pr-4">ユーザー名</th>
                      <th className="py-2 pr-4">メール</th>
                      <th className="py-2 pr-4">UID</th>
                      <th className="py-2 pr-4">エラーコード</th>
                      <th className="py-2 pr-4">経路</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.items.map((row) => (
                      <tr key={row.id} className="border-t border-gray-100">
                        <td className="py-2 pr-4">{row.createdAt ? new Date(row.createdAt).toLocaleString("ja-JP") : "-"}</td>
                        <td className="py-2 pr-4">{row.outcome === "success" ? "成功" : "失敗"}</td>
                        <td className="py-2 pr-4">{row.actorName || "-"}</td>
                        <td className="py-2 pr-4">{row.actorEmail || "-"}</td>
                        <td className="py-2 pr-4 text-xs text-gray-500">{row.actorUid || "-"}</td>
                        <td className="py-2 pr-4 text-xs text-gray-600">{row.errorCode || "-"}</td>
                        <td className="py-2 pr-4 text-xs text-gray-600">{row.source || row.currentPath || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </SNSLayout>
  );
}

