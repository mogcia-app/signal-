/**
 * その他KPI入力セクションコンポーネント
 */

import React from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { authFetch } from "@/utils/authFetch";
import toast from "react-hot-toast";
import { useHomeStore } from "@/stores/home-store";

export function OtherKPISection() {
  const { user } = useAuth();
  const dashboardData = useHomeStore((state) => state.dashboardData);
  const otherFollowerCount = useHomeStore((state) => state.otherFollowerCount);
  const otherProfileVisits = useHomeStore((state) => state.otherProfileVisits);
  const otherExternalLinkTaps = useHomeStore((state) => state.otherExternalLinkTaps);
  const isSavingOtherKPI = useHomeStore((state) => state.isSavingOtherKPI);
  const setOtherFollowerCount = useHomeStore((state) => state.setOtherFollowerCount);
  const setOtherProfileVisits = useHomeStore((state) => state.setOtherProfileVisits);
  const setOtherExternalLinkTaps = useHomeStore((state) => state.setOtherExternalLinkTaps);
  const setIsSavingOtherKPI = useHomeStore((state) => state.setIsSavingOtherKPI);
  const fetchDashboard = useHomeStore((state) => state.fetchDashboard);

  const handleSave = async () => {
    if (!user?.uid) {
      toast.error("ログインが必要です");
      return;
    }

    setIsSavingOtherKPI(true);
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const response = await authFetch("/api/follower-counts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          followers: Number(otherFollowerCount) || 0,
          month,
          snsType: "instagram",
          source: "manual",
          profileVisits: Number(otherProfileVisits) || 0,
          externalLinkTaps: Number(otherExternalLinkTaps) || 0,
        }),
      });

      if (response.ok) {
        toast.success("保存しました");
        if (fetchDashboard) {
          fetchDashboard();
        }
      } else {
        const errorData = await response.json() as { error?: string };
        toast.error(errorData.error || "保存に失敗しました");
      }
    } catch (error) {
      console.error("その他KPI保存エラー:", error);
      toast.error("保存に失敗しました");
    } finally {
      setIsSavingOtherKPI(false);
    }
  };

  if (!dashboardData?.currentPlan) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
          <span>📝</span>
          投稿に紐づかない数値入力
        </h2>
        <p className="text-sm text-gray-500 text-center py-4">計画が作成されていません</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
        <span>📝</span>
        投稿に紐づかない数値入力
      </h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            その他フォロワー数
          </label>
          <input
            type="number"
            value={otherFollowerCount}
            onChange={(e) =>
              setOtherFollowerCount(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="0"
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF8A15] focus:border-[#FF8A15]"
          />
          <p className="text-xs text-gray-500 mt-1">投稿に紐づかないフォロワー増加数を入力</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            その他のプロフィール閲覧数
          </label>
          <input
            type="number"
            value={otherProfileVisits}
            onChange={(e) =>
              setOtherProfileVisits(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="0"
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF8A15] focus:border-[#FF8A15]"
          />
          <p className="text-xs text-gray-500 mt-1">投稿に紐づかないプロフィール閲覧数を入力</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            その他の外部リンクタップ数
          </label>
          <input
            type="number"
            value={otherExternalLinkTaps}
            onChange={(e) =>
              setOtherExternalLinkTaps(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="0"
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF8A15] focus:border-[#FF8A15]"
          />
          <p className="text-xs text-gray-500 mt-1">投稿に紐づかない外部リンクタップ数を入力</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSavingOtherKPI}
          className="w-full py-2 px-4 bg-[#FF8A15] text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSavingOtherKPI ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              保存中...
            </>
          ) : (
            "保存"
          )}
        </button>
      </div>
    </div>
  );
}

