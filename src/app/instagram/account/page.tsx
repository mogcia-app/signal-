"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import SNSLayout from "@/components/sns-layout";
import { authFetch } from "@/utils/authFetch";

type AccountResponse = {
  success: boolean;
  data?: {
    account: {
      id: string;
      clientId: string;
      instagramUserId: string;
      pageAccessToken: string;
      tokenExpireAt: string | null;
    } | null;
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

export default function InstagramAccountPage() {
  const searchParams = useSearchParams();
  const [clientId, setClientId] = useState("");
  const [instagramUserId, setInstagramUserId] = useState("");
  const [pageAccessToken, setPageAccessToken] = useState("");
  const [tokenExpireAt, setTokenExpireAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const firestorePreview = useMemo(() => {
    return JSON.stringify(
      {
        client_id: clientId || "あなたのUID",
        instagram_user_id: instagramUserId || "1784...",
        page_access_token: pageAccessToken || "EAAG...",
        token_expire_at: tokenExpireAt ? new Date(tokenExpireAt).toISOString() : null,
      },
      null,
      2,
    );
  }, [clientId, instagramUserId, pageAccessToken, tokenExpireAt]);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const oauthError = searchParams.get("error");

    if (connected === "1") {
      setMessage("Meta 認可が完了し、Instagramアカウント設定を保存しました。");
      setError(null);
    } else if (oauthError) {
      setError(oauthError);
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await authFetch("/api/instagram/account");
        const result = (await response.json().catch(() => null)) as AccountResponse | null;
        if (!response.ok || !result?.success) {
          throw new Error(result?.error || `HTTP ${response.status}`);
        }
        if (cancelled) {
          return;
        }

        const account = result.data?.account || null;
        if (account) {
          setClientId(account.clientId);
          setInstagramUserId(account.instagramUserId);
          setPageAccessToken(account.pageAccessToken);
          setTokenExpireAt(toDatetimeLocalValue(account.tokenExpireAt));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "設定の取得に失敗しました");
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
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await authFetch("/api/instagram/account", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instagramUserId: instagramUserId.trim(),
          pageAccessToken: pageAccessToken.trim(),
          tokenExpireAt: tokenExpireAt ? new Date(tokenExpireAt).toISOString() : null,
        }),
      });
      const result = (await response.json().catch(() => null)) as AccountResponse | null;
      if (!response.ok || !result?.success || !result.data?.account) {
        throw new Error(result?.error || `HTTP ${response.status}`);
      }

      const account = result.data.account;
      setClientId(account.clientId);
      setInstagramUserId(account.instagramUserId);
      setPageAccessToken(account.pageAccessToken);
      setTokenExpireAt(toDatetimeLocalValue(account.tokenExpireAt));
      setMessage("Instagramアカウント設定を保存しました。");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "設定保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await authFetch("/api/instagram/account/login-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          redirectPath: "/instagram/account",
        }),
      });
      const result = (await response.json().catch(() => null)) as
        | { success?: boolean; data?: { loginUrl?: string }; error?: string }
        | null;

      if (!response.ok || !result?.success || !result.data?.loginUrl) {
        throw new Error(result?.error || `HTTP ${response.status}`);
      }

      window.location.href = result.data.loginUrl;
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Meta 認可の開始に失敗しました");
      setConnecting(false);
    }
  };

  return (
    <SNSLayout customTitle="Instagram連携設定" customDescription="自分の Instagram アカウント情報を登録">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-black">自分の連携情報を保存</h2>
              <p className="mt-1 text-sm text-gray-600">
                Meta の認可画面から Instagram アカウントを接続し、ログイン中ユーザーの `instagram_accounts` に保存します。
              </p>
            </div>

            <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <div className="text-sm font-medium text-orange-900">推奨フロー</div>
              <p className="mt-1 text-sm text-orange-800">
                `Facebook Login for Business` を使って Meta 認可画面へ進み、接続済みの Instagram Business アカウントを自動保存します。
              </p>
              <button
                type="button"
                onClick={() => void handleConnect()}
                disabled={connecting}
                className="mt-4 inline-flex rounded-xl bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                {connecting ? "Metaへ接続中..." : "Instagramアカウントを連携"}
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-gray-500">読み込み中...</p>
            ) : (
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-black">Client UID</label>
                  <input
                    value={clientId}
                    readOnly
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
                    placeholder="保存後に表示されます"
                  />
                </div>
                <div className="grid gap-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-black">Instagram User ID</label>
                    <input
                      value={instagramUserId}
                      onChange={(event) => setInstagramUserId(event.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                      placeholder="1784..."
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
                    <p className="mt-2 text-xs text-gray-500">開発用 fallback として手動調整したい場合のみ使ってください。</p>
                  </div>
                </div>
              </div>
            )}

            {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
            {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving || loading}
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-black disabled:opacity-50"
              >
                {saving ? "保存中..." : "手動で上書き保存"}
              </button>
              <Link
                href="/instagram/scheduler"
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-black"
              >
                予約投稿へ戻る
              </Link>
            </div>
          </form>

          <aside className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-black">保存される Firestore 形式</h2>
            <p className="mt-2 text-sm text-gray-600">
              `client_id` は自動で自分の UID になります。直接投入する必要はありません。
            </p>
            <pre className="mt-4 overflow-x-auto rounded-2xl bg-gray-950 p-4 text-xs leading-6 text-gray-100">
              {firestorePreview}
            </pre>
          </aside>
        </section>
      </div>
    </SNSLayout>
  );
}
