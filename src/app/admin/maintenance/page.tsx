"use client";

import { useEffect, useMemo, useState } from "react";
import SNSLayout from "@/components/sns-layout";
import { authFetch } from "@/utils/authFetch";

type SessionPolicy = "allow_existing" | "force_logout";

type MaintenanceData = {
  enabled: boolean;
  message: string;
  allowAdminBypass: boolean;
  allowedRoles: string[];
  loginBlocked: boolean;
  sessionPolicy: SessionPolicy;
  allowPasswordReset: boolean;
  featureFlags: Record<string, boolean>;
  version: number;
  updatedBy: string;
  updatedByEmail: string;
  updatedAt: string | null;
};

type AuditLog = {
  id: string;
  event: string;
  actorUid: string;
  actorEmail: string | null;
  reason: string;
  target: string;
  changedKeys: string[];
  requestId: string;
  createdAt: string | null;
};

const FEATURE_KEYS = [
  "dashboard.write",
  "plan.write",
  "post.write",
  "analytics.write",
  "ai.generate",
] as const;

const EVENT_LABELS: Record<string, string> = {
  "admin.maintenance.update": "設定更新",
  "admin.login_control.update": "ログイン制御更新",
  "admin.feature_flags.update": "機能フラグ更新",
};

export default function AdminMaintenancePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [data, setData] = useState<MaintenanceData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const canSave = useMemo(() => {
    return Boolean(data) && reason.trim().length >= 10 && !saving;
  }, [data, reason, saving]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [maintenanceRes, logsRes] = await Promise.all([
        authFetch("/api/admin/maintenance"),
        authFetch("/api/admin/maintenance/audit-logs?limit=100"),
      ]);

      const maintenanceJson = (await maintenanceRes.json().catch(() => null)) as
        | { success?: boolean; data?: MaintenanceData; error?: string }
        | null;
      if (!maintenanceRes.ok || !maintenanceJson?.success || !maintenanceJson.data) {
        throw new Error(maintenanceJson?.error || `HTTP ${maintenanceRes.status}`);
      }
      setData(maintenanceJson.data);

      const logsJson = (await logsRes.json().catch(() => null)) as
        | { success?: boolean; data?: { items?: AuditLog[] }; error?: string }
        | null;
      if (logsRes.ok && logsJson?.success && Array.isArray(logsJson.data?.items)) {
        setAuditLogs(logsJson.data.items);
      } else {
        setAuditLogs([]);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateField = <K extends keyof MaintenanceData>(key: K, value: MaintenanceData[K]) => {
    if (!data) {
      return;
    }
    setData({
      ...data,
      [key]: value,
    });
  };

  const updateFeatureFlag = (key: string, value: boolean) => {
    if (!data) {
      return;
    }
    setData({
      ...data,
      featureFlags: {
        ...data.featureFlags,
        [key]: value,
      },
    });
  };

  const handleSave = async () => {
    if (!data || !canSave) {
      return;
    }

    if (data.enabled && !data.message.trim()) {
      setError("全体メンテ有効時はメッセージを入力してください");
      return;
    }
    if (!data.allowedRoles.length) {
      setError("allowedRoles は1件以上必要です");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await authFetch("/api/admin/maintenance", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: reason.trim(),
          expectedVersion: data.version,
          patch: {
            enabled: data.enabled,
            message: data.message,
            allowAdminBypass: data.allowAdminBypass,
            allowedRoles: data.allowedRoles,
            loginBlocked: data.loginBlocked,
            sessionPolicy: data.sessionPolicy,
            allowPasswordReset: data.allowPasswordReset,
            featureFlags: data.featureFlags,
          },
        }),
      });

      const result = (await response.json().catch(() => null)) as
        | { success?: boolean; data?: MaintenanceData; error?: string }
        | null;

      if (!response.ok || !result?.success || !result.data) {
        throw new Error(result?.error || `HTTP ${response.status}`);
      }

      setData(result.data);
      setReason("");
      setSuccess("保存しました");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SNSLayout customTitle="メンテナンス管理" customDescription="全体メンテ/ログイン制御/機能フラグ">
      <div className="space-y-4">
        {loading && <div className="bg-white border border-gray-200 p-6 text-sm">読み込み中...</div>}

        {error && (
          <div className="bg-white border border-red-300 p-4 text-sm text-red-700">
            エラー: {error}
          </div>
        )}

        {success && (
          <div className="bg-white border border-green-300 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {!loading && data && (
          <>
            <div className="bg-white border border-gray-200 p-4 space-y-2">
              <h2 className="text-sm font-semibold">現在状態</h2>
              <p className="text-sm text-gray-700">
                全体メンテ: <span className="font-semibold">{data.enabled ? "ON" : "OFF"}</span> / ログイン制御:{" "}
                <span className="font-semibold">{data.loginBlocked ? "ON" : "OFF"}</span>
              </p>
              <p className="text-xs text-gray-500">
                version: {data.version} / 更新者: {data.updatedByEmail || data.updatedBy || "-"} / 更新時刻:{" "}
                {data.updatedAt ? new Date(data.updatedAt).toLocaleString("ja-JP") : "-"}
              </p>
            </div>

            <div className="bg-white border border-gray-200 p-4 space-y-3">
              <h2 className="text-sm font-semibold">全体メンテナンス</h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={data.enabled}
                  onChange={(event) => updateField("enabled", event.target.checked)}
                />
                有効化
              </label>
              <textarea
                value={data.message}
                onChange={(event) => updateField("message", event.target.value)}
                className="w-full border border-gray-300 px-3 py-2 text-sm"
                rows={3}
                placeholder="メンテナンス中メッセージ"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={data.allowAdminBypass}
                  onChange={(event) => updateField("allowAdminBypass", event.target.checked)}
                />
                管理者バイパス許可
              </label>
              <input
                value={data.allowedRoles.join(",")}
                onChange={(event) =>
                  updateField(
                    "allowedRoles",
                    event.target.value
                      .split(",")
                      .map((item) => item.trim().toLowerCase())
                      .filter(Boolean),
                  )
                }
                className="w-full border border-gray-300 px-3 py-2 text-sm"
                placeholder="allowed roles (comma separated)"
              />
            </div>

            <div className="bg-white border border-gray-200 p-4 space-y-3">
              <h2 className="text-sm font-semibold">ログイン制御</h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={data.loginBlocked}
                  onChange={(event) => updateField("loginBlocked", event.target.checked)}
                />
                新規ログインを停止
              </label>
              <label className="text-sm text-gray-700" htmlFor="session-policy">
                既存セッション
              </label>
              <select
                id="session-policy"
                className="border border-gray-300 px-3 py-2 text-sm bg-white"
                value={data.sessionPolicy}
                onChange={(event) => updateField("sessionPolicy", event.target.value as SessionPolicy)}
              >
                <option value="allow_existing">allow_existing</option>
                <option value="force_logout">force_logout</option>
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={data.allowPasswordReset}
                  onChange={(event) => updateField("allowPasswordReset", event.target.checked)}
                />
                パスワードリセット許可
              </label>
            </div>

            <div className="bg-white border border-gray-200 p-4 space-y-3">
              <h2 className="text-sm font-semibold">機能別フラグ</h2>
              {FEATURE_KEYS.map((key) => (
                <label key={key} className="flex items-center justify-between text-sm border-b border-gray-100 py-2">
                  <span>{key}</span>
                  <input
                    type="checkbox"
                    checked={data.featureFlags[key] !== false}
                    onChange={(event) => updateFeatureFlag(key, event.target.checked)}
                  />
                </label>
              ))}
            </div>

            <div className="bg-white border border-gray-200 p-4 space-y-3">
              <h2 className="text-sm font-semibold">変更理由</h2>
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="w-full border border-gray-300 px-3 py-2 text-sm"
                placeholder="変更理由（10文字以上）"
              />
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="px-4 py-2 bg-black text-white text-sm disabled:bg-gray-400"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>

            <div className="bg-white border border-gray-200 p-4">
              <h2 className="text-sm font-semibold mb-3">監査ログ（直近100件）</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-gray-500">
                    <tr>
                      <th className="py-2 pr-4">時刻</th>
                      <th className="py-2 pr-4">イベント</th>
                      <th className="py-2 pr-4">実行者</th>
                      <th className="py-2 pr-4">理由</th>
                      <th className="py-2 pr-4">差分キー</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-t border-gray-100">
                        <td className="py-2 pr-4">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString("ja-JP") : "-"}
                        </td>
                        <td className="py-2 pr-4">{EVENT_LABELS[log.event] || log.event}</td>
                        <td className="py-2 pr-4 text-xs">{log.actorEmail || log.actorUid || "-"}</td>
                        <td className="py-2 pr-4">{log.reason || "-"}</td>
                        <td className="py-2 pr-4 text-xs text-gray-600">
                          {Array.isArray(log.changedKeys) ? log.changedKeys.join(", ") : "-"}
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

