"use client";

import { useEffect, useState } from "react";
import { getToolMaintenanceStatus } from "@/lib/tool-maintenance";
import { useRouter } from "next/navigation";

export default function MaintenancePage() {
  const router = useRouter();
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const status = await getToolMaintenanceStatus();

        if (!status.enabled) {
          // メンテナンスが終了したらホームにリダイレクト
          router.push("/");
          return;
        }

        setMaintenanceMessage(
          status.message || "システムメンテナンス中です。しばらくお待ちください。"
        );
        setScheduledEnd(status.scheduledEnd || null);
      } catch (error) {
        console.error("Error checking maintenance:", error);
      } finally {
        setLoading(false);
      }
    };

    checkMaintenance();

    // 定期的にメンテナンス状態をチェック（30秒ごと）
    const interval = setInterval(checkMaintenance, 30000);

    return () => clearInterval(interval);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ff8a15]/10">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-2 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-2 border-[#FF8A15] border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-sm font-medium text-gray-700">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#ff8a15]/10 p-4 relative overflow-hidden">
      {/* グリッドパターン */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #000 1px, transparent 1px),
            linear-gradient(to bottom, #000 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      ></div>

      <div className="relative max-w-md w-full bg-white border-2 border-gray-900 rounded-lg shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">🔧</div>
        <h1 className="text-2xl font-bold mb-4">メンテナンス中</h1>
        <p className="text-gray-600 mb-6 whitespace-pre-wrap">{maintenanceMessage}</p>
        {scheduledEnd && (
          <div className="text-sm text-gray-500 mb-4">
            予定終了時刻: {new Date(scheduledEnd).toLocaleString("ja-JP")}
          </div>
        )}
        <div className="text-sm text-gray-500">
          メンテナンスが完了次第、サービスを再開いたします。
        </div>
      </div>
    </div>
  );
}

