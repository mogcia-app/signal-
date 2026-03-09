"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type InviteState = "checking" | "success" | "expired" | "invalid";

function InviteFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#ff8a15]/10 p-4 relative overflow-hidden">
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
      <div className="relative w-full max-w-md rounded-lg bg-white border-2 border-gray-900 p-8 shadow-[8px_8px_0_0_#000] text-center">
        {children}
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
          }, 900);
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
        <div>
          <p className="text-sm text-gray-500 mb-2">判定中</p>
          <p className="text-lg font-semibold text-gray-900">招待リンクを確認しています...</p>
        </div>
      </InviteFrame>
    );
  }

  if (state === "expired") {
    return (
      <InviteFrame>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">リンク期限切れ</h1>
          <p className="text-gray-600 mb-6">この招待リンクは有効期限を過ぎています。</p>
          <a
            href="mailto:marina.ishida@signalapp.jp?subject=%E6%8B%9B%E5%BE%85%E3%83%AA%E3%83%B3%E3%82%AF%E5%86%8D%E7%99%BA%E8%A1%8C%E4%BE%9D%E9%A0%BC"
            className="inline-flex items-center justify-center rounded-lg bg-[#ff8a15] border-2 border-gray-900 px-4 py-2 text-sm font-bold text-white"
          >
            再発行を依頼する
          </a>
      </InviteFrame>
    );
  }

  if (state === "success") {
    return (
      <InviteFrame>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">招待リンクを確認しました</h1>
          <p className="text-gray-600 mb-6">通常ログインに進んでください。</p>
          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="inline-flex items-center justify-center rounded-lg bg-[#ff8a15] border-2 border-gray-900 px-4 py-2 text-sm font-bold text-white"
          >
            ログインへ進む
          </button>
      </InviteFrame>
    );
  }

  return (
    <InviteFrame>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">無効なリンクです</h1>
        <p className="text-gray-600 mb-6">URLをご確認のうえ、再度お試しください。</p>
        <button
          type="button"
          onClick={() => router.replace("/login")}
          className="inline-flex items-center justify-center rounded-lg bg-[#ff8a15] border-2 border-gray-900 px-4 py-2 text-sm font-bold text-white"
        >
          ログイン画面へ
        </button>
    </InviteFrame>
  );
}
