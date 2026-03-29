"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SNSLayout from "@/components/sns-layout";
import { authFetch } from "@/utils/authFetch";

type ScheduledPostItem = {
  id: string;
  imageUrl: string;
  caption: string;
  creationId: string;
  scheduledTime: string;
  status: "scheduled" | "publishing" | "published" | "failed";
  publishedAt: string | null;
  lastError: string | null;
};

type SchedulerResponse = {
  success: boolean;
  data?: {
    accountConnected: boolean;
    tokenExpiresAt: string | null;
    posts: ScheduledPostItem[];
  };
  error?: string;
};

type CreateResponse = {
  success: boolean;
  data?: {
    id: string;
    imageUrl: string;
    caption: string;
    creationId: string;
    scheduledTime: string;
    status: ScheduledPostItem["status"];
  };
  error?: string;
};

type PublishNowResponse = {
  success: boolean;
  data?: {
    attempted: number;
    published: number;
    failed: number;
  };
  error?: string;
};

const MAX_CAPTION_LENGTH = 2200;

function toDatetimeLocalValue(date: Date): string {
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

function statusLabel(status: ScheduledPostItem["status"]): string {
  if (status === "scheduled") {return "予約済み";}
  if (status === "publishing") {return "公開中";}
  if (status === "published") {return "公開完了";}
  return "失敗";
}

export default function InstagramSchedulerPage() {
  const minScheduleAt = useMemo(() => toDatetimeLocalValue(new Date(Date.now() + 10 * 60 * 1000)), []);
  const [imageData, setImageData] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [scheduledAt, setScheduledAt] = useState(minScheduleAt);
  const [submitting, setSubmitting] = useState(false);
  const [publishingNow, setPublishingNow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [accountConnected, setAccountConnected] = useState(false);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(null);
  const [posts, setPosts] = useState<ScheduledPostItem[]>([]);
  const [publishNowResult, setPublishNowResult] = useState<PublishNowResponse["data"] | null>(null);

  const remainingCharacters = MAX_CAPTION_LENGTH - caption.length;

  const fetchScheduledPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch("/api/instagram/scheduler");
      const json = (await response.json()) as SchedulerResponse;
      if (!response.ok || !json.success || !json.data) {
        setError(json.error || "予約投稿データの取得に失敗しました。");
        return;
      }

      setAccountConnected(json.data.accountConnected);
      setTokenExpiresAt(json.data.tokenExpiresAt);
      setPosts(json.data.posts);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "予約投稿データの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchScheduledPosts();
  }, []);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setImageData("");
      setPreviewUrl("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください。");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setImageData(result);
      setPreviewUrl(result);
      setError(null);
    };
    reader.onerror = () => {
      setError("画像の読み込みに失敗しました。");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await authFetch("/api/instagram/scheduler", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageData,
          caption,
          scheduledAt: new Date(scheduledAt).toISOString(),
        }),
      });

      const json = (await response.json()) as CreateResponse;
      if (!response.ok || !json.success || !json.data) {
        setError(json.error || "予約投稿の作成に失敗しました。");
        return;
      }

      setSuccessMessage("予約投稿を作成しました。");
      setImageData("");
      setPreviewUrl("");
      setCaption("");
      setScheduledAt(toDatetimeLocalValue(new Date(Date.now() + 10 * 60 * 1000)));
      await fetchScheduledPosts();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "予約投稿の作成に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublishNow = async () => {
    setPublishingNow(true);
    setError(null);
    setSuccessMessage(null);
    setPublishNowResult(null);

    try {
      const response = await authFetch("/api/instagram/scheduler/publish-now", {
        method: "POST",
      });
      const json = (await response.json()) as PublishNowResponse;
      if (!response.ok || !json.success || !json.data) {
        setError(json.error || "手動 publish に失敗しました。");
        return;
      }

      setPublishNowResult(json.data);
      setSuccessMessage("手動 publish を実行しました。");
      await fetchScheduledPosts();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "手動 publish に失敗しました。");
    } finally {
      setPublishingNow(false);
    }
  };

  return (
    <SNSLayout customTitle="Instagram予約投稿" customDescription="画像アップロードからInstagram予約投稿までを実行">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-black">予約投稿を作成</h2>
                <p className="mt-1 text-sm text-gray-600">
                  画像をアップロードし、キャプションと日時を指定して Instagram に予約投稿します。
                </p>
              </div>
              <div className={`rounded-full px-3 py-1 text-xs font-medium ${accountConnected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {accountConnected ? "アカウント連携済み" : "アカウント未設定"}
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-black">画像アップロード</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                />
                {previewUrl ? (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="preview" className="h-72 w-full object-cover" />
                  </div>
                ) : (
                  <div className="mt-4 flex h-72 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
                    画像を選択するとここにプレビューを表示します
                  </div>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium text-black">キャプション</label>
                  <span className={`text-xs ${remainingCharacters < 0 ? "text-red-600" : "text-gray-500"}`}>
                    残り {remainingCharacters} 文字
                  </span>
                </div>
                <textarea
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  rows={8}
                  maxLength={MAX_CAPTION_LENGTH}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-orange-400"
                  placeholder="キャプションを入力"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black">投稿日時</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  min={minScheduleAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                  required
                />
                <p className="mt-2 text-xs text-gray-500">現在時刻の10分後以降を指定できます。</p>
              </div>
            </div>

            {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
            {successMessage ? <p className="mt-4 text-sm text-emerald-700">{successMessage}</p> : null}

            <div className="mt-6">
              <button
                type="submit"
                disabled={submitting || !imageData || !caption || !scheduledAt}
                className="inline-flex items-center justify-center rounded-xl bg-black px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "予約投稿を作成中..." : "予約投稿する"}
              </button>
            </div>
          </form>

          <aside className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-black">接続状態</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl bg-gray-50 p-4">
                <div className="text-gray-500">Instagramアカウント</div>
                <div className="mt-1 font-medium text-black">
                  {accountConnected ? "Meta 認可済み" : "Meta 認可でアカウント接続が必要です"}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="/instagram/account"
                    className="inline-flex rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-black"
                  >
                    Instagramアカウント連携を編集
                  </Link>
                  <button
                    type="button"
                    onClick={() => void fetchScheduledPosts()}
                    className="inline-flex rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-black"
                  >
                    接続状態を確認
                  </button>
                </div>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <div className="text-gray-500">トークン期限</div>
                <div className="mt-1 font-medium text-black">{formatDateTime(tokenExpiresAt)}</div>
              </div>
              <div className="rounded-xl bg-amber-50 p-4 text-amber-900">
                <div className="font-medium">cron 設定</div>
                <p className="mt-1 text-xs leading-5">
                  `/api/instagram/scheduler/publish-due` を `CRON_SECRET` 付きで定期実行してください。
                </p>
                <button
                  type="button"
                  onClick={() => void handlePublishNow()}
                  disabled={publishingNow}
                  className="mt-3 inline-flex rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-amber-900 disabled:opacity-50"
                >
                  {publishingNow ? "実行中..." : "今すぐ publish 実行"}
                </button>
                {publishNowResult ? (
                  <div className="mt-3 space-y-1 text-xs">
                    <div>attempted: {publishNowResult.attempted}</div>
                    <div>published: {publishNowResult.published}</div>
                    <div>failed: {publishNowResult.failed}</div>
                  </div>
                ) : null}
              </div>
            </div>
          </aside>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-black">予約一覧</h2>
              <p className="mt-1 text-sm text-gray-600">現在の予約投稿と公開ステータスを確認できます。</p>
            </div>
            <button
              type="button"
              onClick={() => void fetchScheduledPosts()}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-black"
            >
              再読み込み
            </button>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-gray-500">読み込み中...</p>
          ) : posts.length === 0 ? (
            <p className="mt-6 text-sm text-gray-500">まだ予約投稿はありません。</p>
          ) : (
            <div className="mt-6 space-y-4">
              {posts.map((post) => (
                <article key={post.id} className="grid gap-4 rounded-2xl border border-gray-200 p-4 md:grid-cols-[7rem_minmax(0,1fr)]">
                  <div className="overflow-hidden rounded-xl bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={post.imageUrl} alt={post.caption} className="h-28 w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                        post.status === "published"
                          ? "bg-emerald-50 text-emerald-700"
                          : post.status === "failed"
                            ? "bg-red-50 text-red-700"
                            : post.status === "publishing"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-amber-50 text-amber-700"
                      }`}>
                        {statusLabel(post.status)}
                      </span>
                      <span className="text-xs text-gray-500">Creation ID: {post.creationId}</span>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm text-black">{post.caption}</p>
                    <div className="mt-3 grid gap-2 text-xs text-gray-500 md:grid-cols-3">
                      <div>予約時刻: {formatDateTime(post.scheduledTime)}</div>
                      <div>公開時刻: {formatDateTime(post.publishedAt)}</div>
                      <div>エラー: {post.lastError || "-"}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </SNSLayout>
  );
}
