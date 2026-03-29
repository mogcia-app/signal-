"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import SNSLayout from "@/components/sns-layout";
import { authFetch } from "@/utils/authFetch";

type AdminAccount = {
  id: string;
  clientId: string;
  instagramUserId: string;
  pageAccessToken?: string;
  pageAccessTokenMasked?: string;
  tokenExpireAt: string | null;
};

type AccountsResponse = {
  success: boolean;
  data?: {
    account?: AdminAccount | null;
    accounts?: AdminAccount[];
  };
  error?: string;
};

type PublishResponse = {
  success: boolean;
  data?: {
    attempted: number;
    published: number;
    failed: number;
  };
  error?: string;
};

function toDatetimeLocalValue(value: string | null): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function AdminInstagramAccountsPage() {
  const [clientId, setClientId] = useState("");
  const [instagramUserId, setInstagramUserId] = useState("");
  const [pageAccessToken, setPageAccessToken] = useState("");
  const [tokenExpireAt, setTokenExpireAt] = useState("");
  const [list, setList] = useState<AdminAccount[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<PublishResponse["data"] | null>(null);

  const documentPreview = useMemo(() => {
    return JSON.stringify(
      {
        client_id: clientId || "Firebase Auth UID",
        instagram_user_id: instagramUserId || "1784...",
        page_access_token: pageAccessToken || "EAAG...",
        token_expire_at: tokenExpireAt ? new Date(tokenExpireAt).toISOString() : "2099-01-01T00:00:00.000Z",
      },
      null,
      2,
    );
  }, [clientId, instagramUserId, pageAccessToken, tokenExpireAt]);

  const loadList = async () => {
    setLoadingList(true);
    try {
      const response = await authFetch("/api/admin/instagram-accounts");
      const result = (await response.json().catch(() => null)) as AccountsResponse | null;
      if (!response.ok || !result?.success || !result.data?.accounts) {
        throw new Error(result?.error || `HTTP ${response.status}`);
      }
      setList(result.data.accounts);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "一覧取得に失敗しました");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    void loadList();
  }, []);

  const handleLookup = async () => {
    if (!clientId.trim()) {
      setError("client UID を入力してください。");
      return;
    }
    setLoadingAccount(true);
    setError(null);
    setMessage(null);
    try {
      const query = new URLSearchParams({ clientId: clientId.trim() });
      const response = await authFetch(`/api/admin/instagram-accounts?${query.toString()}`);
      const result = (await response.json().catch(() => null)) as AccountsResponse | null;
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || `HTTP ${response.status}`);
      }

      const account = result.data?.account || null;
      if (!account) {
        setInstagramUserId("");
        setPageAccessToken("");
        setTokenExpireAt("");
        setMessage("既存設定は見つかりませんでした。新規作成できます。");
        return;
      }

      setClientId(account.clientId);
      setInstagramUserId(account.instagramUserId);
      setPageAccessToken(account.pageAccessToken || "");
      setTokenExpireAt(toDatetimeLocalValue(account.tokenExpireAt));
      setMessage("既存設定を読み込みました。");
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "設定取得に失敗しました");
    } finally {
      setLoadingAccount(false);
    }
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await authFetch("/api/admin/instagram-accounts", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: clientId.trim(),
          instagramUserId: instagramUserId.trim(),
          pageAccessToken: pageAccessToken.trim(),
          tokenExpireAt: tokenExpireAt ? new Date(tokenExpireAt).toISOString() : null,
        }),
      });
      const result = (await response.json().catch(() => null)) as AccountsResponse | null;
      if (!response.ok || !result?.success || !result.data?.account) {
        throw new Error(result?.error || `HTTP ${response.status}`);
      }

      setMessage("Instagramアカウント設定を保存しました。");
      setTokenExpireAt(toDatetimeLocalValue(result.data.account.tokenExpireAt));
      await loadList();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "設定保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleManualPublish = async () => {
    setPublishing(true);
    setError(null);
    setMessage(null);
    setPublishResult(null);
    try {
      const response = await authFetch("/api/admin/instagram-scheduler/publish-due", {
        method: "POST",
      });
      const result = (await response.json().catch(() => null)) as PublishResponse | null;
      if (!response.ok || !result?.success || !result.data) {
        throw new Error(result?.error || `HTTP ${response.status}`);
      }
      setPublishResult(result.data);
      setMessage("手動 publish を実行しました。");
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "手動 publish に失敗しました");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <SNSLayout customTitle="Instagram連携管理" customDescription="instagram_accounts の編集と予約投稿 publish 実行">
      <div className="space-y-6">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <form onSubmit={handleSave} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-black">instagram_accounts 編集</h2>
                <p className="mt-1 text-sm text-gray-600">
                  `client_id` は Firebase Auth の UID をそのまま使います。1クライアント1アカウント前提です。
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleLookup()}
                disabled={loadingAccount}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
              >
                {loadingAccount ? "読込中..." : "UIDで読込"}
              </button>
            </div>

            <div className="grid gap-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-black">Client UID</label>
                <input
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Firebase Auth UID"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-black">Instagram User ID</label>
                <input
                  value={instagramUserId}
                  onChange={(event) => setInstagramUserId(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                  placeholder="1784..."
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-black">Page Access Token</label>
                <textarea
                  value={pageAccessToken}
                  onChange={(event) => setPageAccessToken(event.target.value)}
                  rows={6}
                  className="w-full rounded-2xl border border-gray-300 px-3 py-3 text-sm"
                  placeholder="EAAG..."
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-black">Token Expire At</label>
                <input
                  type="datetime-local"
                  value={tokenExpireAt}
                  onChange={(event) => setTokenExpireAt(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
            {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "保存中..." : "設定を保存"}
              </button>
              <button
                type="button"
                onClick={() => void handleManualPublish()}
                disabled={publishing}
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-black disabled:opacity-50"
              >
                {publishing ? "実行中..." : "手動で publish-due 実行"}
              </button>
            </div>
          </form>

          <aside className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-black">投入データの形</h2>
            <p className="mt-2 text-sm text-gray-600">
              Firestore Console から直接投入する場合も、この構造で保存すれば動きます。
            </p>
            <pre className="mt-4 overflow-x-auto rounded-2xl bg-gray-950 p-4 text-xs leading-6 text-gray-100">
              {documentPreview}
            </pre>

            <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
              <div className="font-medium">手動 publish 結果</div>
              {publishResult ? (
                <div className="mt-2 space-y-1 text-xs">
                  <div>attempted: {publishResult.attempted}</div>
                  <div>published: {publishResult.published}</div>
                  <div>failed: {publishResult.failed}</div>
                </div>
              ) : (
                <p className="mt-2 text-xs">まだ実行していません。</p>
              )}
            </div>
          </aside>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-black">既存アカウント一覧</h2>
              <p className="mt-1 text-sm text-gray-600">保存済みの `instagram_accounts` を一覧表示します。</p>
            </div>
            <button
              type="button"
              onClick={() => void loadList()}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-black"
            >
              再読み込み
            </button>
          </div>

          {loadingList ? (
            <p className="mt-6 text-sm text-gray-500">読み込み中...</p>
          ) : list.length === 0 ? (
            <p className="mt-6 text-sm text-gray-500">まだ登録はありません。</p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-gray-500">
                  <tr>
                    <th className="py-2 pr-4">Client UID</th>
                    <th className="py-2 pr-4">Instagram User ID</th>
                    <th className="py-2 pr-4">Token</th>
                    <th className="py-2 pr-4">Expire At</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((item) => (
                    <tr key={item.id} className="border-t border-gray-100">
                      <td className="py-3 pr-4 text-xs text-gray-800">{item.clientId}</td>
                      <td className="py-3 pr-4">{item.instagramUserId}</td>
                      <td className="py-3 pr-4 text-xs text-gray-500">{item.pageAccessTokenMasked || "-"}</td>
                      <td className="py-3 pr-4">{formatDateTime(item.tokenExpireAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </SNSLayout>
  );
}
