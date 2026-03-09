"use client";

import { useEffect, useMemo, useState } from "react";
import SNSLayout from "@/components/sns-layout";
import { authFetch } from "@/utils/authFetch";

type ByButton = {
  buttonId: string;
  label: string;
  count: number;
  uniqueActors: number;
};

type ByActor = {
  actorUid: string;
  actorEmail: string | null;
  count: number;
  buttons: Array<{ buttonId: string; count: number }>;
};

type SidebarClickSummaryResponse = {
  success: boolean;
  data?: {
    range: { from: string; to: string };
    eventType: "sidebar.click" | "page.button.click";
    totalClicks: number;
    uniqueActors: number;
    byButton: ByButton[];
    byActor: ByActor[];
  };
  error?: string;
};

export default function AdminUiEventsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [summary, setSummary] = useState<SidebarClickSummaryResponse["data"] | null>(null);
  const [eventType, setEventType] = useState<"sidebar.click" | "page.button.click">("page.button.click");

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
          eventType,
        });
        const response = await authFetch(`/api/admin/ui-events/sidebar-clicks?${query.toString()}`);
        const result = (await response.json().catch(() => null)) as SidebarClickSummaryResponse | null;

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
  }, [days, eventType]);

  return (
    <SNSLayout customTitle="UI操作ログ" customDescription="サイドバークリック集計（管理者向け）">
      <div className="space-y-4">
        <div className="bg-white border border-gray-200 p-4 flex flex-wrap items-center gap-3">
          <label htmlFor="event-type" className="text-sm text-gray-700">
            イベント種別
          </label>
          <select
            id="event-type"
            value={eventType}
            onChange={(event) => setEventType(event.target.value as "sidebar.click" | "page.button.click")}
            className="border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            <option value="page.button.click">ページ内ボタン</option>
            <option value="sidebar.click">サイドバー遷移</option>
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white border border-gray-200 p-4">
                <p className="text-xs text-gray-500">総クリック数</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalClicks}</p>
              </div>
              <div className="bg-white border border-gray-200 p-4">
                <p className="text-xs text-gray-500">ユーザー数</p>
                <p className="text-2xl font-bold text-gray-900">{summary.uniqueActors}</p>
              </div>
              <div className="bg-white border border-gray-200 p-4">
                <p className="text-xs text-gray-500">ボタン種別</p>
                <p className="text-2xl font-bold text-gray-900">{summary.byButton.length}</p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-4">
              <h2 className="text-sm font-semibold mb-3">ボタン別クリック数</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-gray-500">
                    <tr>
                      <th className="py-2 pr-4">ボタン</th>
                      <th className="py-2 pr-4">ID</th>
                      <th className="py-2 pr-4">クリック数</th>
                      <th className="py-2 pr-4">押した人数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byButton.map((row) => (
                      <tr key={row.buttonId} className="border-t border-gray-100">
                        <td className="py-2 pr-4">{row.label}</td>
                        <td className="py-2 pr-4 text-xs text-gray-500">{row.buttonId}</td>
                        <td className="py-2 pr-4">{row.count}</td>
                        <td className="py-2 pr-4">{row.uniqueActors}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-4">
              <h2 className="text-sm font-semibold mb-3">ユーザー別クリック数</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-gray-500">
                    <tr>
                      <th className="py-2 pr-4">ユーザー</th>
                      <th className="py-2 pr-4">UID</th>
                      <th className="py-2 pr-4">クリック数</th>
                      <th className="py-2 pr-4">内訳</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byActor.map((row) => (
                      <tr key={row.actorUid} className="border-t border-gray-100">
                        <td className="py-2 pr-4">{row.actorEmail || "-"}</td>
                        <td className="py-2 pr-4 text-xs text-gray-500">{row.actorUid}</td>
                        <td className="py-2 pr-4">{row.count}</td>
                        <td className="py-2 pr-4 text-xs text-gray-600">
                          {row.buttons.map((button) => `${button.buttonId}:${button.count}`).join(", ")}
                        </td>
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
