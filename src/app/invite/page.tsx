"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type InviteState = "checking" | "success" | "expired" | "invalid";

function InviteFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-[960px] items-center justify-center">
        <div className="w-full max-w-[520px] border border-slate-200 bg-white p-8 text-center shadow-[10px_10px_0_0_rgba(241,245,249,1)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Invite Link
          </p>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function InvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<InviteState>("checking");

  const token = useMemo(() => {
    const raw = searchParams.get("token");
    return raw?.trim() || "";
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    const consumeInvite = async () => {
      if (!token) {
        setState("invalid");
        return;
      }

      try {
        const response = await fetch("/api/invite/consume", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const result = (await response.json().catch(() => null)) as { success?: boolean; code?: string } | null;
        if (cancelled) {
          return;
        }

        if (response.ok && result?.success) {
          setState("success");
          window.setTimeout(() => {
            router.replace("/login");
          }, 1200);
          return;
        }

        if (result?.code === "INVITE_EXPIRED") {
          setState("expired");
          return;
        }

        setState("invalid");
      } catch {
        if (!cancelled) {
          setState("invalid");
        }
      }
    };

    void consumeInvite();
    return () => {
      cancelled = true;
    };
  }, [router, token]);

  if (state === "checking") {
    return (
      <InviteFrame>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">招待リンクを確認しています</h1>
        <p className="mt-4 text-sm leading-7 text-slate-500">
          初回ログインの準備を進めています。数秒そのままお待ちください。
        </p>
      </InviteFrame>
    );
  }

  if (state === "expired") {
    return (
      <InviteFrame>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">リンクの有効期限が切れています</h1>
        <p className="mt-4 text-sm leading-7 text-slate-500">
          管理者に再発行を依頼して、新しい招待リンクからアクセスしてください。
        </p>
        <button
          type="button"
          onClick={() => router.replace("/login")}
          className="mt-8 inline-flex h-12 items-center justify-center bg-[#ff8a15] px-6 text-sm font-bold text-white transition hover:bg-[#e97709]"
        >
          ログイン画面へ
        </button>
      </InviteFrame>
    );
  }

  if (state === "success") {
    return (
      <InviteFrame>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">招待リンクを確認しました</h1>
        <p className="mt-4 text-sm leading-7 text-slate-500">
          ログイン画面へ移動します。移動しない場合は下のボタンから進んでください。
        </p>
        <button
          type="button"
          onClick={() => router.replace("/login")}
          className="mt-8 inline-flex h-12 items-center justify-center bg-[#ff8a15] px-6 text-sm font-bold text-white transition hover:bg-[#e97709]"
        >
          ログインへ進む
        </button>
      </InviteFrame>
    );
  }

  return (
    <InviteFrame>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">無効な招待リンクです</h1>
      <p className="mt-4 text-sm leading-7 text-slate-500">
        URL を確認するか、管理者から再度送られた招待リンクを開いてください。
      </p>
      <button
        type="button"
        onClick={() => router.replace("/login")}
        className="mt-8 inline-flex h-12 items-center justify-center bg-[#ff8a15] px-6 text-sm font-bold text-white transition hover:bg-[#e97709]"
      >
        ログイン画面へ
      </button>
    </InviteFrame>
  );
}
